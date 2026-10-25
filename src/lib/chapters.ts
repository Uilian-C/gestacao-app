import type { Checkin, EntryPhoto, ExamItem, Hug, JournalEntry, Mood, NameIdea, Reaction, ThreadComment } from '../hooks/useGestationData';
import type { Consultation } from '../types';
import { stageAt } from '../content/growth';
import { weekInfo } from '../content/weeks';
import { localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';
import { weekOn } from './folders';
import { gestationMonth } from './ficha';

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
  /** O humor que mais apareceu em cada um, na semana. */
  moods: Array<{ role: 'mae' | 'pai'; mood: Mood }>;
  /** Uma frase sobre o humor da semana (ou o convite para contar). */
  moodNote: string;
  /** O humor que mais apareceu nos dois (para o resumo do mês). */
  mood: Mood | null;
  /** O que aconteceu, em palavras ("uma ida ao ultrassom"), para o resumo do mês. */
  things: string[];
  /** O peso afetivo da semana (para comparar meses). */
  warmth: number;
  /** Na semana em que escolheram o nome: a página dele. */
  named: NamePage | null;
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
  /** O nome escolhido, quando e as ideias (a semana da escolha ganha a página do nome). */
  babyName?: string | null;
  babyNameAt?: string | null;
  nameIdeas?: NameIdea[] | null;
}

/** A página do nome: o nome, quando, e os nomes que fizeram parte da escolha. */
export interface NamePage {
  name: string;
  at: string;
  /** As outras ideias, das mais curtidas para as menos. */
  others: string[];
  /** O porquê do nome escolhido, se anotaram. */
  note: string | null;
  /** A família deu palpite. */
  family: boolean;
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

/** Uma frase de acolhimento para o humor que mais apareceu. */
const MOOD_NOTE: Record<Mood, string> = {
  otima: 'Dias leves. Que venham muitos assim.',
  bem: 'Dias leves. Que venham muitos assim.',
  cansada: 'O cansaço apareceu: o corpo está trabalhando por dois. Descansar também é cuidar.',
  enjoada: 'Os enjoos marcaram a semana. Cada dia vencido é uma conquista.',
  ansiosa: 'A ansiedade deu as caras. Conversar e dividir deixa o coração mais leve.',
};

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

