import type { JournalEntry } from '../hooks/useGestationData';
import { specialtyOf } from '../data/specialties';
import type { Consultation, PartnerTask } from '../types';
import { daysBetween, isOverdue, localDay, parseLocalDate, parseTimestamp } from './dates';
import { FOLDER } from './folders';
import { windowText, type Step } from './journey';

// Faixa "Hoje" do Início: o que pede atenção agora, em cartões pequenos que
// deslizam para o lado. Cada cartão tem o tom do assunto (o mesmo da aba dele).

export type TodayTone = 'rosa' | 'azul' | 'verde' | 'coral';

export type TodayAction =
  | { kind: 'resumo'; consultation: Consultation }
  | { kind: 'exame'; planItem: string }
  | { kind: 'feito'; planItem: string }
  | { kind: 'concluir'; task: PartnerTask }
  | { kind: 'diario' };

export interface TodayCard {
  id: string;
  tone: TodayTone;
  label: string;
  title: string;
  detail: string;
  action?: { label: string; do: TodayAction };
}

const when = (days: number) => (days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`);
const WHO: Record<string, string> = { mae: 'Mãe', pai: 'Pai', casal: 'Casal' };
const KIND: Record<string, [string, string]> = { exame: ['Exame', 'atrasado'], vacina: ['Vacina', 'atrasada'], consulta: ['Consulta', 'atrasada'], preparo: ['Preparo', 'atrasado'] };

export function todayCards(input: {
  today: Date;
  dumDate: string;
  /** Lembretes dos momentos (aparecem até 30 dias antes). */
  reminders: JournalEntry[];
  nextConsultation: Consultation | null;
  steps: Step[];
  tasks: PartnerTask[];
  currentWeek: number;
  moments: JournalEntry[];
  /** Itens da jornada que já têm exame guardado. */
  savedExams: Set<string>;
}): TodayCard[] {
  const { today } = input;
  const cards: TodayCard[] = [];

  for (const r of input.reminders) {
    const days = daysBetween(today, parseLocalDate(r.remind_on!));
    if (days < 0 || days > 30) continue;
    cards.push({ id: `lembrete-${r.id}`, tone: 'rosa', label: `Lembrete ${when(days)}`, title: r.body, detail: r.visibility === 'private' ? 'Só você vê' : 'Para vocês dois' });
  }

  const c = input.nextConsultation;
  if (c) {
    const days = daysBetween(today, localDay(c.scheduled_at));
    if (days >= 0 && days <= 14) {
      const at = parseTimestamp(c.scheduled_at);
      const date = at.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const time = at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      cards.push({
        id: `consulta-${c.id}`,
        tone: 'verde',
        label: `Consulta ${when(days)}`,
        title: specialtyOf(c.specialty).label,
        detail: [`${date} às ${time}`, c.professional_name].filter(Boolean).join(' · '),
        action: { label: 'Preparar resumo', do: { kind: 'resumo', consultation: c } },
      });
    }
  }

  for (const s of input.steps) {
    if (s.status !== 'pendente' && s.status !== 'agora') continue;
    const late = s.status === 'pendente';
    const exam = s.item.kind === 'exame';
    if (exam && input.savedExams.has(s.item.id)) continue;
    const [kind, lateWord] = KIND[s.item.kind];
    cards.push({
      id: `passo-${s.item.id}`,
      tone: 'verde',
      label: late ? `${kind} ${lateWord}` : `${kind} na janela`,
      title: s.item.title,
      detail: windowText(s.item, s.status, input.dumDate),
      action: exam ? { label: 'Guardar resultado', do: { kind: 'exame', planItem: s.item.id } } : { label: 'Marcar como feito', do: { kind: 'feito', planItem: s.item.id } },
    });
  }

  const open = input.tasks.filter(t => !t.is_completed);
  const late = open.filter(t => isOverdue(t.due_date, today));
  const thisWeek = open.filter(t => !isOverdue(t.due_date, today) && t.week_number === input.currentWeek);
  for (const t of [...late, ...thisWeek].slice(0, 2)) {
    const overdue = isOverdue(t.due_date, today);
    cards.push({
      id: `tarefa-${t.id}`,
      tone: 'azul',
      label: overdue ? 'Tarefa atrasada' : 'Tarefa da semana',
      title: t.task_title,
      detail: WHO[t.assigned_to] ?? 'Casal',
      action: { label: 'Marcar como feita', do: { kind: 'concluir', task: t } },
    });
  }

  // O último momento da outra pessoa, se for recente: um jeito de ver o que ela guardou.
  const moment = input.moments.find(m => !m.mine && m.visibility === 'shared' && daysBetween(parseLocalDate(m.entry_date), today) <= 7);
  if (moment) {
    const what = FOLDER[moment.folder ?? 'momento'];
    const who = moment.author_role === 'mae' ? 'da mãe' : 'do pai';
    cards.push({ id: `momento-${moment.id}`, tone: 'rosa', label: `${what.singular} ${who}`, title: moment.body || 'Uma foto nova da barriga', detail: '', action: { label: 'Ver no diário', do: { kind: 'diario' } } });
  }

  return cards;
}
