import type { PlanItem, PlanKind } from '../content/prenatalPlan';
import type { CheckItem, ExamItem, ListItem } from '../hooks/useGestationData';
import type { AppointmentKind, Consultation } from '../types';
import { parseLocalDate, parseTimestamp, toISODate } from './dates';
import { normalize } from './examArchive';

// Agenda → Jornada: o planejado (a janela de semanas de cada item, a de
// referência ou a que o casal ajustou) ao lado do realizado (o que foi
// agendado, feito ou guardado). Um agendamento ligado a um item (plan_item)
// faz o item andar sozinho: agendado enquanto a data não chega, feito depois.

export interface PlanWeeks {
  item_id: string;
  from: number;
  to: number;
}

export interface JourneyItem extends PlanItem {
  /** Janela de referência, quando o casal ajustou as semanas. */
  base?: { from: number; to: number };
  /** Item criado pelo casal (checklist_items). */
  own?: ListItem;
}

export type JourneyStatus = 'feito' | 'agendado' | 'atrasado' | 'agora' | 'em-breve' | 'depois';

export interface JourneyRow {
  item: JourneyItem;
  status: JourneyStatus;
  /** Dia em que foi feito (agendamento, resultado ou marcação), quando se sabe. */
  doneOn: string | null;
  /** O agendamento ligado: o próximo, ou o último que já passou. */
  appointment: Consultation | null;
  /** Resultado guardado ligado ao item. */
  exam: ExamItem | null;
  /** O agendamento cai fora da janela planejada. */
  outside: boolean;
  /** Marcado à mão (dá para desmarcar). */
  checked: boolean;
}

/** A lista padrão com as semanas ajustadas pelo casal e os itens que o casal pôs (com semana ou não). */
export function plannedItems(items: PlanItem[], weeks: PlanWeeks[], own: ListItem[] = []): JourneyItem[] {
  const byId = new Map(weeks.map(w => [w.item_id, w]));
  const base: JourneyItem[] = items.map(i => {
    const w = byId.get(i.id);
    return w && !i.anytime ? { ...i, from: w.from, to: w.to, base: { from: i.from, to: i.to } } : i;
  });
  const mine: JourneyItem[] = own.map(o => {
    const w = byId.get(o.id);
    return {
      id: o.id,
      kind: 'preparo' as PlanKind,
      title: o.title,
      short: o.title,
      why: 'Item que vocês puseram na jornada.',
      from: w?.from ?? o.week ?? 4,
      to: w?.to ?? o.week ?? 40,
      anytime: !w && !o.week,
      own: o,
    };
  });
  return [...base, ...mine];
}

const weekOf = (dumDate: string, day: Date) => {
  const dum = parseLocalDate(dumDate);
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return Math.floor((d.getTime() - dum.getTime()) / (7 * 86_400_000));
};

/** Planejado × realizado de cada item, na ordem da gestação. */
export function journeyRows(
  items: JourneyItem[],
  ctx: { week: number; dumDate: string; now: Date; checks: CheckItem[]; consultations: Consultation[]; exams: ExamItem[]; autoDone?: Set<string> },
): JourneyRow[] {
  const { week, dumDate, now } = ctx;
  return items
    .map(item => {
      const linked = ctx.consultations.filter(c => c.plan_item === item.id).sort((a, b) => parseTimestamp(a.scheduled_at).getTime() - parseTimestamp(b.scheduled_at).getTime());
      const past = linked.filter(c => parseTimestamp(c.scheduled_at) <= now);
      const next = linked.find(c => parseTimestamp(c.scheduled_at) > now) ?? null;
      const exam = ctx.exams.find(e => e.plan_item === item.id) ?? null;
      const check = ctx.checks.find(c => c.list === 'prenatal' && c.item_id === item.id) ?? null;
      const lastPast = past[past.length - 1] ?? null;
      const done = !!check || !!exam || !!lastPast || !!ctx.autoDone?.has(item.id);
      const appointment = done ? (lastPast ?? next) : next;
      const doneOn = exam?.exam_date.slice(0, 10) ?? (lastPast ? toISODate(parseTimestamp(lastPast.scheduled_at)) : null) ?? check?.done_at?.slice(0, 10) ?? null;
      const status: JourneyStatus = done
        ? 'feito'
        : next
          ? 'agendado'
          : item.anytime
            ? 'agora'
            : week > item.to
              ? 'atrasado'
              : week >= item.from
                ? 'agora'
                : item.from - week <= 4
                  ? 'em-breve'
                  : 'depois';
      const at = appointment ? weekOf(dumDate, parseTimestamp(appointment.scheduled_at)) : null;
      const outside = !item.anytime && at !== null && (at < item.from || at > item.to);
      return { item, status, doneOn, appointment, exam, outside, checked: !!check };
    })
    .sort((a, b) => Number(!!a.item.anytime) - Number(!!b.item.anytime) || a.item.from - b.item.from || a.item.to - b.item.to);
}

/** Os números do topo: o que estava previsto até agora e como está. */
export function journeySummary(rows: JourneyRow[], week: number) {
  const timed = rows.filter(r => !r.item.anytime);
  const dueByNow = timed.filter(r => r.item.from <= week);
  return {
    dueByNow: dueByNow.length,
    done: dueByNow.filter(r => r.status === 'feito').length,
    scheduled: rows.filter(r => r.status === 'agendado').length,
    late: rows.filter(r => r.status === 'atrasado').length,
    open: timed.filter(r => r.status === 'agora').length,
    total: timed.length,
    doneTotal: timed.filter(r => r.status === 'feito').length,
  };
}

