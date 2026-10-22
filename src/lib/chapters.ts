import type { EntryPhoto, ExamItem, Hug, JournalEntry, Reaction, ThreadComment } from '../hooks/useGestationData';
import type { Consultation } from '../types';
import { stageAt } from '../content/growth';
import { localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';
import { weekOn } from './folders';

// O livro de vocês: cada semana da gestação vira um capítulo. Os números viram
// frases ("trocaram sete abraços"), o ponto alto ganha destaque e uma semana
// sem registros é só "uma semana quieta", nunca uma cobrança. O que é "Só eu"
// não entra no livro do casal.

export interface Chapter {
  week: number;
  /** Primeiro e último dia da semana da gestação. */
  from: string;
  to: string;
  /** O momento mais marcante da semana, nas palavras de vocês (ou o nome carinhoso da fase do bebê). */
  title: string;
  /** O título veio de uma lembrança de vocês. */
  personal: boolean;
  entries: JournalEntry[];
  /** A foto mais abraçada (ou a mais recente) da semana. */
  cover: { entryId: string; photo: EntryPhoto } | null;
  /** O registro mais abraçado, com um trecho para citar. */
  highlight: { entryId: string; quote: string; hugged: boolean } | null;
  /** A semana contada em uma ou duas frases. */
  story: string;
  quiet: boolean;
  /** A semana de hoje: o capítulo ainda está sendo escrito. */
  open: boolean;
}

export interface BookInput {
  dumDate: string;
  today: Date;
  journal: JournalEntry[];
  reactions: Reaction[];
  threads: ThreadComment[];
  hugs: Hug[];
  consultations: Consultation[];
  exams: ExamItem[];
}

const shift = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

const FEM = ['nenhuma', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
const MASC = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];

/** "uma lembrança", "sete abraços", "12 fotos". */
export function count(n: number, one: string, many: string, fem: boolean) {
  const word = n <= 10 ? (fem ? FEM : MASC)[n] : String(n);
  return `${word} ${n === 1 ? one : many}`;
}

/** "a, b e c". */
export function joinPt(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

const KIND_ONE = { consulta: 'uma consulta', exame: 'um exame', ultrassom: 'um ultrassom', vacina: 'uma vacina' } as const;

/** Um trecho do texto para citar: a primeira frase, sem passar de ~90 letras. */
function quoteOf(body: string) {
  const clean = body.replace(/@\S+/g, '').replace(/\s+/g, ' ').trim();
  const first = clean.split(/(?<=[.!?])\s/)[0];
  return first.length > 90 ? `${first.slice(0, 87).trimEnd()}…` : first;
}

export function buildBook(input: BookInput): Chapter[] {
  const { dumDate } = input;
  const todayIso = toISODate(input.today);
  const current = weekOn(dumDate, todayIso);
  const shared = input.journal.filter(e => e.visibility !== 'private');
  const weekOfEntry = (e: JournalEntry) => weekOn(dumDate, e.entry_date.slice(0, 10));
  const firstWeek = Math.min(current, ...shared.map(weekOfEntry));
  const hugsOn = (id: string) => input.reactions.filter(r => r.target_type === 'entry' && r.target_id === id).length;
  const talksOn = (id: string) => input.threads.filter(c => c.target_type === 'entry' && c.target_id === id).length;
  // Primeiras vezes: a primeira carta e a primeira foto da barriga de toda a gestação.
  const firstOf = (folder: JournalEntry['folder']) =>
    [...shared].filter(e => e.folder === folder && (folder !== 'barriga' || e.photos.length > 0)).sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.created_at.localeCompare(b.created_at))[0]?.id;
  const firstLetter = firstOf('carta');
  const firstBelly = firstOf('barriga');

  const chapters: Chapter[] = [];
  for (let week = current; week >= Math.max(1, firstWeek); week--) {
    const from = shift(dumDate, week * 7);
    const to = shift(from, 6);
    const inWeek = (iso: string) => iso >= from && iso <= to;
    const entries = shared.filter(e => weekOfEntry(e) === week).sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at));
    const score = (e: JournalEntry) => hugsOn(e.id) * 2 + talksOn(e.id);
    const ranked = [...entries].sort((a, b) => score(b) - score(a));
    const withPhoto = ranked.find(e => e.photos.length > 0);
    // O título é o momento mais abraçado, nas palavras de vocês; o destaque, a próxima lembrança.
    const moment = ranked.find(e => e.folder === 'momento' && e.body.trim() !== '' && quoteOf(e.body).length <= 70);
    const top = ranked.find(e => e.body.trim() !== '' && e.id !== moment?.id);

    const photos = entries.reduce((n, e) => n + e.photos.length, 0);
    const hugs = entries.reduce((n, e) => n + hugsOn(e.id), 0) + input.hugs.filter(h => inWeek(h.day)).length;
    const talks = entries.reduce((n, e) => n + talksOn(e.id), 0);
    const now = input.today.getTime();
    const visits = input.consultations.filter(c => inWeek(toISODate(localDay(c.scheduled_at))) && parseTimestamp(c.scheduled_at).getTime() <= now);
    const results = input.exams.filter(x => x.visibility !== 'private' && inWeek(x.exam_date.slice(0, 10)));
    const letters = entries.filter(e => e.folder === 'carta');

    const acts: string[] = [];
    if (hugs) acts.push(`trocaram ${count(hugs, 'abraço', 'abraços', false)}`);
    if (talks) acts.push(`deixaram ${count(talks, 'comentário', 'comentários', false)}`);
    if (visits.length === 1) acts.push(`foram a ${KIND_ONE[visits[0].kind ?? 'consulta']}`);
    else if (visits.length > 1) acts.push(`foram a ${count(visits.length, 'compromisso', 'compromissos', false)} do pré-natal`);
    if (results.length) acts.push(`guardaram ${count(results.length, 'resultado de exame', 'resultados de exames', false)}`);
    if (firstLetter && letters.some(e => e.id === firstLetter)) acts.push('escreveram a primeira carta para o bebê');
    else if (letters.length) acts.push(`escreveram ${count(letters.length, 'carta', 'cartas', true)} para o bebê`);
    if (firstBelly && entries.some(e => e.id === firstBelly)) acts.push('tiraram a primeira foto da barriga');

    const quiet = entries.length === 0 && acts.length === 0;
    const open = week === current;
    let story: string;
    if (quiet) story = open ? 'Um capítulo novinho, esperando a primeira lembrança.' : 'Uma semana quieta. Às vezes o melhor é só viver.';
    else {
      const head = entries.length
        ? `${open ? 'Até agora, ' : 'Uma semana de '}${count(entries.length, 'lembrança', 'lembranças', true)}${photos ? ` e ${count(photos, 'foto', 'fotos', true)}` : ''}.`
        : '';
      const body = acts.length ? `Vocês ${joinPt(acts)}.` : '';
      story = [head, body].filter(Boolean).join(' ');
    }

    chapters.push({
      week,
      from,
      to,
      title: moment ? quoteOf(moment.body) : stageAt(Math.max(4, week)).title,
      personal: !!moment,
      entries,
      cover: withPhoto ? { entryId: withPhoto.id, photo: withPhoto.photos[0] } : null,
      highlight: top ? { entryId: top.id, quote: quoteOf(top.body), hugged: hugsOn(top.id) > 0 } : null,
      story,
      quiet,
      open,
    });
  }
  return chapters;
}

/** O capítulo que acabou de fechar aparece no Mural nos três primeiros dias da semana seguinte. */
export function freshChapter(book: Chapter[], dumDate: string, today: Date): Chapter | null {
  const todayIso = toISODate(today);
  const day = Math.round((parseLocalDate(todayIso).getTime() - parseLocalDate(dumDate).getTime()) / 86_400_000) % 7;
  if (day > 2) return null;
  const last = book.find(c => !c.open);
  return last && !last.quiet && last.week === weekOn(dumDate, todayIso) - 1 ? last : null;
}
