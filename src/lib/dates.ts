// Datas do banco chegam como 'AAAA-MM-DD'. `new Date('AAAA-MM-DD')` interpreta
// como meia-noite UTC, o que no Brasil (UTC-3) vira o dia anterior. Por isso
// todas as contas aqui usam datas locais.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const FIRST_WEEK = 4;
export const LAST_WEEK = 42;
const TERM_DAYS = 280;

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatBR(iso?: string | null): string {
  if (!iso) return '';
  return parseLocalDate(iso).toLocaleDateString('pt-BR');
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Dias inteiros de `from` até `to` (negativo se `to` for antes). Seguro contra horário de verão. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function trimesterOf(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

export function clampWeek(week: number): number {
  return Math.max(FIRST_WEEK, Math.min(LAST_WEEK, week));
}

export interface GestationalAge {
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  dpp: Date;
  daysToDpp: number;
  /** Passou de 40 semanas completas. */
  isPostTerm: boolean;
}

/** Idade gestacional a partir da DUM. Retorna null se a DUM estiver no futuro. */
export function gestationalAge(dumIso: string, today: Date = new Date()): GestationalAge | null {
  const dum = parseLocalDate(dumIso);
  const totalDays = daysBetween(dum, today);
  if (totalDays < 0) return null;

  const weeks = Math.floor(totalDays / 7);
  const dpp = new Date(dum.getFullYear(), dum.getMonth(), dum.getDate() + TERM_DAYS);

  return {
    weeks,
    days: totalDays % 7,
    trimester: trimesterOf(weeks),
    dpp,
    daysToDpp: daysBetween(today, dpp),
    isPostTerm: totalDays > TERM_DAYS,
  };
}

export function isOverdue(dueIso: string | null | undefined, today: Date = new Date()): boolean {
  if (!dueIso) return false;
  return daysBetween(today, parseLocalDate(dueIso)) < 0;
}
