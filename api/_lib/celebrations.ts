import { query, transaction } from './db.js';
import { HttpError } from './http.js';

// Celebrações (migração 028): chá de bebê, chá de fraldas, chá revelação,
// ensaio de fotos... Cada uma nasce com um roteiro de tarefas pronto, com
// prazos contados a partir da data ("X dias antes"), que mudam sozinhos se a
// data mudar. Antes da migração, a lista vem nula e o app esconde a parte.

export type CelebrationKind = 'cha_bebe' | 'cha_fraldas' | 'cha_revelacao' | 'ensaio' | 'outra';
export type ItemKind = 'tarefa' | 'fornecedor' | 'convidado' | 'ideia';

export const CELEBRATIONS_MISSING = 'As celebrações ainda não estão ligadas no servidor. Rode a migração db/migrations/028_celebracoes.sql no Neon.';

const missing = (err: unknown) => {
  const code = (err as { code?: string }).code;
  if (code === '42P01' || code === '42703') throw new HttpError(503, CELEBRATIONS_MISSING);
  throw err;
};

/** O roteiro de cada tipo: o que fazer e quantos dias antes. */
const BASE: Array<[number, string]> = [
  [60, 'Definir a data, o local e o estilo'],
  [56, 'Escolher o tema e as cores'],
  [50, 'Fazer a lista de convidados'],
  [45, 'Pedir orçamentos (bolo, doces, decoração)'],
  [35, 'Fechar os fornecedores'],
  [30, 'Enviar os convites'],
  [21, 'Definir o cardápio e as lembrancinhas'],
  [14, 'Separar as brincadeiras'],
  [7, 'Confirmar a presença dos convidados'],
  [3, 'Confirmar os fornecedores e os horários'],
  [1, 'Separar a roupa e o que levar no dia'],
];

export const ROADMAP: Record<CelebrationKind, Array<[number, string]>> = {
  cha_bebe: BASE,
  cha_fraldas: [...BASE.slice(0, 5), [30, 'Enviar os convites, com o tamanho de fralda de cada um'], ...BASE.slice(6)],
  cha_revelacao: [
    [45, 'Combinar quem vai guardar o segredo (o resultado do exame)'],
    [40, 'Escolher como vai ser a revelação (bolo, balões, fumaça, caixa)'],
    [35, 'Fazer a lista de convidados'],
    [28, 'Encomendar o que revela (bolo, balões...)'],
    [21, 'Enviar os convites e abrir os palpites: menino ou menina?'],
    [7, 'Confirmar a presença dos convidados'],
    [2, 'Combinar quem filma e fotografa o momento'],
  ],
  ensaio: [
    [45, 'Escolher o fotógrafo e ver o portfólio'],
    [35, 'Definir o local e o horário (luz)'],
    [21, 'Escolher as roupas e as cores'],
    [14, 'Separar os acessórios (ultrassom, sapatinho, letras)'],
    [3, 'Confirmar com o fotógrafo'],
  ],
  outra: [
    [30, 'Definir a data e o local'],
    [21, 'Fazer a lista de convidados'],
    [7, 'Confirmar a presença'],
  ],
};

export interface CelebrationRow {
  id: string;
  kind: CelebrationKind;
  title: string;
  event_at: string | null;
  location: string | null;
  theme: string | null;
  colors: string[];
  budget: string | null;
  notes: string | null;
  created_at: string;
  items: Array<{
    id: string;
    kind: ItemKind;
    title: string;
    due_date: string | null;
    due_offset: number | null;
    assigned_to: 'mae' | 'pai' | 'casal' | null;
    done: boolean;
    contact: string | null;
    amount: string | null;
    status: string | null;
    people: number | null;
    notes: string | null;
    created_at: string;
  }>;
}

export async function fetchCelebrations(fid: string): Promise<CelebrationRow[] | null> {
  return query<CelebrationRow>(
    `SELECT c.id::text AS id, c.kind, c.title, c.event_at::text AS event_at, c.location, c.theme, c.colors, c.budget::text AS budget, c.notes, c.created_at::text AS created_at,
            COALESCE((SELECT json_agg(json_build_object(
                'id', i.id, 'kind', i.kind, 'title', i.title, 'due_date', i.due_date, 'due_offset', i.due_offset, 'assigned_to', i.assigned_to,
                'done', i.done, 'contact', i.contact, 'amount', i.amount::text, 'status', i.status, 'people', i.people, 'notes', i.notes, 'created_at', i.created_at
              ) ORDER BY i.created_at) FROM celebration_items i WHERE i.celebration_id = c.id), '[]') AS items
     FROM celebrations c WHERE c.family_id = $1 ORDER BY c.event_at NULLS LAST, c.created_at`,
    [fid],
  ).catch(() => null);
}

export interface CelebrationFields {
  title: string;
  eventAt?: string | null;
  location?: string | null;
  theme?: string | null;
  colors?: string[];
  budget?: number | null;
  notes?: string | null;
}

