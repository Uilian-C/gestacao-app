import { isAlertSymptom } from '../content/symptomCatalog';
import type { Author, PartnerComment, SymptomItem, TimeOfDay } from '../types';
import { daysBetween, formatBR, parseLocalDate, toISODate } from './dates';
import { canonSymptom, normalizeSymptomName } from './symptomCanon';

export const TIME_OF_DAY: Array<{ id: TimeOfDay; label: string; hint: string }> = [
  { id: 'manha', label: 'Manhã', hint: '6h-12h' },
  { id: 'tarde', label: 'Tarde', hint: '12h-18h' },
  { id: 'noite', label: 'Noite', hint: '18h-0h' },
  { id: 'madrugada', label: 'Madrugada', hint: '0h-6h' },
];

export function timeOfDayLabel(id: TimeOfDay): string {
  return TIME_OF_DAY.find(t => t.id === id)?.label ?? id;
}

export function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour < 6) return 'madrugada';
  if (hour < 12) return 'manha';
  if (hour < 18) return 'tarde';
  return 'noite';
}

export { normalizeSymptomName } from './symptomCanon';

export interface SymptomEntry {
  id: string;
  /** O sintoma por trás do que foi escrito ("enjoada nesta manhã" → "enjoo"): é por ela que tudo se agrupa. */
  key: string;
  /** O nome do sintoma ("Enjoo"). */
  name: string;
  /** O que foi escrito, sem acento e em minúsculas: é aqui que se procuram os sinais de alerta. */
  text: string;
  category: string;
  date: Date;
  week: number;
  intensity: number;
  timeOfDay: TimeOfDay | null;
  author: Author;
  notes: string | null;
}

