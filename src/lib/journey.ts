import { PHASES, PLAN_ITEMS, type Phase, type PlanItem } from '../content/prenatalPlan';
import { parseLocalDate } from './dates';

export type ItemStatus = 'feito' | 'pendente' | 'agora' | 'em-breve' | 'depois';

/** Itens da jornada que valem para esta gestação (alguns só para Rh negativo). */
export function planFor(bloodType: string | null): PlanItem[] {
  const rhNegative = !!bloodType && bloodType.trim().endsWith('-');
  return PLAN_ITEMS.filter(i => !i.rhNegativeOnly || rhNegative);
}

/**
 * feito: marcado como feito. pendente: a janela já passou sem marcação.
 * agora: a janela está aberta. em-breve: abre nas próximas 4 semanas. depois: mais adiante.
 */
/** Exames da jornada (para ligar um resultado guardado ao item). */
export function planExams(bloodType: string | null): PlanItem[] {
  return planFor(bloodType).filter(i => i.kind === 'exame');
}

export function itemStatus(item: PlanItem, week: number, done: boolean): ItemStatus {
  if (done) return 'feito';
  if (week > item.to) return 'pendente';
  if (week >= item.from) return 'agora';
  if (item.from - week <= 4) return 'em-breve';
  return 'depois';
}

export function phaseOf(week: number): Phase {
  return PHASES.find(p => week >= p.from && week <= p.to) ?? (week < PHASES[0].from ? PHASES[0] : PHASES[PHASES.length - 1]);
}

/** Data em que a gestação completa `week` semanas. */
export function dateOfWeek(dumDate: string, week: number): Date {
  const d = parseLocalDate(dumDate);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + week * 7);
}

export interface Step {
  item: PlanItem;
  status: ItemStatus;
}

const ORDER: Record<ItemStatus, number> = { pendente: 0, agora: 1, 'em-breve': 2, depois: 3, feito: 4 };

/**
 * O que fazer a seguir: primeiro o que ficou para trás, depois o que está na
 * janela agora, depois o que abre em breve. Itens "a qualquer momento" (vacinas
 * de campanha) só entram se não houver outros, para não ocupar a lista toda.
 */
export function nextSteps(items: PlanItem[], week: number, done: Set<string>, limit = 3): Step[] {
  const open = items
    .map(item => ({ item, status: itemStatus(item, week, done.has(item.id)) }))
    .filter(s => s.status !== 'feito' && s.status !== 'depois');
  const sort = (a: Step, b: Step) => ORDER[a.status] - ORDER[b.status] || a.item.from - b.item.from;
  const timed = open.filter(s => !s.item.anytime).sort(sort);
  const anytime = open.filter(s => s.item.anytime).sort(sort);
  return [...timed, ...anytime].slice(0, limit);
}

/** Quanto do que já deveria ter acontecido até esta semana foi marcado como feito. */
export function planProgress(items: PlanItem[], week: number, done: Set<string>) {
  const dueByNow = items.filter(i => !i.anytime && i.to < week);
  const doneByNow = dueByNow.filter(i => done.has(i.id)).length;
  const doneTotal = items.filter(i => done.has(i.id)).length;
  return { dueByNow: dueByNow.length, doneByNow, doneTotal, total: items.length };
}

const shortDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** "sem. 24–28 · até 30/10" ou "a partir de 12/11": quando fazer, em datas reais. */
export function windowText(item: PlanItem, status: ItemStatus, dumDate: string): string {
  if (item.anytime) return 'Em qualquer fase';
  const weeks = `sem. ${item.from}–${item.to}`;
  const end = dateOfWeek(dumDate, item.to + 1);
  end.setDate(end.getDate() - 1);
  if (status === 'em-breve' || status === 'depois') return `${weeks} · a partir de ${shortDate(dateOfWeek(dumDate, item.from))}`;
  return `${weeks} · até ${shortDate(end)}`;
}

/**
 * Ritmo de consultas recomendado (Ministério da Saúde): mensal até 28 semanas,
 * quinzenal até 36 e semanal até o parto. Começa na semana da 1ª consulta.
 */
export function plannedVisitWeeks(firstWeek = 8): number[] {
  const weeks: number[] = [];
  for (let w = Math.min(firstWeek, 12); w <= 28; w += 4) weeks.push(w);
  for (let w = 30; w <= 36; w += 2) if (!weeks.includes(w)) weeks.push(w);
  for (let w = 37; w <= 40; w++) weeks.push(w);
  return weeks;
}

export interface Visit {
  id: string;
  week: number;
  date: Date;
  specialty: string;
  future: boolean;
}

/** Consultas do casal posicionadas na semana da gestação. */
export function visitsOf(consultations: Array<{ id: string; scheduled_at: string; specialty: string }>, dumDate: string, now: Date): Visit[] {
  const dum = parseLocalDate(dumDate);
  return consultations
    .map(c => {
      const date = new Date(c.scheduled_at);
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return { id: c.id, date, specialty: c.specialty, future: date > now, week: Math.floor((day.getTime() - dum.getTime()) / (7 * 86_400_000)) };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Itens que o próprio uso do app já comprova: uma consulta de obstetra realizada conta como 1ª consulta. */
export function autoDone(visits: Visit[]): Set<string> {
  const done = new Set<string>();
  if (visits.some(v => !v.future && v.specialty === 'obstetra')) done.add('primeira-consulta');
  return done;
}
