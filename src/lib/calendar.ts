import { PRENATAL_MILESTONES } from '../content/prenatalMilestones';
import { appointmentTitle, kindInfo, kindOf } from './appointments';
import type { AppointmentKind, Author, Consultation, HealthMetric, PartnerTask, SymptomItem } from '../types';
import { daysBetween, isOverdue, localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';
import { isHighBloodPressure } from './health';
import { dueOf, kindOfCelebration, type Celebration } from './celebrations';

export type EventKind = 'consulta' | 'exame' | 'tarefa' | 'marco' | 'momento' | 'celebracao';

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  date: string; // AAAA-MM-DD, dia local
  time?: string; // HH:MM
  title: string;
  detail?: string;
  done?: boolean;
  overdue?: boolean;
  major?: boolean;
  author?: Author;
  sourceId?: string;
  /** Momento com data para lembrar (vai para a agenda exportada). */
  reminder?: boolean;
  private?: boolean;
  /** Consulta, exame, ultrassom ou vacina (agendamentos). */
  appointment?: AppointmentKind;
}

/** Resultado guardado (exame ou ultrassom), que entra no dia em que foi feito. */
export interface CalendarResult {
  id: string;
  title: string;
  exam_date: string;
  kind: string;
  appointment_id?: string | null;
}

export interface CalendarMoment {
  id: string;
  entry_date: string;
  body: string;
  remind_on: string | null;
  visibility: 'private' | 'shared' | 'family';
  author_role: Author;
}

export interface DayRecords {
  symptoms: SymptomItem[];
  metrics: HealthMetric[];
  maxIntensity: number;
  bpHigh: boolean;
}

export interface CalendarData {
  events: Map<string, CalendarEvent[]>;
  records: Map<string, DayRecords>;
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function buildCalendar(input: { dumDate: string; consultations: Consultation[]; results?: CalendarResult[]; tasks: PartnerTask[]; symptoms: SymptomItem[]; metrics: HealthMetric[]; journal?: CalendarMoment[]; today?: Date; celebrations?: Celebration[] | null }): CalendarData {
  const today = input.today ?? new Date();
  const events = new Map<string, CalendarEvent[]>();
  const push = (e: CalendarEvent) => events.set(e.date, [...(events.get(e.date) ?? []), e]);

  for (const c of input.consultations) {
    const when = parseTimestamp(c.scheduled_at);
    const result = input.results?.find(r => r.appointment_id === c.id);
    push({
      id: `consulta-${c.id}`,
      kind: 'consulta',
      appointment: kindOf(c),
      date: toISODate(localDay(c.scheduled_at)),
      time: hhmm(when),
      title: appointmentTitle(c),
      detail: [result ? 'resultado guardado' : null, c.professional_name, c.location].filter(Boolean).join(' · ') || undefined,
      author: c.created_by,
      sourceId: c.id,
    });
  }

  // Resultados guardados entram no dia do exame; se vieram de um agendamento do mesmo dia, o agendamento já está lá.
  const byId = new Map(input.consultations.map(c => [c.id, c]));
  for (const r of input.results ?? []) {
    const from = r.appointment_id ? byId.get(r.appointment_id) : undefined;
    if (from && toISODate(localDay(from.scheduled_at)) === r.exam_date.slice(0, 10)) continue;
    push({ id: `exame-${r.id}`, kind: 'exame', date: r.exam_date.slice(0, 10), title: r.title, detail: 'Resultado guardado', sourceId: r.id });
  }

  for (const t of input.tasks) {
    if (!t.due_date) continue;
    push({
      id: `tarefa-${t.id}`,
      kind: 'tarefa',
      date: t.due_date.slice(0, 10),
      title: t.task_title,
      detail: t.notes ?? undefined,
      done: t.is_completed,
      overdue: !t.is_completed && isOverdue(t.due_date, today),
      author: t.assigned_to === 'casal' ? undefined : t.assigned_to,
      sourceId: t.id,
    });
  }

  const dum = parseLocalDate(input.dumDate);
  for (const m of PRENATAL_MILESTONES) {
    push({
      id: `marco-${m.week}`,
      kind: 'marco',
      date: toISODate(addDays(dum, m.week * 7)),
      title: m.title,
      detail: m.detail,
      major: m.major,
    });
  }

  for (const j of input.journal ?? []) {
    const short = j.body.length > 60 ? `${j.body.slice(0, 57)}…` : j.body;
    push({ id: `momento-${j.id}`, kind: 'momento', date: j.entry_date.slice(0, 10), title: short, author: j.author_role, private: j.visibility === 'private', sourceId: j.id });
    if (j.remind_on) {
      push({ id: `lembrete-${j.id}`, kind: 'momento', date: j.remind_on.slice(0, 10), title: `Lembrete: ${short}`, author: j.author_role, private: j.visibility === 'private', reminder: true, sourceId: j.id });
    }
  }

  // Celebrações: o dia da festa (em destaque) e os prazos das tarefas.
  for (const c of input.celebrations ?? []) {
    if (c.event_at) {
      const d = parseTimestamp(c.event_at);
      push({ id: `celebracao-${c.id}`, kind: 'celebracao', date: toISODate(d), time: hhmm(d), title: c.title, detail: [kindOfCelebration(c.kind).label, c.location].filter(Boolean).join(' · '), major: true, sourceId: c.id });
    }
    for (const t of c.items) {
      const due = t.kind === 'tarefa' ? dueOf(t, c.event_at) : null;
      if (!due) continue;
      push({ id: `celebracao-tarefa-${t.id}`, kind: 'celebracao', date: due, title: t.title, detail: c.title, done: t.done, overdue: !t.done && isOverdue(due, today), sourceId: c.id });
    }
  }

  const order: Record<EventKind, number> = { marco: 0, celebracao: 1, consulta: 2, exame: 3, tarefa: 4, momento: 5 };
  for (const list of events.values()) list.sort((a, b) => order[a.kind] - order[b.kind] || (a.time ?? '').localeCompare(b.time ?? ''));

  const records = new Map<string, DayRecords>();
  const rec = (day: string) => records.get(day) ?? { symptoms: [], metrics: [], maxIntensity: 0, bpHigh: false };
  for (const s of input.symptoms) {
    const day = s.log_date.slice(0, 10);
    const r = rec(day);
    records.set(day, { ...r, symptoms: [...r.symptoms, s], maxIntensity: Math.max(r.maxIntensity, Number(s.intensity)) });
  }
  for (const m of input.metrics) {
    const day = m.recorded_at.slice(0, 10);
    const r = rec(day);
    records.set(day, { ...r, metrics: [...r.metrics, m], bpHigh: r.bpHigh || isHighBloodPressure(m.systolic_bp, m.diastolic_bp) });
  }

  return { events, records };
}

/** Semanas (domingo a sábado) que cobrem o mês, como no calendário de parede. */
export function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = addDays(first, -first.getDay());
  const end = addDays(last, 6 - last.getDay());
  const weeks: Date[][] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
  }
  return weeks;
}

