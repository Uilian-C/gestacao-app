import type { JournalEntry } from '../hooks/useGestationData';
import { firstTimeOf } from '../content/firstTimes';
import { bellyCard, letterCard, memoryCard } from './shareCard';
import type { ShareRequest } from '../components/ShareSheet';

// Qual cartão cada lembrança vira: a barriga (com a primeira foto ao lado), a
// carta (um trecho assinado), a primeira vez (o marco) ou a lembrança (a foto
// e a frase de quem escreveu).

export interface EntryShareContext {
  author: string;
  week: number;
  /** "1 nov". */
  date: string;
  /** O endereço da foto inteira. */
  photo: (p: JournalEntry['photos'][number]) => string;
  /** A primeira foto da barriga do casal, para o "antes e agora". */
  firstBelly: { week: number; photo: string } | null;
  babyName: string | null;
}

/** Pode virar cartão? Precisa de uma frase ou de uma foto (vídeo sozinho não vira imagem). */
export const canShareEntry = (e: JournalEntry) => !!e.body.trim() || e.photos.some(p => !p.video || p.thumb);

export function entryShare(e: JournalEntry, c: EntryShareContext): ShareRequest {
  const still = e.photos.find(p => !p.video) ?? e.photos.find(p => p.thumb);
  const photo = still ? c.photo(still) : null;
  if (e.folder === 'barriga' && photo) {
    return { kind: 'cartao_barriga', fileName: `tumtum-barriga-semana-${c.week}`, card: bellyCard({ week: c.week, photo, first: c.firstBelly, caption: e.body, babyName: c.babyName }) };
  }
  if (e.folder === 'carta' && e.body.trim()) {
    return { kind: 'cartao_carta', fileName: 'tumtum-carta', card: letterCard({ body: e.body, role: e.author_role, babyName: c.babyName, week: c.week }) };
  }
  const first = firstTimeOf(e.first_time);
  return {
    kind: first ? 'cartao_primeira_vez' : 'cartao_momento',
    fileName: first ? `tumtum-primeira-vez-${first.id}` : `tumtum-semana-${c.week}`,
    card: memoryCard({ body: e.body, author: c.author, week: c.week, date: c.date, photo, firstTime: first?.title ?? null, babyName: c.babyName }),
  };
}
