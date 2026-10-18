import type { ExamItem, JournalEntry } from '../hooks/useGestationData';
import type { Consultation, PartnerTask } from '../types';
import { appointmentTitle, hasResult, kindInfo, kindOf, resultOf } from './appointments';
import { daysBetween, isOverdue, localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';

// "O que vai acontecer": agendamentos, tarefas com prazo e lembretes do diário
// numa lista só, por dia. A Agenda mostra tudo; o Início mostra hoje e a semana.

export type UpcomingTone = 'verde' | 'azul' | 'rosa';

export interface UpcomingItem {
  id: string;
  /** Dia (AAAA-MM-DD) e hora, se tiver. */
  day: string;
  time?: string;
  /** Tipo em uma palavra: Consulta, Exame, Tarefa, Lembrete... */
  label: string;
  title: string;
  detail?: string;
  tone: UpcomingTone;
  overdue?: boolean;
  consultation?: Consultation;
  task?: PartnerTask;
  entry?: JournalEntry;
}

const WHO: Record<string, string> = { mae: 'mãe', pai: 'pai', casal: 'casal' };
const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function appointmentItem(c: Consultation): UpcomingItem {
  return {
    id: `agendado-${c.id}`,
    day: toISODate(localDay(c.scheduled_at)),
    time: hhmm(parseTimestamp(c.scheduled_at)),
    label: kindInfo(kindOf(c)).label,
    title: appointmentTitle(c),
    detail: [c.professional_name, c.location].filter(Boolean).join(' · ') || undefined,
    tone: 'verde',
    consultation: c,
  };
}

export function buildUpcoming(input: { consultations: Consultation[]; tasks: PartnerTask[]; journal: JournalEntry[]; exams: ExamItem[]; today: Date }) {
  const today = parseLocalDate(toISODate(input.today));
  const items: UpcomingItem[] = [];

  for (const c of input.consultations) {
    if (daysBetween(today, localDay(c.scheduled_at)) >= 0) items.push(appointmentItem(c));
  }
  for (const t of input.tasks) {
    if (t.is_completed || !t.due_date) continue;
    const overdue = isOverdue(t.due_date, today);
    items.push({
      id: `tarefa-${t.id}`,
      // Tarefa atrasada aparece hoje, marcada como atrasada.
      day: overdue ? toISODate(today) : t.due_date.slice(0, 10),
      label: overdue ? 'Tarefa atrasada' : 'Tarefa',
      title: t.task_title,
      detail: `Para: ${WHO[t.assigned_to] ?? 'casal'}`,
      tone: 'azul',
      overdue,
      task: t,
    });
  }
  for (const e of input.journal) {
    if (!e.remind_on || daysBetween(today, parseLocalDate(e.remind_on)) < 0) continue;
    items.push({ id: `lembrete-${e.id}`, day: e.remind_on.slice(0, 10), time: e.remind_at ? hhmm(parseTimestamp(e.remind_at)) : undefined, label: 'Lembrete', title: e.body || 'Lembrete do diário', detail: e.visibility === 'private' ? 'Só você vê' : undefined, tone: 'rosa', entry: e });
  }

  items.sort((a, b) => a.day.localeCompare(b.day) || Number(!!b.overdue) - Number(!!a.overdue) || (a.time ?? '99').localeCompare(b.time ?? '99'));
  const offset = (i: UpcomingItem) => daysBetween(today, parseLocalDate(i.day));

  // Exames e ultrassons que já aconteceram (até 30 dias) e ainda não têm resultado guardado.
  const missingResults = input.consultations
    .filter(c => hasResult(c) && !resultOf(c, input.exams) && daysBetween(today, localDay(c.scheduled_at)) <= 0 && daysBetween(today, localDay(c.scheduled_at)) >= -30)
    .filter(c => daysBetween(today, localDay(c.scheduled_at)) < 0 || parseTimestamp(c.scheduled_at) <= input.today);
  const past = input.consultations.filter(c => daysBetween(today, localDay(c.scheduled_at)) < 0).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return {
    today: items.filter(i => offset(i) === 0),
    week: items.filter(i => offset(i) >= 1 && offset(i) <= 7),
    later: items.filter(i => offset(i) > 7),
    missingResults,
    past,
  };
}

/** "ter 20" para os cartões de dia. */
export function dayChip(iso: string) {
  const d = parseLocalDate(iso);
  return { weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), day: d.getDate(), month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') };
}
