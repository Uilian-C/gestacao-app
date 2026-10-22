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

/** Timestamp do Postgres ('2026-09-20 13:00:00+00') ou ISO, em hora local. */
export function parseTimestamp(value: string): Date {
  const iso = value.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(iso);
}

/** O dia (local) de um timestamp, à meia-noite. */
export function localDay(value: string): Date {
  const d = parseTimestamp(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

/** Semana da gestação num dia (1 a 45), pela DUM: a semana em que um registro daquele dia entra. */
export function weekOfDay(dumDate: string, iso: string) {
  const w = gestationalAge(dumDate, parseLocalDate(iso))?.weeks ?? 1;
  return Math.min(45, Math.max(1, w));
}

/** Hora local de um timestamp: "21:40". */
export const hhmmOf = (value: string) => parseTimestamp(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Quando algo foi registrado, curtinho: "hoje, 21:40", "ontem, 08:12" ou
 * "12/10, 09:00" (com o ano, se não for o atual). Vazio sem data.
 */
export function stampText(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return '';
  const d = parseTimestamp(value);
  if (Number.isNaN(d.getTime())) return '';
  const days = daysBetween(new Date(d.getFullYear(), d.getMonth(), d.getDate()), new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const time = hhmmOf(value);
  if (days === 0) return `hoje, ${time}`;
  if (days === 1) return `ontem, ${time}`;
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
  return `${date}, ${time}`;
}
