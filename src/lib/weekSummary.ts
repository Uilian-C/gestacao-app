import type { Checkin, JournalEntry, Mood } from '../hooks/useGestationData';
import type { Author, Consultation, PartnerTask, SymptomItem } from '../types';
import { localDay, parseLocalDate, toISODate } from './dates';

// Resumo da semana do casal (Início, no domingo e na segunda): os últimos 7
// dias contados de um jeito carinhoso e o que vem nos próximos 7.

export interface PersonWeek {
  role: Author;
  /** Dias com humor marcado (de 7). */
  days: number;
  /** O humor mais frequente da semana. */
  top: Mood | null;
}

export interface WeekSummary {
  /** Primeiro e último dia dos 7 dias contados. */
  from: string;
  to: string;
  people: PersonWeek[];
  posts: number;
  photos: number;
  appointments: number;
  symptoms: number;
  next: { appointments: number; tasks: number };
}

const shift = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** O resumo aparece no domingo (a semana que termina) e na segunda (a que passou). */
export const showsWeekSummary = (today: Date) => today.getDay() === 0 || today.getDay() === 1;

/** Os 7 dias até hoje (domingo) ou até ontem (segunda). */
export function summaryRange(today: Date): { from: string; to: string } {
  const iso = toISODate(today);
  const to = today.getDay() === 1 ? shift(iso, -1) : iso;
  return { from: shift(to, -6), to };
}

export function weekSummary(input: { today: Date; roles: Author[]; checkins: Checkin[]; journal: JournalEntry[]; consultations: Consultation[]; tasks: PartnerTask[]; symptoms: SymptomItem[] }): WeekSummary {
  const { from, to } = summaryRange(input.today);
  const inRange = (iso: string) => iso >= from && iso <= to;
  const people = input.roles.map(role => {
    const mine = input.checkins.filter(c => c.author_role === role && inRange(c.day));
    const count = new Map<Mood, number>();
    for (const c of mine) count.set(c.mood, (count.get(c.mood) ?? 0) + 1);
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { role, days: new Set(mine.map(c => c.day)).size, top };
  });
  const shared = input.journal.filter(e => e.visibility !== 'private' && inRange(e.entry_date.slice(0, 10)));
  const day = (c: Consultation) => toISODate(localDay(c.scheduled_at));
  const today = toISODate(input.today);
  const nextEnd = shift(today, 7);
  return {
    from,
    to,
    people,
    posts: shared.length,
    photos: shared.reduce((n, e) => n + e.photos.length, 0),
    appointments: input.consultations.filter(c => inRange(day(c)) && day(c) <= today).length,
    symptoms: input.symptoms.filter(s => inRange(s.log_date.slice(0, 10))).length,
    next: {
      appointments: input.consultations.filter(c => day(c) > today && day(c) <= nextEnd).length,
      tasks: input.tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) <= nextEnd).length,
    },
  };
}

/** Uma frase para abrir o resumo, conforme o quanto os dois estiveram presentes. */
export function summaryHeadline(s: WeekSummary): string {
  const both = s.people.length > 1;
  const min = Math.min(...s.people.map(p => p.days));
  const total = s.people.reduce((n, p) => n + p.days, 0);
  if (both && min >= 5) return 'Vocês estiveram presentes um para o outro quase todos os dias.';
  if (!both && total >= 5) return 'Você esteve presente quase todos os dias. Que tal convidar quem vai viver isso com você?';
  if (s.posts >= 3) return 'Uma semana cheia de momentos guardados.';
  if (total === 0 && s.posts === 0) return 'Semana corrida? Um toque no humor por dia já faz diferença.';
  // Sem um destaque, o que aconteceu de verdade (em vez de uma frase que serve para qualquer semana).
  const days = `${total} ${total === 1 ? 'dia' : 'dias'} de humor`;
  const posts = `${s.posts} ${s.posts === 1 ? 'lembrança guardada' : 'lembranças guardadas'}`;
  return total && s.posts ? `Esta semana: ${days} e ${posts}.` : total ? `Esta semana: ${days}.` : `Esta semana: ${posts}.`;
}