// Palavras que identificam cada item no nome do agendamento (sem acento, minúsculas).
const KEYWORDS: Record<string, string[]> = {
  'exames-iniciais': ['sangue', 'urina', 'hemograma', 'laborator', 'rotina', 'iniciais', 'sorolog', 'tipagem', 'tipo sanguineo', 'urocultura'],
  'exames-3tri': ['sangue', 'urina', 'hemograma', 'laborator', 'rotina', 'sorolog', 'urocultura', '3 tri', '3o tri', 'terceiro'],
  'morfo-1': ['morfolog', 'translucencia', 'nucal', '1 tri', '1o tri', 'primeiro'],
  'morfo-2': ['morfolog', '2 tri', '2o tri', 'segundo'],
  totg: ['curva', 'glicemic', 'totg', 'tolerancia', 'glicose', 'dextrosol'],
  coombs: ['coombs'],
  gbs: ['estrepto', 'gbs', 'swab', 'cotonete', 'streptococ'],
  dtpa: ['dtpa', 'coqueluche', 'triplice'],
  'anti-d': ['anti-d', 'anti d', 'antid', 'imunoglobulina', 'rhogam', 'matergam'],
  vsr: ['vsr', 'sincicial', 'bronquiolite', 'abrysvo'],
  gripe: ['gripe', 'influenza'],
  'hepatite-b': ['hepatite'],
  covid: ['covid', 'coronavirus'],
};

// Nomes que não dizem qual é o exame: aí vale só a semana.
const GENERIC = ['', 'exame', 'exames', 'exame de sangue', 'exames de sangue', 'ultrassom', 'ultrassom obstetrico', 'ultrassonografia', 'usg', 'ultra', 'vacina'];

/** Que itens da jornada combinam com o tipo do agendamento. */
function fitsKind(item: PlanItem, kind: AppointmentKind) {
  if (kind === 'consulta') return item.kind === 'consulta';
  if (kind === 'vacina') return item.kind === 'vacina';
  if (item.kind !== 'exame') return false;
  const us = item.title.startsWith('Ultrassom');
  return kind === 'ultrassom' ? us : !us;
}

const distance = (item: PlanItem, week: number) => (item.anytime ? 0 : week < item.from ? item.from - week : week > item.to ? week - item.to : 0);

/**
 * Encaixe automático: o item da jornada que um agendamento novo cumpre, pelo
 * nome e pela semana da data. Itens já feitos ou já agendados ficam de fora
 * (a não ser o do próprio agendamento, ao editar). Sem nome que identifique,
 * só encaixa se a data cair na janela (ou até 2 semanas dela).
 */
export function suggestPlanItem(a: { kind: AppointmentKind; title: string; date: string; id?: string }, ctx: { items: JourneyItem[]; dumDate: string; done: Set<string>; consultations: Consultation[]; now: Date }): JourneyItem | null {
  if (!a.date) return null;
  const week = weekOf(ctx.dumDate, parseLocalDate(a.date));
  const taken = new Set(ctx.consultations.filter(c => c.id !== a.id && c.plan_item && parseTimestamp(c.scheduled_at) > ctx.now).map(c => c.plan_item!));
  const free = ctx.items.filter(i => !i.own && fitsKind(i, a.kind) && !ctx.done.has(i.id) && !taken.has(i.id));
  const name = normalize(a.title);
  const own = ctx.items.find(i => i.own && name.length >= 4 && (name.includes(normalize(i.title)) || normalize(i.title).includes(name)) && !ctx.done.has(i.id));
  if (own) return own;
  const byDistance = (list: JourneyItem[]) => [...list].sort((x, y) => distance(x, week) - distance(y, week) || Number(!!x.anytime) - Number(!!y.anytime) || x.from - y.from);
  if (GENERIC.includes(name)) return byDistance(free.filter(i => !i.anytime)).find(i => distance(i, week) <= 2) ?? null;
  const hits = free.filter(i => (KEYWORDS[i.id] ?? []).some(k => name.includes(k)) || name.includes(normalize(i.short)) || name.includes(normalize(i.title)));
  return byDistance(hits)[0] ?? null;
}

/** Itens que podem ser ligados a um agendamento desse tipo (para o "trocar"). */
export function linkableItems(items: JourneyItem[], kind: AppointmentKind): JourneyItem[] {
  return items.filter(i => i.own || fitsKind(i, kind));
}

/** De que tipo é o agendamento para cumprir um item (o botão "Agendar" da jornada). */
export function appointmentKindFor(item: PlanItem): AppointmentKind {
  if (item.kind === 'vacina') return 'vacina';
  if (item.kind === 'consulta') return 'consulta';
  if (item.kind === 'exame') return item.title.startsWith('Ultrassom') ? 'ultrassom' : 'exame';
  return 'exame';
}

/** Os itens que um agendamento que já passou dá como feitos. */
export function doneByAppointments(consultations: Consultation[], now: Date): Set<string> {
  return new Set(consultations.filter(c => c.plan_item && parseTimestamp(c.scheduled_at) <= now).map(c => c.plan_item!));
}