/** Nova celebração, já com o roteiro de tarefas do tipo. */
export async function createCelebration(fid: string, userId: string, kind: CelebrationKind, f: CelebrationFields) {
  const [count] = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM celebrations WHERE family_id = $1', [fid]).catch(missing);
  if (count.n >= 20) throw new HttpError(409, 'Já são muitas celebrações neste espaço.');
  return transaction(async client => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO celebrations (family_id, kind, title, event_at, location, theme, colors, budget, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) RETURNING id::text AS id`,
      [fid, kind, f.title, f.eventAt ?? null, f.location ?? null, f.theme ?? null, JSON.stringify(f.colors ?? []), f.budget ?? null, f.notes ?? null, userId],
    );
    for (const [offset, title] of ROADMAP[kind]) {
      await client.query(`INSERT INTO celebration_items (celebration_id, family_id, kind, title, due_offset, assigned_to, created_by) VALUES ($1, $2, 'tarefa', $3, $4, 'casal', $5)`, [rows[0].id, fid, title, offset, userId]);
    }
    return rows[0];
  }).catch(missing);
}

export async function updateCelebration(fid: string, id: string, f: CelebrationFields) {
  const rows = await query(
    `UPDATE celebrations SET title = $3, event_at = $4, location = $5, theme = $6, colors = $7::jsonb, budget = $8, notes = $9
     WHERE id = $1 AND family_id = $2 RETURNING id`,
    [id, fid, f.title, f.eventAt ?? null, f.location ?? null, f.theme ?? null, JSON.stringify(f.colors ?? []), f.budget ?? null, f.notes ?? null],
  ).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Celebração não encontrada.');
}

export async function deleteCelebration(fid: string, id: string) {
  const rows = await query('DELETE FROM celebrations WHERE id = $1 AND family_id = $2 RETURNING id', [id, fid]).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Celebração não encontrada.');
}

export interface ItemFields {
  title: string;
  dueDate?: string | null;
  dueOffset?: number | null;
  assignedTo?: 'mae' | 'pai' | 'casal' | null;
  done?: boolean;
  contact?: string | null;
  amount?: number | null;
  status?: string | null;
  people?: number | null;
  notes?: string | null;
}

const MAX_ITEMS = 300;

/** Cada tipo de ficha tem as suas situações: fornecedor (orçado, contratado, pago) e convidado (vai, talvez...). */
const STATUS_OF: Partial<Record<ItemKind, string[]>> = { fornecedor: ['orcado', 'contratado', 'pago'], convidado: ['convidado', 'vai', 'nao_vai', 'talvez'] };
const checkStatus = (kind: ItemKind, status: string | null | undefined) => {
  if (status != null && !STATUS_OF[kind]?.includes(status)) throw new HttpError(400, 'Situação inválida para esta ficha.');
};

export async function addCelebrationItem(fid: string, userId: string, celebrationId: string, kind: ItemKind, f: ItemFields) {
  const owner = await query('SELECT 1 FROM celebrations WHERE id = $1 AND family_id = $2', [celebrationId, fid]).catch(missing);
  if (owner.length === 0) throw new HttpError(404, 'Celebração não encontrada.');
  checkStatus(kind, f.status);
  const [count] = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM celebration_items WHERE celebration_id = $1', [celebrationId]);
  if (count.n >= MAX_ITEMS) throw new HttpError(409, 'Esta celebração já tem fichas demais.');
  await query(
    `INSERT INTO celebration_items (celebration_id, family_id, kind, title, due_date, due_offset, assigned_to, done, contact, amount, status, people, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [celebrationId, fid, kind, f.title, f.dueDate ?? null, f.dueOffset ?? null, f.assignedTo ?? null, f.done ?? false, f.contact ?? null, f.amount ?? null, f.status ?? null, f.people ?? null, f.notes ?? null, userId],
  );
}

export async function updateCelebrationItem(fid: string, id: string, f: ItemFields) {
  const [item] = await query<{ kind: ItemKind }>('SELECT kind FROM celebration_items WHERE id = $1 AND family_id = $2', [id, fid]).catch(missing);
  if (!item) throw new HttpError(404, 'Ficha não encontrada.');
  checkStatus(item.kind, f.status);
  const rows = await query(
    `UPDATE celebration_items SET title = $3, due_date = $4, due_offset = $5, assigned_to = $6, done = $7, contact = $8, amount = $9, status = $10, people = $11, notes = $12
     WHERE id = $1 AND family_id = $2 RETURNING id`,
    [id, fid, f.title, f.dueDate ?? null, f.dueOffset ?? null, f.assignedTo ?? null, f.done ?? false, f.contact ?? null, f.amount ?? null, f.status ?? null, f.people ?? null, f.notes ?? null],
  ).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Ficha não encontrada.');
}

export async function deleteCelebrationItem(fid: string, id: string) {
  const rows = await query('DELETE FROM celebration_items WHERE id = $1 AND family_id = $2 RETURNING id', [id, fid]).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Ficha não encontrada.');
}
