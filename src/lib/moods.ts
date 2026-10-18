import type { Checkin, Mood } from '../hooks/useGestationData';
import type { Author } from '../types';

// Os humores do check-in ("Como você está hoje?") e as contas do Diário → Humor.

export const MOODS: Array<{ id: Mood; mae: string; pai: string; face: string }> = [
  { id: 'otima', mae: 'Ótima', pai: 'Ótimo', face: 'M8 14c1.2 1.6 2.4 2.2 4 2.2s2.8-.6 4-2.2M9 9.5h.01M15 9.5h.01' },
  { id: 'bem', mae: 'Bem', pai: 'Bem', face: 'M9 15h6M9 9.5h.01M15 9.5h.01' },
  { id: 'cansada', mae: 'Cansada', pai: 'Cansado', face: 'M9 15.5h6M8 10h2.5M13.5 10H16' },
  { id: 'enjoada', mae: 'Enjoada', pai: 'Enjoado', face: 'M8.5 16c1-1.2 2.2-1.6 3.5-1.6s2.5.4 3.5 1.6M9 9.5h.01M15 9.5h.01' },
  { id: 'ansiosa', mae: 'Ansiosa', pai: 'Ansioso', face: 'M9 15.5c.8-.6 1.8-.9 3-.9s2.2.3 3 .9M8 8.5l2 1M16 8.5l-2 1' },
];

export const moodOf = (id: Mood) => MOODS.find(m => m.id === id)!;
export const moodLabel = (mood: Mood, role: Author) => moodOf(mood)[role === 'pai' ? 'pai' : 'mae'];

/** Humores que pedem atenção (não "ótima" nem "bem"). */
export const HARD_MOODS: Mood[] = ['cansada', 'enjoada', 'ansiosa'];

/** Quantos dias de cada humor uma pessoa teve no período (o mês "2026-10", por exemplo). */
export function moodCounts(checkins: Checkin[], role: Author, prefix: string): Record<Mood, number> {
  const counts = Object.fromEntries(MOODS.map(m => [m.id, 0])) as Record<Mood, number>;
  for (const c of checkins) if (c.author_role === role && c.day.startsWith(prefix)) counts[c.mood] += 1;
  return counts;
}

const shift = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Dias com esse humor numa janela de `days` dias terminando em `end` (inclusive). */
export function daysWith(checkins: Checkin[], role: Author, mood: Mood, end: string, days: number) {
  const start = shift(end, -(days - 1));
  return checkins.filter(c => c.author_role === role && c.mood === mood && c.day >= start && c.day <= end).length;
}

/**
 * O que chama atenção nas últimas duas semanas, comparando com as duas
 * anteriores ("O cansaço aumentou: 6 dias, antes 2"). Só fala quando a
 * diferença é de pelo menos 3 dias.
 */
export function moodTrends(checkins: Checkin[], role: Author, today: string) {
  const before = shift(today, -14);
  return HARD_MOODS.flatMap(mood => {
    const now = daysWith(checkins, role, mood, today, 14);
    const prev = daysWith(checkins, role, mood, before, 14);
    return now - prev >= 3 ? [{ mood, now, prev }] : [];
  });
}

/** Ansiedade em 5 ou mais dos últimos 7: hora de sugerir conversar com a equipe. */
export const needsCare = (checkins: Checkin[], role: Author, today: string) => daysWith(checkins, role, 'ansiosa', today, 7) >= 5;
