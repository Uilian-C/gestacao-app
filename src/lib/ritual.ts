import type { Checkin, JournalEntry } from '../hooks/useGestationData';
import { parseTimestamp, toISODate } from './dates';

// "O Tumtum de hoje": o ritual da noite. Um minuto para fechar o dia (o humor e
// uma frase), que vira a página do dia no livro. A partir das 18h, o Início
// convida; às 21h, um aviso chega para quem ainda não fechou.

export const RITUAL_FROM_HOUR = 18;

const key = (userId: string, day: string) => `tumtum:ritual:${userId}:${day}`;

export function markClosed(userId: string, day: string) {
  try {
    localStorage.setItem(key(userId, day), '1');
  } catch {
    /* sem armazenamento: o registro do dia já conta */
  }
}

const wroteToday = (e: JournalEntry, day: string) => e.folder === 'dia' && (e.entry_date === day || (!!e.created_at && toISODate(parseTimestamp(e.created_at)) === day));

/** Já fechei o dia? (neste aparelho, ou porque já escrevi no Dia a dia hoje) */
export function dayClosed(userId: string, day: string, journal: JournalEntry[]): boolean {
  try {
    if (localStorage.getItem(key(userId, day))) return true;
  } catch {
    /* sem armazenamento: vale o diário */
  }
  return journal.some(e => e.mine && wroteToday(e, day));
}

/** O que a outra pessoa contou hoje: o humor e a frase do dia, se houver. */
export function partnerDay(checkins: Checkin[], journal: JournalEntry[], day: string) {
  const mood = checkins.find(c => !c.mine && c.day === day)?.mood ?? null;
  const phrase = journal.find(e => !e.mine && e.visibility !== 'private' && wroteToday(e, day))?.body.trim().split('\n')[0] ?? null;
  return mood || phrase ? { mood, phrase } : null;
}
