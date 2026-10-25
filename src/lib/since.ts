import type { Checkin, Hug, JournalEntry, Reaction } from '../hooks/useGestationData';
import { GROWTH, weightText } from '../content/growth';
import { parseTimestamp } from './dates';

// "Desde a última vez": quando a pessoa volta depois de algumas horas, uma
// linha no topo do Início conta o que aconteceu enquanto esteve fora, sem
// cobrança (só o que é bom de saber). A hora da última visita fica só neste
// aparelho.

const key = (userId: string) => `tumtum:inicio-visto:${userId}`;
/** Menos que isso é a mesma visita (trocar de aba, atender o telefone). */
export const SINCE_GAP_MS = 4 * 3_600_000;

// A visita anterior é lida uma vez por abertura do app: trocar de aba e voltar
// ao Início não apaga a linha que ainda não foi vista.
// As reações não têm hora: guardamos quais já existiam na última visita.
const seenKey = (userId: string) => `tumtum:inicio-reacoes:${userId}`;

export interface Visit {
  at: Date;
  /** As reações nos seus registros que já estavam lá (null se ainda não sabemos). */
  reactions: Set<string> | null;
}

const taken = new Map<string, Visit | null>();

/** A visita anterior ao Início (e marca esta). Null na primeira vez ou se foi há pouco. */
export function previousVisit(userId: string, now = new Date()): Visit | null {
  if (taken.has(userId)) return taken.get(userId)!;
  let prev: Date | null = null;
  let reactions: Set<string> | null = null;
  try {
    const v = localStorage.getItem(key(userId));
    prev = v ? new Date(v) : null;
    const r = localStorage.getItem(seenKey(userId));
    reactions = r ? new Set(JSON.parse(r) as string[]) : null;
    localStorage.setItem(key(userId), now.toISOString());
  } catch {
    // Sem armazenamento: a linha só não aparece.
  }
  const shown = prev && !Number.isNaN(prev.getTime()) && now.getTime() - prev.getTime() >= SINCE_GAP_MS ? { at: prev, reactions } : null;
  taken.set(userId, shown);
  return shown;
}

export const reactionKey = (r: Reaction) => `${r.target_id}:${r.author_role}:${r.author_id ?? ''}:${r.kind}`;

/** Guarda as reações que esta pessoa já viu (para a próxima volta). */
export function rememberReactions(userId: string, reactions: Reaction[]) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(reactions.map(reactionKey)));
  } catch {
    // ignora
  }
}

/** A linha já foi vista (tocada ou fechada): some até a próxima volta. */
export function dismissSince(userId: string) {
  taken.set(userId, null);
}

/** O app voltou do segundo plano depois de muito tempo: conta como uma nova volta. */
export function resumeVisit(userId: string, now = new Date()) {
  try {
    const v = localStorage.getItem(key(userId));
    if (v && now.getTime() - new Date(v).getTime() >= SINCE_GAP_MS) taken.delete(userId);
  } catch {
    // ignora
  }
}

/** Peso médio do bebê num dia da gestação (entre as fases da tabela, em linha reta). */
export function weightOnDay(dayOfPregnancy: number) {
  const week = (dayOfPregnancy - 1) / 7;
  const next = GROWTH.findIndex(s => s.week > week);
  if (next <= 0) return next === 0 ? GROWTH[0].weightG : GROWTH[GROWTH.length - 1].weightG;
  const a = GROWTH[next - 1];
  const b = GROWTH[next];
  return a.weightG + ((b.weightG - a.weightG) * (week - a.week)) / (b.week - a.week);
}

export interface SinceInput {
  since: Date;
  /** As reações que já estavam lá na última visita. */
  seenReactions: Set<string> | null;
  now?: Date;
  dumDate: string;
  partnerName: string | null;
  journal: JournalEntry[];
  checkins: Checkin[];
  hugs: Hug[];
  reactions: Reaction[];
  /** Quem reagiu, como aparece na linha ("Caio", "a vovó"). */
  reactor: (r: Reaction) => string;
}

const VERB: Record<Reaction['kind'], string> = { abraco: 'abraçou', forca: 'mandou força em', aqui: 'deixou um "estou aqui" em', festa: 'comemorou' };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const dayOf = (dum: string, at: Date) => Math.floor((at.getTime() - new Date(`${dum}T00:00:00`).getTime()) / 86_400_000) + 1;

/** As partes da linha (até quatro), na ordem: o bebê, a outra pessoa, as reações. */
export function sinceParts(i: SinceInput): string[] {
  const now = i.now ?? new Date();
  const after = (iso: string | undefined | null) => !!iso && parseTimestamp(iso) > i.since;
  const sinceDay = i.since.toLocaleDateString('en-CA');
  const parts: string[] = [];

  const grew = Math.round(weightOnDay(dayOf(i.dumDate, now)) - weightOnDay(dayOf(i.dumDate, i.since)));
  if (grew >= 5) parts.push(`o bebê ganhou cerca de ${weightText(grew)}`);

  const who = i.partnerName ?? 'Quem está com você';
  const theirs = i.journal.filter(e => !e.mine && e.visibility !== 'private' && after(e.created_at));
  if (theirs.length) parts.push(`${who} guardou ${plural(theirs.length, 'lembrança', 'lembranças')}`);
  else if (i.checkins.some(c => !c.mine && c.day >= sinceDay)) parts.push(`${who} contou como está`);
  const hugs = i.hugs.filter(h => h.toMe && h.day >= sinceDay).length;
  if (hugs) parts.push(hugs === 1 ? `${who} mandou um abraço` : `${who} mandou ${hugs} abraços`);

  // Quem reagiu ao que você guardou: as reações que ainda não estavam lá na última visita.
  const mine = new Map(i.journal.filter(e => e.mine).map(e => [e.id, e]));
  const news = i.seenReactions ? i.reactions.filter(r => !r.mine && r.target_type === 'entry' && mine.has(r.target_id) && !i.seenReactions!.has(reactionKey(r))) : [];
  if (news.length) {
    const r = news[0];
    const what = mine.get(r.target_id)!.photos.length ? 'sua foto' : 'o que você guardou';
    const people = new Set(news.map(x => i.reactor(x)));
    parts.push(people.size === 1 ? `${i.reactor(r)} ${VERB[r.kind]} ${what}` : `${plural(news.length, 'reação nova', 'reações novas')} no que você guardou`);
  }
  return parts.slice(0, 4);
}