export function toEntries(items: SymptomItem[]): SymptomEntry[] {
  return items
    .map(s => {
      const canon = canonSymptom(s.symptom_name);
      return {
        id: s.id,
        key: canon.key,
        name: canon.name,
        text: normalizeSymptomName(s.symptom_name),
        category: canon.category ?? s.category,
        date: parseLocalDate(s.log_date),
        week: s.week_number,
        intensity: Number(s.intensity),
        timeOfDay: s.time_of_day ?? null,
        author: s.created_by,
        notes: s.notes ?? null,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface Period {
  from: Date;
  to: Date;
}

export function inPeriod(date: Date, period: Period): boolean {
  return daysBetween(period.from, date) >= 0 && daysBetween(date, period.to) >= 0;
}

export type Trend = 'subindo' | 'descendo' | 'estavel' | 'novo';

export interface SymptomStats {
  key: string;
  name: string;
  category: string;
  count: number;
  avgIntensity: number;
  maxIntensity: number;
  firstDate: Date;
  lastDate: Date;
  /** Compara as duas últimas semanas do período com as duas anteriores. */
  trend: Trend | null;
  recentAvg: number | null;
  previousAvg: number | null;
  timeOfDay: { dominant: TimeOfDay | null; share: number; counts: Record<TimeOfDay, number>; known: number };
  byWeek: Array<{ week: number; avg: number; max: number; count: number }>;
  entries: SymptomEntry[];
  isAlert: boolean;
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** O nome mais usado entre as grafias que ficaram juntas. */
function mostCommonName(entries: SymptomEntry[]): string {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  const [name] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const TREND_WINDOW_DAYS = 14;
const TREND_THRESHOLD = 0.75;

export function computeSymptomStats(entries: SymptomEntry[], period: Period): SymptomStats[] {
  const groups = new Map<string, SymptomEntry[]>();
  for (const e of entries) {
    if (!inPeriod(e.date, period)) continue;
    groups.set(e.key, [...(groups.get(e.key) ?? []), e]);
  }

  const stats: SymptomStats[] = [];
  for (const [key, list] of groups) {
    const intensities = list.map(e => e.intensity);

    const recent = list.filter(e => daysBetween(e.date, period.to) < TREND_WINDOW_DAYS);
    const previous = list.filter(e => {
      const age = daysBetween(e.date, period.to);
      return age >= TREND_WINDOW_DAYS && age < TREND_WINDOW_DAYS * 2;
    });
    const recentAvg = recent.length ? average(recent.map(e => e.intensity)) : null;
    const previousAvg = previous.length ? average(previous.map(e => e.intensity)) : null;
    let trend: Trend | null = null;
    if (recentAvg !== null && previousAvg === null && list.length === recent.length) trend = 'novo';
    else if (recentAvg !== null && previousAvg !== null) {
      const delta = recentAvg - previousAvg;
      trend = delta >= TREND_THRESHOLD ? 'subindo' : delta <= -TREND_THRESHOLD ? 'descendo' : 'estavel';
    }

    const counts: Record<TimeOfDay, number> = { madrugada: 0, manha: 0, tarde: 0, noite: 0 };
    for (const e of list) if (e.timeOfDay) counts[e.timeOfDay]++;
    const known = Object.values(counts).reduce((a, b) => a + b, 0);
    const [dominant, dominantCount] = (Object.entries(counts) as Array<[TimeOfDay, number]>).sort((a, b) => b[1] - a[1])[0];

    const weeks = new Map<number, number[]>();
    for (const e of list) weeks.set(e.week, [...(weeks.get(e.week) ?? []), e.intensity]);

    stats.push({
      key,
      name: mostCommonName(list),
      category: list[list.length - 1].category,
      count: list.length,
      avgIntensity: average(intensities),
      maxIntensity: Math.max(...intensities),
      firstDate: list[0].date,
      lastDate: list[list.length - 1].date,
      trend,
      recentAvg,
      previousAvg,
      timeOfDay: { dominant: known > 0 ? dominant : null, share: known > 0 ? dominantCount / known : 0, counts, known },
      byWeek: [...weeks.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([week, values]) => ({ week, avg: average(values), max: Math.max(...values), count: values.length })),
      entries: list,
      isAlert: list.some(e => isAlertSymptom(e.text, e.intensity)),
    });
  }

  return stats.sort((a, b) => b.count - a.count || b.avgIntensity - a.avgIntensity);
}

export type InsightTone = 'alerta' | 'atencao' | 'info' | 'bom';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  symptomKey?: string;
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const TONE_ORDER: Record<InsightTone, number> = { alerta: 0, atencao: 1, info: 2, bom: 3 };

/**
 * Padrões explicáveis encontrados nos registros. Cada regra é simples de
 * conferir: o casal (e o médico) entende de onde veio cada frase.
 */
export function findPatterns(entries: SymptomEntry[], period: Period): Insight[] {
  const stats = computeSymptomStats(entries, period);
  const insights: Insight[] = [];

  for (const s of stats) {
    const alertEntry = [...s.entries].reverse().find(e => isAlertSymptom(e.text, e.intensity));
    if (alertEntry && daysBetween(alertEntry.date, period.to) < TREND_WINDOW_DAYS) {
      insights.push({
        id: `alerta-${s.key}`,
        tone: 'alerta',
        title: `${s.name} registrado em ${formatBR(toISODate(alertEntry.date))}`,
        detail: 'Esse sintoma está entre os sinais de alerta da gestação. Se ainda não falaram com o obstetra, entrem em contato.',
        symptomKey: s.key,
      });
    }

    const recentCount = s.entries.filter(e => daysBetween(e.date, period.to) < TREND_WINDOW_DAYS).length;
    if (recentCount >= 4) {
      insights.push({
        id: `frequente-${s.key}`,
        tone: 'atencao',
        title: `${s.name} apareceu ${recentCount} vezes nas últimas 2 semanas`,
        detail: `Intensidade média de ${fmt(average(s.entries.filter(e => daysBetween(e.date, period.to) < TREND_WINDOW_DAYS).map(e => e.intensity)))} de 5. Vale levar para a próxima consulta.`,
        symptomKey: s.key,
      });
    }

    if (s.trend === 'subindo' && s.recentAvg !== null && s.previousAvg !== null) {
      insights.push({
        id: `subindo-${s.key}`,
        tone: 'atencao',
        title: `${s.name} está mais intenso`,
        detail: `A média passou de ${fmt(s.previousAvg)} para ${fmt(s.recentAvg)} de 5 nas últimas 2 semanas.`,
        symptomKey: s.key,
      });
    }
    if (s.trend === 'descendo' && s.recentAvg !== null && s.previousAvg !== null) {
      insights.push({
        id: `descendo-${s.key}`,
        tone: 'bom',
        title: `${s.name} está aliviando`,
        detail: `A média caiu de ${fmt(s.previousAvg)} para ${fmt(s.recentAvg)} de 5 nas últimas 2 semanas.`,
        symptomKey: s.key,
      });
    }

    const { dominant, share, known } = s.timeOfDay;
    if (dominant && known >= 3 && share >= 0.6) {
      insights.push({
        id: `horario-${s.key}`,
        tone: 'info',
        title: `${s.name} costuma aparecer de ${timeOfDayLabel(dominant).toLowerCase()}`,
        detail: `${Math.round(share * known)} de ${known} registros com horário foram de ${timeOfDayLabel(dominant).toLowerCase()}.`,
        symptomKey: s.key,
      });
    }
  }

  // Sintomas que aparecem juntos no mesmo dia.
  const byDay = new Map<string, Set<string>>();
  for (const e of entries) {
    if (!inPeriod(e.date, period)) continue;
    const day = e.date.toDateString();
    byDay.set(day, (byDay.get(day) ?? new Set()).add(e.key));
  }
  const pairCounts = new Map<string, number>();
  for (const keys of byDay.values()) {
    const sorted = [...keys].sort();
    for (let i = 0; i < sorted.length; i++)
      for (let j = i + 1; j < sorted.length; j++) {
        const pair = `${sorted[i]}|${sorted[j]}`;
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      }
  }
  const nameOf = new Map(stats.map(s => [s.key, s.name]));
  for (const [pair, count] of pairCounts) {
    if (count < 3) continue;
    const [a, b] = pair.split('|');
    insights.push({
      id: `juntos-${pair}`,
      tone: 'info',
      title: `${nameOf.get(a)} e ${nameOf.get(b)?.toLowerCase()} aparecem juntos`,
      detail: `Os dois foram registrados no mesmo dia ${count} vezes no período.`,
    });
  }

  return insights.sort((x, y) => TONE_ORDER[x.tone] - TONE_ORDER[y.tone]);
}

/** Comentários de apoio de cada sintoma: o que o casal fez e anotou. */
export function careNotesFor(stats: SymptomStats, comments: PartnerComment[]): PartnerComment[] {
  const ids = new Set(stats.entries.map(e => e.id));
  return comments.filter(c => ids.has(c.symptom_id));
}

export function intensityLevel(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
}