/** Os 7 dias de uma semana da gestação (a semana N começa no dia DUM + 7N). */
export function gestationalWeekDays(dumDate: string, week: number): Date[] {
  const start = addDays(parseLocalDate(dumDate), week * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function gestationalWeekOf(dumDate: string, date: Date): number {
  return Math.floor(daysBetween(parseLocalDate(dumDate), date) / 7);
}

/* ---------- Exportação para agendas externas ---------- */

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dateStamp = (iso: string) => iso.replace(/-/g, '');

/** Link que abre o Google Agenda já com a consulta preenchida. */
export function googleCalendarUrl(c: Consultation): string {
  const start = parseTimestamp(c.scheduled_at);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const kind = kindOf(c);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${kindInfo(kind).label}: ${appointmentTitle(c)}`,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: [c.professional_name && `Profissional: ${c.professional_name}`, 'Levar o resumo gerado no app Tumtum.'].filter(Boolean).join('\n'),
  });
  if (c.location) params.set('location', c.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const escapeIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Arquivo .ics com consultas, tarefas com prazo e marcos, para importar no Google Agenda ou no iPhone. */
export function toIcs(events: CalendarEvent[], consultations: Consultation[], now = new Date()): string {
  const byId = new Map(consultations.map(c => [c.id, c]));
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tumtum//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Tumtum'];
  for (const e of events) {
    if (e.kind === 'tarefa' && e.done) continue;
    // Resultados já guardados não vão para a agenda exportada.
    if (e.kind === 'exame') continue;
    // Momentos já vividos não vão para a agenda; só os lembretes.
    if (e.kind === 'momento' && !e.reminder) continue;
    // UID com o nome antigo de propósito: quem já importou a agenda não ganha eventos duplicados.
    lines.push('BEGIN:VEVENT', `UID:${e.id}@nossa-gestacao`, `DTSTAMP:${utcStamp(now)}`);
    const c = e.sourceId ? byId.get(e.sourceId) : undefined;
    if (e.kind === 'consulta' && c) {
      const start = parseTimestamp(c.scheduled_at);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(new Date(start.getTime() + 3600000))}`);
      if (c.location) lines.push(`LOCATION:${escapeIcs(c.location)}`);
    } else {
      const next = toISODate(addDays(parseLocalDate(e.date), 1));
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.date)}`, `DTEND;VALUE=DATE:${dateStamp(next)}`);
    }
    const prefix = e.kind === 'consulta' ? `${kindInfo(e.appointment ?? 'consulta').label}: ` : e.kind === 'tarefa' ? 'Tarefa: ' : '';
    lines.push(`SUMMARY:${escapeIcs(prefix + e.title)}`);
    if (e.detail) lines.push(`DESCRIPTION:${escapeIcs(e.detail)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/* ---------- O calendário fluido: filtros, meses e o dia na gestação ---------- */

export type CalendarFilter = 'tudo' | 'consultas' | 'tarefas' | 'diario' | 'celebracoes' | 'marcos' | 'saude';

/** Os filtros: um de cada vez, para o calendário nunca virar uma salada. */
export const CALENDAR_FILTERS: Array<{ id: CalendarFilter; label: string; dot: string }> = [
  { id: 'tudo', label: 'Tudo', dot: '' },
  { id: 'consultas', label: 'Consultas e exames', dot: 'bg-brand' },
  { id: 'tarefas', label: 'Tarefas', dot: 'bg-ink-mute' },
  { id: 'diario', label: 'Diário', dot: 'bg-casal' },
  { id: 'celebracoes', label: 'Celebrações', dot: 'bg-rosa' },
  { id: 'marcos', label: 'Marcos', dot: 'bg-warm' },
  { id: 'saude', label: 'Saúde e humor', dot: 'bg-int-3' },
];

const FILTER_KINDS: Record<Exclude<CalendarFilter, 'tudo' | 'saude'>, EventKind[]> = {
  consultas: ['consulta', 'exame'],
  tarefas: ['tarefa'],
  diario: ['momento'],
  celebracoes: ['celebracao'],
  marcos: ['marco'],
};

/** O evento entra no filtro? (Saúde e humor não são eventos: ficam com os registros do dia.) */
export function matchesFilter(e: CalendarEvent, filter: CalendarFilter): boolean {
  if (filter === 'tudo') return true;
  if (filter === 'saude') return false;
  return FILTER_KINDS[filter].includes(e.kind);
}

/** O ponto de cada tipo de evento, na cor dele (atrasado em vermelho, feito apagado). */
export function dotClass(e: CalendarEvent): string {
  if (e.overdue) return 'bg-alert';
  if (e.kind === 'consulta') return 'bg-brand';
  if (e.kind === 'exame') return 'bg-verde';
  if (e.kind === 'marco') return 'bg-warm';
  if (e.kind === 'momento') return 'bg-casal';
  if (e.kind === 'celebracao') return e.done ? 'bg-line' : 'bg-rosa';
  return e.done ? 'bg-line' : 'bg-ink-mute';
}

/** Os pontos de um dia: um por tipo (não um por evento), no máximo três. */
export function dayDots(list: CalendarEvent[], filter: CalendarFilter, max = 3): { dots: string[]; more: number } {
  const seen = new Set<string>();
  for (const e of list) if (matchesFilter(e, filter)) seen.add(dotClass(e));
  const all = [...seen];
  return { dots: all.slice(0, max), more: Math.max(0, all.length - max) };
}

/** Os meses do calendário: do mês da DUM até o mês depois da DPP (e sempre o mês de hoje). */
export function gestationMonths(dumDate: string, today = new Date()): Array<{ year: number; month: number }> {
  const dum = parseLocalDate(dumDate);
  const dpp = addDays(dum, 280);
  const first = new Date(Math.min(new Date(dum.getFullYear(), dum.getMonth(), 1).getTime(), new Date(today.getFullYear(), today.getMonth(), 1).getTime()));
  const last = new Date(Math.max(new Date(dpp.getFullYear(), dpp.getMonth() + 1, 1).getTime(), new Date(today.getFullYear(), today.getMonth(), 1).getTime()));
  const out: Array<{ year: number; month: number }> = [];
  for (let d = first; d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push({ year: d.getFullYear(), month: d.getMonth() });
  return out;
}

export interface GestationDay {
  /** Semanas e dias completos naquele dia. */
  weeks: number;
  days: number;
  /** 1 a 280 (ou mais, depois da DPP). */
  dayOfPregnancy: number;
  trimester: 1 | 2 | 3;
  /** Dias até a DPP (negativo depois dela). */
  daysToDpp: number;
  isDpp: boolean;
  /** Primeiro dia de uma semana da gestação. */
  weekStart: boolean;
}

/** Como estava a gestação num dia: nulo antes da DUM ou bem depois da DPP (42 semanas). */
export function gestationDay(dumDate: string, iso: string): GestationDay | null {
  const total = daysBetween(parseLocalDate(dumDate), parseLocalDate(iso));
  if (total < 0 || total > 42 * 7) return null;
  const weeks = Math.floor(total / 7);
  return { weeks, days: total % 7, dayOfPregnancy: total + 1, trimester: weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3, daysToDpp: 280 - total, isDpp: total === 280, weekStart: total % 7 === 0 };
}
