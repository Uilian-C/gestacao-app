import { daysBetween, parseLocalDate, parseTimestamp, toISODate } from './dates';

// Celebrações (migração 028): chá de bebê, chá de fraldas, chá revelação,
// ensaio de fotos. O evento e as fichas dele (tarefas, fornecedores,
// convidados e ideias), com as contas que o app faz por vocês: prazos a
// partir da data, orçamento e a divisão das fraldas por tamanho.

export type CelebrationKind = 'cha_bebe' | 'cha_fraldas' | 'cha_revelacao' | 'ensaio' | 'outra';
export type CelebrationItemKind = 'tarefa' | 'fornecedor' | 'convidado' | 'ideia';
export type SupplierStatus = 'orcado' | 'contratado' | 'pago';
export type GuestStatus = 'convidado' | 'vai' | 'nao_vai' | 'talvez';

export interface CelebrationItem {
  id: string;
  kind: CelebrationItemKind;
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
}

export interface Celebration {
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
  items: CelebrationItem[];
}

export const CELEBRATION_KINDS: Array<{ id: CelebrationKind; label: string; hint: string }> = [
  { id: 'cha_bebe', label: 'Chá de bebê', hint: 'Família e amigos celebrando a chegada' },
  { id: 'cha_fraldas', label: 'Chá de fraldas', hint: 'Cada convidado leva fraldas no tamanho certo' },
  { id: 'cha_revelacao', label: 'Chá revelação', hint: 'Menino ou menina? O segredo revelado' },
  { id: 'ensaio', label: 'Ensaio de fotos', hint: 'A barriga num dia especial' },
  { id: 'outra', label: 'Outra celebração', hint: 'Do jeito de vocês' },
];
export const kindOfCelebration = (k: CelebrationKind) => CELEBRATION_KINDS.find(c => c.id === k) ?? CELEBRATION_KINDS[4];

/** Cores sugeridas para o tema (o casal pode marcar até seis). */
export const PALETTE = ['#f6c1cf', '#c93d64', '#cfe3f7', '#2f78c4', '#d8eedf', '#1d7f76', '#fbe6b6', '#e7a33b', '#e6dcf6', '#7b55c4', '#f4efe9', '#8a6a52'];

export const SUPPLIER_STATUS: Record<SupplierStatus, string> = { orcado: 'Pedi orçamento', contratado: 'Contratado', pago: 'Pago' };
export const GUEST_STATUS: Record<GuestStatus, string> = { convidado: 'Convidado', vai: 'Vai', talvez: 'Talvez', nao_vai: 'Não vai' };

/** O prazo de uma tarefa: a data fixa, ou "X dias antes" da celebração (só quando ela tem data). */
export function dueOf(item: CelebrationItem, eventAt: string | null): string | null {
  if (item.due_date) return item.due_date.slice(0, 10);
  if (item.due_offset == null || !eventAt) return null;
  const d = parseTimestamp(eventAt);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - item.due_offset));
}

/** Quantos dias faltam (negativo: já passou). */
export function daysTo(eventAt: string | null, today = new Date()): number | null {
  if (!eventAt) return null;
  return daysBetween(parseLocalDate(toISODate(today)), parseLocalDate(toISODate(parseTimestamp(eventAt))));
}

/** As tarefas que faltam, da mais urgente para a mais tranquila (sem prazo no fim). */
export function pendingTasks(c: Celebration) {
  return c.items
    .filter(i => i.kind === 'tarefa' && !i.done)
    .map(i => ({ item: i, due: dueOf(i, c.event_at) }))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
}

const money = (v: string | number | null) => (v == null || v === '' ? 0 : Number(v));

/** O orçamento: previsto, combinado (fornecedores contratados ou pagos) e já pago. */
export function budgetOf(c: Celebration) {
  const suppliers = c.items.filter(i => i.kind === 'fornecedor');
  const committed = suppliers.filter(s => s.status === 'contratado' || s.status === 'pago').reduce((n, s) => n + money(s.amount), 0);
  const paid = suppliers.filter(s => s.status === 'pago').reduce((n, s) => n + money(s.amount), 0);
  const quoted = suppliers.reduce((n, s) => n + money(s.amount), 0);
  return { planned: c.budget == null ? null : money(c.budget), committed, paid, quoted };
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 ? 2 : 0 });

/** Os convidados: quantas pessoas confirmaram, quantas talvez e quantas ainda não responderam. */
export function guestsOf(c: Celebration) {
  const guests = c.items.filter(i => i.kind === 'convidado');
  const count = (s: GuestStatus) => guests.filter(g => (g.status ?? 'convidado') === s).reduce((n, g) => n + Math.max(1, g.people ?? 1), 0);
  return { guests, going: count('vai'), maybe: count('talvez'), waiting: count('convidado'), notGoing: count('nao_vai') };
}

