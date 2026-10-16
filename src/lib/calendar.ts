import { PRENATAL_MILESTONES } from '../content/prenatalMilestones';
import { specialtyOf } from '../data/specialties';
import type { Author, Consultation, HealthMetric, PartnerTask, SymptomItem } from '../types';
import { daysBetween, isOverdue, localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';
import { isHighBloodPressure } from './health';

export type EventKind = 'consulta' | 'tarefa' | 'marco' | 'momento';

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  date: string; // AAAA-MM-DD, dia local
  time?: string; // HH:MM
  title: string;
  detail?: string;
  emoji?: string;
  done?: boolean;
  overdue?: boolean;
  major?: boolean;
  author?: Author;
  sourceId?: string;
  /** Momento com data para lembrar (vai para a agenda exportada). */
  reminder?: boolean;
  private?: boolean;
}

export interface CalendarMoment {
  id: string;
  entry_date: string;
  body: string;
  remind_on: string | null;
  visibility: 'private' | 'shared';
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

export function buildCalendar(input: { dumDate: string; consultations: Consultation[]; tasks: PartnerTask[]; symptoms: SymptomItem[]; metrics: HealthMetric[]; journal?: CalendarMoment[]; today?: Date }): CalendarData {
  const today = input.today ?? new Date();
  const events = new Map<string, CalendarEvent[]>();
  const push = (e: CalendarEvent) => events.set(e.date, [...(events.get(e.date) ?? []), e]);

  for (const c of input.consultations) {
    const when = parseTimestamp(c.scheduled_at);
    const spec = specialtyOf(c.specialty);
    push({
      id: `consulta-${c.id}`,
      kind: 'consulta',
      date: toISODate(localDay(c.scheduled_at)),
      time: hhmm(when),
      title: spec.label,
      detail: [c.professional_name, c.location].filter(Boolean).join(' · ') || undefined,
      emoji: spec.emoji,
      author: c.created_by,
      sourceId: c.id,
    });
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

  const order: Record<EventKind, number> = { marco: 0, consulta: 1, tarefa: 2, momento: 3 };
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
  const spec = specialtyOf(c.specialty);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${spec.emoji} Consulta: ${spec.label}`,
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
    const prefix = e.kind === 'consulta' ? 'Consulta: ' : e.kind === 'tarefa' ? 'Tarefa: ' : '';
    lines.push(`SUMMARY:${escapeIcs(prefix + e.title)}`);
    if (e.detail) lines.push(`DESCRIPTION:${escapeIcs(e.detail)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