    // A semana em que escolheram o nome ganha a página dele (e o nome entra na história).
    const chosenAt = input.babyName && input.babyNameAt ? toISODate(parseTimestamp(input.babyNameAt)) : null;
    const named: NamePage | null =
      chosenAt && weekOn(dumDate, chosenAt) === week
        ? (() => {
            const ideas = [...(input.nameIdeas ?? [])].sort((a, b) => b.likes.length - a.likes.length);
            const it = ideas.find(i => i.name.toLowerCase() === input.babyName!.toLowerCase());
            return { name: input.babyName!, at: input.babyNameAt!, others: ideas.filter(i => i !== it).map(i => i.name), note: it?.note ?? null, family: ideas.some(i => i.author_role === 'familia' || i.likes.some(l => l.author_role === 'familia')) };
          })()
        : null;
    const now_ = { entries: entries.length, photos, hugs, talks: talks + (named ? 3 : 0) };
    const first = (id: string | undefined) => !!id && entries.some(e => e.id === id);
    const things: string[] = named ? [`a escolha do nome: ${named.name}`] : [];
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
    // O humor tem lugar próprio na página: como cada um estava e uma frase sobre a variação.
    const moods = (['mae', 'pai'] as const).flatMap(role => {
      const top = weekMood((input.checkins ?? []).filter(c => c.author_role === role), from, to);
      return top ? [{ role, mood: top }] : [];
    });
    let moodNote: string;
    if (!mood) moodNote = open ? 'Como vocês estão nesta semana? Um toque no humor, no Início, já entra nesta página.' : 'Ninguém contou como estava nesta semana. Um toque no humor, no Início, deixa as próximas páginas mais vivas.';
    else if (LIGHT.includes(mood) && prevMood && !LIGHT.includes(prevMood)) moodNote = 'O coração ficou mais leve do que na semana passada.';
    else if (!LIGHT.includes(mood) && prevMood && LIGHT.includes(prevMood)) moodNote = 'Uma semana mais pesada que a anterior. Cuidem um do outro: vai passar.';
    else moodNote = MOOD_NOTE[mood];
    let story: string;
    if (quiet) story = open ? 'Um capítulo novinho, esperando a primeira lembrança.' : 'Uma semana quieta. Às vezes o melhor é só viver.';
    else {
      const had = things.length ? `${open ? 'Até agora teve' : 'Teve'} ${joinPt(things)}.` : '';
      story = [pace, had].filter(Boolean).join(' ');
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
      title: named ? `O dia em que escolhemos ${named.name}` : moment ? quoteOf(moment.body) : stageAt(Math.max(4, week)).title,
      personal: !named && !!moment,
      named,
      entries,
      cover: withPhoto ? { entryId: withPhoto.id, photo: withPhoto.photos[0] } : null,
      highlight: top ? { entryId: top.id, quote: quoteOf(top.body), hugged: hugsOn(top.id) > 0 } : null,
      story,
      baby: `Do tamanho de ${weekInfo(Math.min(42, Math.max(4, week))).fruit}`,
      nudge,
      things,
      warmth: w,
      moods,
      moodNote,
      mood,
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

// ---- O livro por meses: cada mês é um capítulo; cada semana, uma página ----

export interface MonthChapter {
  month: number;
  /** "O quinto mês". */
  name: string;
  /** Um nome carinhoso para o mês. */
  title: string;
  /** As páginas (semanas), da mais antiga para a mais nova. */
  pages: Chapter[];
  cover: Chapter['cover'];
  story: string;
  /** Como o humor andou no mês (vazio quando não dá para dizer). */
  moodArc: string;
  quiet: boolean;
  open: boolean;
}

const ORDINAL = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono'];
const MONTH_TITLE = ['', 'O começo de tudo', 'Um coraçãozinho batendo', 'Adeus, primeiro trimestre', 'Ganhando forma', 'Os primeiros chutinhos', 'Ouvindo a voz de vocês', 'Abrindo os olhinhos', 'Ganhando dobrinhas', 'Quase no colo'];

/** Agrupa as semanas em meses da gestação, do mês mais novo para o mais antigo. */
export function bookMonths(book: Chapter[]): MonthChapter[] {
  const byMonth = new Map<number, Chapter[]>();
  for (const c of [...book].reverse()) {
    const m = gestationMonth(Math.max(1, c.week));
    byMonth.set(m, [...(byMonth.get(m) ?? []), c]);
  }
  const months: MonthChapter[] = [];
  let prevWarmth: number | null = null;
  for (const [month, pages] of [...byMonth.entries()].sort((a, b) => a[0] - b[0])) {
    const open = pages.some(p => p.open);
    const quiet = pages.every(p => p.quiet);
    const warmth = pages.reduce((n, p) => n + p.warmth, 0);
    const things = [...new Set(pages.flatMap(p => p.things))].slice(0, 3);
    const best = [...pages].sort((a, b) => b.warmth - a.warmth)[0];
    let pace: string;
    if (quiet) pace = open ? 'Um capítulo novinho, esperando as primeiras lembranças.' : 'Um mês quieto. Às vezes o melhor é só viver.';
    else if (open) pace = 'Este capítulo ainda está sendo escrito.';
    else if (prevWarmth === null || prevWarmth === 0) pace = pick(month, ['Um mês cheio de histórias.', 'Um mês para guardar no coração.']);
    else if (warmth >= prevWarmth * 1.4) pace = pick(month, ['Um mês com mais emoções do que o anterior.', 'O mês mais cheio de lembranças até aqui.']);
    else if (warmth <= prevWarmth * 0.6) pace = 'Um mês mais tranquilo que o anterior, e tudo bem.';
    else pace = pick(month, ['Mais um mês bonito na história de vocês.', 'Um mês no ritmo de vocês.']);
    const had = !quiet && things.length ? `Teve ${joinPt(things)}.` : '';
    const felt = pages.filter(p => p.mood);
    const firstMood = felt[0]?.mood ?? null;
    const lastMood = felt[felt.length - 1]?.mood ?? null;
    let moodArc = '';
    if (felt.length >= 2 && firstMood && lastMood) {
      if (!LIGHT.includes(firstMood) && LIGHT.includes(lastMood)) moodArc = 'Um mês que começou mais pesado e terminou mais leve.';
      else if (LIGHT.includes(firstMood) && !LIGHT.includes(lastMood)) moodArc = 'Um mês que pediu mais colo no final.';
      else if (felt.every(p => LIGHT.includes(p.mood!))) moodArc = 'Um mês de coração leve.';
    }
    months.push({
      month,
      name: `O ${ORDINAL[month] ?? `${month}º`} mês`,
      title: MONTH_TITLE[month] ?? 'Quase no colo',
      pages,
      cover: [...pages].reverse().find(p => p.cover)?.cover ?? null,
      story: [pace, had].filter(Boolean).join(' ') || (best?.story ?? ''),
      moodArc,
      quiet,
      open,
    });
    prevWarmth = warmth;
  }
  return months.reverse();
}

/** "Capítulo 5 · Os primeiros chutinhos": o capítulo em que uma semana do livro está. */
export function chapterOfWeek(book: Chapter[], week: number): string | null {
  const m = bookMonths(book).find(x => x.pages.some(p => p.week === week));
  return m ? `Capítulo ${m.month} · ${m.title}` : null;
}