export type DiaperSize = 'RN' | 'P' | 'M' | 'G' | 'XG';

/**
 * A divisão das fraldas por tamanho, como se faz num chá de fraldas: o bebê
 * usa poucas RN e muitas M e G. Um pacote por convidado; o resto vai para os
 * tamanhos que mais duram.
 */
export const DIAPER_SPLIT: Array<{ size: DiaperSize; share: number; hint: string }> = [
  { size: 'RN', share: 0.05, hint: 'até 4 kg, as primeiras semanas' },
  { size: 'P', share: 0.2, hint: '4 a 6 kg' },
  { size: 'M', share: 0.35, hint: '6 a 9 kg, a fase mais longa' },
  { size: 'G', share: 0.3, hint: '9 a 12 kg' },
  { size: 'XG', share: 0.1, hint: 'mais de 12 kg' },
];

/** Quantos pacotes de cada tamanho para `packs` pacotes (somando exatamente `packs`). */
export function diaperPlan(packs: number): Array<{ size: DiaperSize; packs: number; hint: string }> {
  if (packs <= 0) return DIAPER_SPLIT.map(d => ({ size: d.size, packs: 0, hint: d.hint }));
  const raw = DIAPER_SPLIT.map(d => ({ ...d, exact: d.share * packs }));
  const plan = raw.map(d => ({ size: d.size, hint: d.hint, packs: Math.floor(d.exact), rest: d.exact - Math.floor(d.exact) }));
  // Os pacotes que sobram vão para os maiores restos (e, empatados, para M, G e P, os que mais duram).
  const priority: DiaperSize[] = ['M', 'G', 'P', 'XG', 'RN'];
  const order = [...plan].sort((a, b) => b.rest - a.rest || priority.indexOf(a.size) - priority.indexOf(b.size));
  let left = packs - plan.reduce((n, d) => n + d.packs, 0);
  for (const d of order) {
    if (left <= 0) break;
    d.packs += 1;
    left -= 1;
  }
  return plan.map(({ size, hint, packs: n }) => ({ size, hint, packs: n }));
}

/** O tamanho de fralda de cada convidado, em ordem (para dizer no convite "você leva M"). */
export function diaperFor(guestIds: string[]): Map<string, DiaperSize> {
  const plan = diaperPlan(guestIds.length);
  const sizes = plan.flatMap(p => Array.from({ length: p.packs }, () => p.size));
  return new Map(guestIds.map((id, i) => [id, sizes[i] ?? 'M']));
}

/** A próxima celebração (com data, ainda por vir) que deve aparecer no Início: até 60 dias antes. */
export function upcomingCelebration(list: Celebration[] | null | undefined, today = new Date()) {
  return (list ?? [])
    .map(c => ({ c, days: daysTo(c.event_at, today) }))
    .filter((x): x is { c: Celebration; days: number } => x.days !== null && x.days >= 0 && x.days <= 60)
    .sort((a, b) => a.days - b.days)[0] ?? null;
}

/** "R$ 1.500,00" (sempre com centavos, como no campo de valor). */
export const brlCents = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

/** O campo de valor digitado como no banco: só números, os dois últimos são os centavos ("150000" → 1500). */
export function moneyFromTyping(text: string): number | null {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
  return digits ? Number(digits) / 100 : null;
}

export type BudgetLevel = 'livre' | 'perto' | 'estourou';

/**
 * A régua do orçamento: quanto do previsto já está combinado (contratado ou
 * pago), quanto falta, e o que acontece se os orçamentos ainda abertos forem
 * fechados. Sem previsto, não há régua.
 */
export function budgetMeter(c: Celebration) {
  const b = budgetOf(c);
  const open = b.quoted - b.committed;
  if (!b.planned) return { ...b, open, pct: null, left: null, level: null as BudgetLevel | null, projectedPct: null };
  const pct = (b.committed / b.planned) * 100;
  const level: BudgetLevel = pct > 100 ? 'estourou' : pct >= 80 ? 'perto' : 'livre';
  return { ...b, open, pct, left: b.planned - b.committed, level, projectedPct: (b.quoted / b.planned) * 100 };
}

/** Tarefa com prazo vencido e ainda por fazer. */
export const isLate = (item: CelebrationItem, eventAt: string | null, today = new Date()) => {
  const due = item.kind === 'tarefa' && !item.done ? dueOf(item, eventAt) : null;
  return !!due && due < toISODate(today);
};
