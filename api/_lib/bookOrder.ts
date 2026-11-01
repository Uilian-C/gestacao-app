import { query } from './db.js';
import { HttpError } from './http.js';

// O livro impresso em pré-venda (migração 038): a reserva do casal (o modelo, o
// que entra, a capa e a dedicatória) e quem da família quer presentear. Nada é
// cobrado; o preço é o de lançamento, recalculado aqui com a mesma tabela do
// app (src/lib/bookProduct.ts), para a reserva não depender do que o app mandou.

export type BookModel = 'livreto' | 'classico' | 'caixa';
const MODELS: Record<BookModel, { min: number; max: number; base: number; extra: number }> = {
  livreto: { min: 24, max: 48, base: 11900, extra: 0 },
  classico: { min: 24, max: 120, base: 22900, extra: 150 },
  caixa: { min: 24, max: 120, base: 34900, extra: 150 },
};
const BASE_PAGES = 60;

export function bookPrice(model: BookModel, pages: number) {
  const m = MODELS[model];
  const p = Math.min(m.max, Math.max(m.min, pages));
  return { pages: p, priceCents: m.base + Math.max(0, p - BASE_PAGES) * m.extra };
}

const MISSING = 'O livro impresso ainda não está ligado no servidor. Rode a migração db/migrations/038_livro_impresso.sql no Neon.';
const missing = (err: unknown) => {
  if ((err as { code?: string }).code === '42P01') throw new HttpError(503, MISSING);
  throw err;
};

export interface BookOrder {
  model: BookModel;
  period: string;
  include: Record<string, boolean>;
  coverTitle: string;
  coverTone: string | null;
  coverPhoto: string | null;
  dedication: string | null;
  pages: number;
  priceCents: number;
  at: string;
}

/** A reserva do espaço (se houver) e quem da família quer presentear; nulo antes da migração. */
export async function fetchBook(fid: string, userId: string): Promise<{ order: BookOrder | null; gifts: Array<{ name: string; mine: boolean }> } | null> {
  try {
    const [orders, gifts] = await Promise.all([
      query<BookOrder>(
        `SELECT model, period, include, cover_title AS "coverTitle", cover_tone AS "coverTone", cover_photo::text AS "coverPhoto", dedication, pages, price_cents AS "priceCents", updated_at::text AS at
         FROM book_orders WHERE family_id = $1 AND status = 'reservado'`,
        [fid],
      ),
      query<{ name: string; mine: boolean }>(
        `SELECT split_part(trim(COALESCE(u.name, '')), ' ', 1) AS name, g.user_id = $2 AS mine
         FROM book_gifts g JOIN "user" u ON u.id = g.user_id WHERE g.family_id = $1 ORDER BY g.created_at`,
        [fid, userId],
      ),
    ]);
    return { order: orders[0] ?? null, gifts };
  } catch {
    return null;
  }
}

export async function reserveBook(
  fid: string,
  userId: string,
  o: { model: BookModel; period: string; include: Record<string, boolean>; coverTitle: string; coverTone: string | null; coverPhoto: string | null; dedication: string | null; pages: number },
) {
  const { pages, priceCents } = bookPrice(o.model, o.pages);
  // A foto da capa precisa ser deste espaço.
  if (o.coverPhoto) {
    const [ok] = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM journal_files f JOIN journal_entries e ON e.id = f.entry_id WHERE f.id = $1 AND e.family_id = $2`, [o.coverPhoto, fid]);
    if (!ok?.n) throw new HttpError(400, 'Essa foto não é deste espaço.');
  }
  await query(
    `INSERT INTO book_orders (family_id, user_id, model, period, include, cover_title, cover_tone, cover_photo, dedication, pages, price_cents, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, 'reservado')
     ON CONFLICT (family_id) DO UPDATE SET user_id = $2, model = $3, period = $4, include = $5::jsonb, cover_title = $6, cover_tone = $7, cover_photo = $8,
       dedication = $9, pages = $10, price_cents = $11, status = 'reservado', updated_at = NOW()`,
    [fid, userId, o.model, o.period, JSON.stringify(o.include), o.coverTitle, o.coverTone, o.coverPhoto, o.dedication, pages, priceCents],
  ).catch(missing);
}

export async function cancelBook(fid: string) {
  await query(`UPDATE book_orders SET status = 'cancelado', updated_at = NOW() WHERE family_id = $1`, [fid]).catch(missing);
}

/** A família avisa que quer presentear o livro (ou desiste). Devolve se é novo. */
export async function giftBook(fid: string, userId: string, on: boolean): Promise<boolean> {
  if (!on) {
    await query('DELETE FROM book_gifts WHERE family_id = $1 AND user_id = $2', [fid, userId]).catch(missing);
    return false;
  }
  const rows = await query<{ user_id: string }>('INSERT INTO book_gifts (family_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id', [fid, userId]).catch(missing);
  return rows.length > 0;
}
