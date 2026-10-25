import type { JournalEntry } from '../hooks/useGestationData';
import { FIRST_TIMES, type FirstTime } from '../content/firstTimes';

export interface FirstTimeCard {
  ft: FirstTime;
  /** O registro que guardou essa primeira vez (o mais antigo). */
  entry: JournalEntry | null;
  /** Marcado pelo que o casal já fez no app, mesmo sem uma lembrança escrita. */
  auto: boolean;
  done: boolean;
}

/**
 * O álbum das primeiras vezes: as que têm registro, as que o app já sabe que
 * aconteceram (o cadastro, o nome escolhido, a primeira foto da barriga) e as
 * que ainda esperam.
 */
export function firstTimesAlbum(journal: JournalEntry[], babyName: string | null): FirstTimeCard[] {
  const byOld = [...journal].sort((a, b) => (a.entry_date + a.created_at).localeCompare(b.entry_date + b.created_at));
  return FIRST_TIMES.map(ft => {
    const marked = byOld.find(e => e.first_time === ft.id) ?? (ft.id === 'barriga' ? byOld.find(e => e.folder === 'barriga') : undefined) ?? null;
    const auto = !marked && (ft.id === 'descoberta' || (ft.id === 'nome' && !!babyName));
    return { ft, entry: marked, auto, done: !!marked || auto };
  });
}

/** A próxima a guardar: a primeira pendente que já costuma ter acontecido nesta semana. */
export function nextFirstTime(cards: FirstTimeCard[], week: number) {
  return cards.find(c => !c.done && c.ft.from <= week) ?? cards.find(c => !c.done) ?? null;
}
