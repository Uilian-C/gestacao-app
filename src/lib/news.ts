import type { FamilyMember } from '../api';
import type { JournalEntry, ThreadComment } from '../hooks/useGestationData';
import { mentionsMe } from './mentions';
import { parseTimestamp } from './dates';

// "Novidades no Mural" do Início: o que a outra pessoa postou e comentou desde
// a última vez que você abriu o Diário. A data dessa visita fica só neste
// aparelho (é uma comodidade, não um dado do casal).

const key = (userId: string) => `tumtum:mural-visto:${userId}`;

export function lastSeen(userId: string): Date | null {
  try {
    const v = localStorage.getItem(key(userId));
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

export function markSeen(userId: string, at = new Date()) {
  try {
    localStorage.setItem(key(userId), at.toISOString());
  } catch {
    // Sem armazenamento (janela anônima): as novidades só não "somem".
  }
}

/** Sem visita guardada, vale o que chegou nos últimos 3 dias. */
export function partnerNews(journal: JournalEntry[], threads: ThreadComment[], members: FamilyMember[], since: Date | null, now = new Date()) {
  const from = since ?? new Date(now.getTime() - 3 * 86_400_000);
  const after = (iso: string | undefined) => !!iso && parseTimestamp(iso) > from;
  const entries = journal.filter(e => !e.mine && e.visibility !== 'private' && after(e.created_at));
  const comments = threads.filter(c => !c.mine && c.target_type === 'entry' && after(c.created_at));
  const mentions = entries.filter(e => mentionsMe(members, e.body)).length + comments.filter(c => mentionsMe(members, c.body)).length;
  return { entries, comments, mentions, photos: entries.flatMap(e => e.photos.map(p => ({ ...p, entryId: e.id }))).slice(0, 4) };
}
