import type { Checkin, EntryPhoto, ExamItem, Hug, JournalEntry, Mood, Reaction, ThreadComment } from '../hooks/useGestationData';
import type { Consultation } from '../types';
import { stageAt } from '../content/growth';
import { weekInfo } from '../content/weeks';
import { localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';
import { weekOn } from './folders';

// O livro de vocês: cada semana da gestação vira um capítulo. Sem contagem:
// a semana é comparada com a anterior ("mais emoções do que a semana
// passada"), o que aconteceu vira frase ("abraços trocados, uma ida ao
// ultrassom"), o humor dos dois entra com carinho e, quando falta algo no
// fichário, vem um convite (nunca uma cobrança). O que é "Só eu" não entra.

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
  /** A semana contada em poucas frases, sem números. */
  story: string;
  /** "Do tamanho de uma manga": o bebê naquela semana. */
  baby: string;
  /** Um convite gentil a partir do que ainda não tem no fichário (só no capítulo aberto e no que acabou de fechar). */
  nudge: string | null;
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
  /** O humor dos dois (check-in do dia). */
  checkins?: Checkin[];
}

const shift = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** "a, b e c". */
export function joinPt(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** Uma das frases, sempre a mesma para a mesma semana (para não repetir de um capítulo para o outro). */
const pick = (week: number, options: string[]) => options[week % options.length];

const VISIT = { consulta: 'uma consulta', exame: 'um exame', ultrassom: 'uma ida ao ultrassom', vacina: 'uma vacina' } as const;

/** O peso afetivo da semana: lembranças, fotos, abraços e conversas. */
const warmth = (w: { entries: number; photos: number; hugs: number; talks: number }) => w.entries * 2 + w.photos + w.hugs + w.talks;

/** O humor que mais apareceu nos dois, na semana. */
function weekMood(checkins: Checkin[], from: string, to: string): Mood | null {
  const seen = new Map<Mood, number>();
  for (const c of checkins) if (c.day >= from && c.day <= to) seen.set(c.mood, (seen.get(c.mood) ?? 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

const LIGHT: Mood[] = ['otima', 'bem'];

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
  // Da semana mais antiga para a de hoje, para comparar cada uma com a anterior.
  let prev: { entries: number; photos: number; hugs: number; talks: number; mood: Mood | null } | null = null;
  for (let week = Math.max(1, firstWeek); week <= current; week++) {
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

    const now_ = { entries: entries.length, photos, hugs, talks };
    const first = (id: string | undefined) => !!id && entries.some(e => e.id === id);
    const things: string[] = [];
    if (entries.some(e => e.folder === 'momento')) things.push(pick(week, ['um momento para guardar para sempre', 'um momento daqueles que a gente não esquece']));
    if (first(firstLetter)) things.push('a primeira carta para o bebê');
    else if (letters.length) things.push(letters.length > 1 ? 'cartas para o bebê' : 'uma carta para o bebê');
    if (first(firstBelly)) things.push('a primeira foto da barriga');
    else if (entries.some(e => e.folder === 'barriga')) things.push('a barriga registrada');
    else if (photos) things.push(photos > 1 ? 'fotos novas' : 'uma foto nova');
    if (entries.some(e => e.folder === 'ideia')) things.push('planos e ideias');
    if (visits.length === 1) things.push(VISIT[visits[0].kind ?? 'consulta']);
    else if (visits.length > 1) things.push('idas ao pré-natal');
    if (results.length) things.push('resultados de exames guardados');
    if (hugs) things.push(hugs >= 5 ? 'muitos abraços' : 'abraços trocados');
    if (talks) things.push(talks >= 5 ? 'muita conversa no Mural' : 'conversas no Mural');

    const quiet = entries.length === 0 && things.length === 0;
    const open = week === current;
    // Comparado com a semana anterior (só quando ela existe e teve algo).
    const prevWarmth = prev ? warmth(prev) : 0;
    const w = warmth(now_);
    let pace: string;
    if (open) pace = '';
    else if (!prev) pace = pick(week, ['Uma semana com histórias para contar.', 'Uma semana que ficou guardada.']);
    else if (prevWarmth === 0) pace = pick(week, ['Depois de dias quietos, uma semana cheia de histórias.', 'Depois de uma semana quieta, vocês voltaram a guardar lembranças.']);
    else if (w >= prevWarmth * 1.5 && w - prevWarmth >= 3) pace = pick(week, ['Uma semana com mais emoções do que a anterior.', 'A semana mais cheia de lembranças das últimas.', 'Vocês viveram mais coisas do que na semana passada.']);
    else if (w <= prevWarmth * 0.6) pace = pick(week, ['Uma semana mais calma que a anterior, e tudo bem.', 'Mais tranquila que a semana passada: às vezes é disso que precisamos.']);
    else pace = pick(week, ['Uma semana no ritmo de vocês.', 'Mais uma semana bonita na história de vocês.']);

    const mood = weekMood(input.checkins ?? [], from, to);
    const prevMood = prev?.mood ?? null;
    let feel = '';
    if (mood && LIGHT.includes(mood)) feel = prevMood && !LIGHT.includes(prevMood) ? 'E o coração andou mais leve do que na semana passada.' : pick(week, ['O humor andou leve.', 'Foi uma semana de sorrisos.']);
    else if (mood === 'cansada') feel = hugs ? 'O cansaço apareceu, e vocês cuidaram um do outro.' : 'O cansaço apareceu: que a próxima traga descanso.';
    else if (mood === 'enjoada') feel = 'Teve enjoo pelo caminho, e também muito carinho.';
    else if (mood === 'ansiosa') feel = 'Teve ansiedade no caminho; dividir com quem a gente ama alivia.';

    let story: string;
    if (quiet) story = open ? 'Um capítulo novinho, esperando a primeira lembrança.' : 'Uma semana quieta. Às vezes o melhor é só viver.';
    else {
      const had = things.length ? `${open ? 'Até agora teve' : 'Teve'} ${joinPt(things)}.` : '';
      story = [pace, had, feel].filter(Boolean).join(' ');
    }

    // Um convite gentil a partir do que ainda falta no fichário (até esta semana).
    const upTo = shared.filter(e => weekOfEntry(e) <= week);
    const nudges: string[] = [];
    if (!upTo.some(e => e.folder === 'ideia')) nudges.push('Ainda não guardaram nenhuma ideia para o quarto ou o enxoval. Que tal começar nesta semana?');
    if (!upTo.some(e => e.folder === 'carta')) nudges.push('A primeira carta para o bebê ainda está esperando por vocês.');
    const lastBelly = Math.max(-1, ...upTo.filter(e => e.folder === 'barriga').map(weekOfEntry));
    if (week >= 12 && week - lastBelly >= 3) nudges.push(lastBelly < 0 ? 'A barriga ainda não apareceu no livro. Uma foto de lado já é um começo lindo.' : 'Faz um tempinho que a barriga não sai na foto.');
    const nudge = nudges.length ? pick(week, nudges) : null;
    prev = { ...now_, mood };

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
      baby: `Do tamanho de ${weekInfo(Math.min(42, Math.max(4, week))).fruit}`,
      nudge,
      quiet,
      open,
    });
  }
  // Do mais novo para o mais antigo.
  return chapters.reverse();
}

/** O capítulo que acabou de fechar aparece no Mural nos três primeiros dias da semana seguinte. */
export function freshChapter(book: Chapter[], dumDate: string, today: Date): Chapter | null {
  const todayIso = toISODate(today);
  const day = Math.round((parseLocalDate(todayIso).getTime() - parseLocalDate(dumDate).getTime()) / 86_400_000) % 7;
  if (day > 2) return null;
  const last = book.find(c => !c.open);
  return last && !last.quiet && last.week === weekOn(dumDate, todayIso) - 1 ? last : null;
}
