import { useContext, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Heart, List, PenLine, Printer, X } from 'lucide-react';
import { photoUrl } from '../api';
import type { BabyTone } from '../content/babyTones';
import { stageAt } from '../content/growth';
import type { JournalEntry } from '../hooks/useGestationData';
import { BabyNameContext, babyCall } from '../lib/baby';
import { bookMonths, type Chapter, type MonthChapter } from '../lib/chapters';
import { formatBR, hhmmOf, parseLocalDate, parseTimestamp, toISODate } from '../lib/dates';
import { FOLDER, shortDate } from '../lib/folders';
import { MOOD_COLOR, moodLabel, moodOf } from '../lib/moods';
import { PeopleContext, firstName } from '../lib/people';
import BabyArt from './BabyArt';
import { VoiceQuote } from './SecondVoice';
import { FirstTimeBadge } from './FirstTimes';
import BrandMark from './BrandMark';
import { useScrollLock } from '../hooks/useScrollLock';
import MoodFace from './MoodFace';

// O livro de vocês: cada mês da gestação é um capítulo e cada semana, uma
// página, contada como história (sem contagem), com o bebê daquela semana e o
// humor dos dois. No Diário → Livro: a capa (um livro de verdade, com lombada e
// fitinha marcando onde pararam) abre o leitor; o sumário leva a um capítulo; e
// a impressão para o fichário de memórias, só com as páginas escolhidas.

/** "16 a 22 out". */
const span = (c: Chapter) => `${parseLocalDate(c.from).getDate()} a ${shortDate(c.to)}`;
const titleOf = (c: Chapter) => (c.personal ? `“${c.title}”` : c.title);
const artWeek = (week: number) => Math.min(40, Math.max(4, week));

/** "Momento · 17/10/2026 às 14:32" (a hora só quando foi postado no próprio dia). */
function stamp(e: JournalEntry) {
  const day = e.entry_date.slice(0, 10);
  const sameDay = !!e.created_at && toISODate(parseTimestamp(e.created_at)) === day;
  return `${FOLDER[e.folder].singular} · ${formatBR(day)}${sameDay ? ` às ${hhmmOf(e.created_at)}` : ''}`;
}

/** Como cada um estava na semana (as carinhas do check-in) e uma frase sobre a variação, ou o convite para contar. */
function MoodOfWeek({ chapter: c }: { chapter: Chapter }) {
  const people = useContext(PeopleContext);
  return (
    <div className="rounded-2xl border border-line px-3.5 py-2.5 space-y-1.5" aria-label="O humor da semana">
      {c.moods.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {c.moods.map(m => {
            const who = people.find(p => p.role === m.role);
            return (
              <span key={m.role} className={`inline-flex items-center gap-1.5 text-[13px] font-bold ${MOOD_COLOR[m.mood].text}`}>
                <MoodFace path={moodOf(m.mood).face} className="w-5 h-5" />
                <span className="text-ink">
                  {who ? firstName(who.name) : m.role === 'mae' ? 'Mãe' : 'Pai'}: {moodLabel(m.mood, m.role).toLowerCase()}
                </span>
              </span>
            );
          })}
        </div>
      )}
      <p className="text-[13.5px] italic leading-snug text-ink-soft">{c.moodNote}</p>
      {c.together && (
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-rosa-strong">
          <Heart className="w-3.5 h-3.5 fill-current" aria-hidden /> Uma semana inteira contando um ao outro como estavam.
        </p>
      )}
    </div>
  );
}

/** Fotos inteiras, sem cortar: uma grande, ou duas por linha no tamanho de cada uma. */
function BookPhotos({ photos }: { photos: JournalEntry['photos'] }) {
  if (photos.length === 0) return null;
  if (photos.length === 1) return <img src={photoUrl(photos[0].id)} alt="" className="tt-livro-foto block mx-auto w-auto max-w-full h-auto max-h-[70vh] rounded-2xl" />;
  return (
    <span className="grid grid-cols-2 gap-2 items-start">
      {photos.map(p => (
        <img key={p.id} src={photoUrl(p.id)} alt="" className="tt-livro-foto block w-full h-auto rounded-xl" />
      ))}
    </span>
  );
}

/** A abertura de um capítulo (um mês): o bebê no fim do mês, o nome do capítulo, o resumo e o humor do mês. */
function MonthOpening({ month: m, tone, print = false }: { month: MonthChapter; tone: BabyTone; print?: boolean }) {
  const name = useContext(BabyNameContext);
  const last = m.pages[m.pages.length - 1];
  return (
    <section className={`tt-livro-abertura flex flex-col items-center justify-center text-center gap-3 ${print ? 'py-16' : 'min-h-full py-6'}`}>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-rosa">Capítulo {m.month}</p>
      <h2 className="font-display text-[2rem] leading-tight text-ink">{m.title}</h2>
      <p className="text-[14px] text-ink-soft">
        {m.name} {name ? `de ${name}` : 'da gestação'}
      </p>
      <BabyArt week={artWeek(last?.week ?? 4)} tone={tone} className="w-44 h-44" />
      {m.cover && <img src={photoUrl(m.cover.photo.id)} alt="" className="tt-livro-foto block mx-auto w-auto max-w-full h-auto max-h-[40vh] rounded-2xl" />}
      <p className="font-display text-[1.1rem] leading-relaxed text-ink max-w-[440px]">{m.story}</p>
      {m.moodArc && <p className="text-[14px] italic text-ink-soft max-w-[440px]">{m.moodArc}</p>}
    </section>
  );
}

/** Uma semana: o bebê, a história, o humor, a foto e tudo o que vocês escreveram (com data e hora), inteiro. */
function WeekPage({ chapter: c, tone, onOpenEntry }: { chapter: Chapter; tone: BabyTone; onOpenEntry?: (id: string) => void }) {
  return (
    <section className="tt-livro-semana space-y-4">
      <header className="flex items-center gap-4">
        <BabyArt week={artWeek(c.week)} tone={tone} className="w-20 h-20 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">
            Semana {c.week} · {c.open ? 'sendo escrita' : span(c)}
            {c.together && <Heart className="inline w-3 h-3 ml-1 -mt-0.5 fill-current" aria-label="semana inteira juntos" />}
          </p>
          <h3 className="font-display text-[1.45rem] leading-tight text-ink text-balance">{titleOf(c)}</h3>
          <p className="text-[12.5px] text-ink-soft">
            {c.baby} · {stageAt(artWeek(c.week)).title}
          </p>
        </div>
      </header>
      <p className="text-[16px] leading-relaxed text-ink">{c.story}</p>
      <MoodOfWeek chapter={c} />
      {[...c.entries].reverse().map(e => {
        const Wrap = onOpenEntry ? 'button' : 'div';
        return (
          <Wrap key={e.id} {...(onOpenEntry ? { type: 'button' as const, onClick: () => onOpenEntry(e.id), 'aria-label': `${FOLDER[e.folder].singular}: abrir` } : {})} className="tt-livro-registro block w-full text-left space-y-2 border-t border-line pt-3">
            <span className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-mute">{stamp(e)}</span>
            {e.first_time && <FirstTimeBadge id={e.first_time} />}
            {e.body && <span className={`block text-[16px] leading-relaxed text-ink whitespace-pre-line ${e.folder === 'carta' || e.folder === 'momento' ? 'font-display text-[1.12rem]' : ''}`}>{e.body}</span>}
            <BookPhotos photos={e.photos} />
            <VoiceQuote entry={e} />
          </Wrap>
        );
      })}
    </section>
  );
}

/** A página do nome: o coração do Tumtum, o nome, o dia, o porquê e os nomes que fizeram parte da escolha. */
function NamePageView({ page: n, tone, week }: { page: NonNullable<Chapter['named']>; tone: BabyTone; week: number }) {
  const when = parseTimestamp(n.at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="tt-livro-nome flex flex-col items-center justify-center text-center gap-3 py-8" aria-label={`A página do nome: ${n.name}`}>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-rosa">A página do nome</p>
      <div className="relative">
        <BrandMark className="w-36 h-36" />
        <BabyArt week={artWeek(week)} tone={tone} className="absolute inset-0 m-auto w-20 h-20" />
      </div>
      <p className="font-display text-[3rem] leading-none text-ink">{n.name}</p>
      <p className="text-[14px] text-ink-soft">Escolhido em {when}, na semana {week}.</p>
      {n.note && <p className="font-display text-[1.15rem] italic leading-snug text-ink max-w-[420px]">“{n.note}”</p>}
      {n.others.length > 0 && (
        <p className="text-[14.5px] leading-relaxed text-ink-soft max-w-[420px]">
          Antes dele, vocês pensaram em {n.others.length === 1 ? n.others[0] : `${n.others.slice(0, -1).join(', ')} e ${n.others[n.others.length - 1]}`}.{n.family ? ' A família também deu palpite.' : ''}
        </p>
      )}
    </section>
  );
}

// ---- Diário → Livro ----

const FIRST = 4;
const LAST = 40;
const PRINTED_KEY = 'tumtum-livro-impresso';
const READING_KEY = 'tumtum-livro-lendo';
/** A última página nova que já foi lida (a capa deixa de chamar para ela). */
const FRESH_READ_KEY = 'tumtum-livro-pagina-nova-lida';
export const BOOK_SEEN_KEY = 'tumtum-livro-visto';

/** A assinatura de uma página: muda quando ganha lembranças novas (para saber o que ainda não foi impresso). */
const signature = (c: Chapter) => `${c.week}:${c.entries.length}`;

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

/** As páginas prontas que ainda não foram impressas (neste aparelho). */
const newPages = (book: Chapter[], printed: Set<string>) => book.filter(c => !c.quiet && !c.open && !printed.has(signature(c)));

export function BookView({ book, tone, parents, fresh: freshPage, onOpenEntry, onWrite, onNames }: { book: Chapter[]; tone: BabyTone; parents: string; fresh?: Chapter | null; onOpenEntry: (id: string) => void; onWrite?: () => void; onNames?: () => void }) {
  const name = useContext(BabyNameContext);
  const months = useMemo(() => bookMonths(book), [book]);
  // Para o "Primeiros 7 dias": o livro já foi aberto neste aparelho.
  useEffect(() => store(BOOK_SEEN_KEY, true), []);
  // O leitor abre num capítulo (abertura) ou numa semana (onde parou).
  const [reading, setReading] = useState<{ month: number; week?: number } | null>(null);
  const [lastRead, setLastRead] = useState<number | null>(() => readStored<number | null>(READING_KEY, null));
  const [freshRead, setFreshRead] = useState<number | null>(() => readStored<number | null>(FRESH_READ_KEY, null));
  const [choosing, setChoosing] = useState(false);
  const [printed, setPrinted] = useState(() => new Set(readStored<string[]>(PRINTED_KEY, [])));
  const fresh = newPages(book, printed);
  const written = book.filter(c => !c.quiet);
  const current = book[0]?.week ?? FIRST;
  const filled = new Set(written.map(c => c.week));
  const nudge = book.slice(0, 2).find(c => c.nudge);
  const monthOf = (week: number) => months.find(m => m.pages.some(p => p.week === week && (!p.quiet || p.open)));
  const resume = lastRead !== null ? monthOf(lastRead) : undefined;
  const freshMonth = freshPage ? monthOf(freshPage.week) : undefined;
  // A capa abre onde faz mais sentido: na página nova, onde pararam, ou no capítulo de agora.
  const open =
    freshPage && freshMonth && freshRead !== freshPage.week
      ? { label: 'Ler a página nova', go: { month: freshMonth.month, week: freshPage.week } }
      : resume && lastRead !== null
        ? { label: `Continuar da semana ${lastRead}`, go: { month: resume.month, week: lastRead } }
        : months[0]
          ? { label: 'Abrir o livro', go: { month: months[0].month } }
          : null;

  return (
    <div className="space-y-5 max-w-[560px] mx-auto">
      {/* A capa: um livro de verdade, com lombada costurada e a fitinha marcando a página. */}
      <button
        type="button"
        disabled={!open}
        onClick={() => open && setReading(open.go)}
        aria-label={open?.label ?? 'O livro ainda está em branco'}
        className="relative block w-full overflow-hidden rounded-[26px] rounded-l-[12px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft text-left shadow-[6px_8px_0_-2px_var(--c-surface-2)] transition active:scale-[0.99]"
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-5 bg-rosa/20 border-r-2 border-dashed border-surface/70" />
        {(open?.label !== 'Abrir o livro') && open && <span aria-hidden className="absolute top-0 right-7 w-3.5 h-11 bg-rosa [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />}
        <span className="flex items-center gap-3 pl-9 pr-5 pt-6 pb-5">
          <span className="flex-1 min-w-0 space-y-2">
            <span className="block text-[12px] font-extrabold uppercase tracking-wide text-rosa-strong">O livro de {name ?? 'vocês'}</span>
            <span className="block font-display text-[1.3rem] leading-snug text-ink text-balance">
              {written.length === 0 ? 'A primeira página espera por vocês.' : `Um dia vocês vão ler estas páginas juntos, com ${babyCall(name)} no colo.`}
            </span>
            {freshPage && <span className="block text-[13px] text-ink-soft line-clamp-2">Página nova: {titleOf(freshPage)}</span>}
          </span>
          <BabyArt week={artWeek(current)} beat tone={tone} className="w-24 h-24 shrink-0" />
        </span>
        {/* A lombada: uma marquinha por semana, cheia quando a página tem lembranças. */}
        <span className="flex gap-[3px] pl-9 pr-5" role="img" aria-label={`Semanas com lembranças: ${written.length} de ${LAST - FIRST + 1}`}>
          {Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).map(w => (
            <span key={w} className={`flex-1 h-2 rounded-full ${filled.has(w) ? 'bg-rosa' : w === current ? 'bg-surface border border-dashed border-rosa' : w < current ? 'bg-rosa/25' : 'bg-surface/70'}`} />
          ))}
        </span>
        {open && (
          <span className="flex pl-9 pr-5 pt-4 pb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rosa text-on-accent px-4 py-2 text-[13.5px] font-extrabold">
              <BookOpen className="w-4 h-4" /> {open.label}
            </span>
          </span>
        )}
      </button>

      {nudge && onWrite && (
        <button type="button" onClick={onWrite} className="w-full flex items-start gap-2 rounded-2xl bg-surface/80 px-4 py-3 text-left text-[13.5px] text-ink">
          <PenLine className="w-4 h-4 mt-0.5 shrink-0 text-rosa-strong" />
          <span>{nudge.nudge}</span>
        </button>
      )}

      {/* O sumário: um capítulo por mês; tocar abre o livro ali. */}
      <section aria-labelledby="sumario-titulo" className="space-y-2">
        <h3 id="sumario-titulo" className="px-1 text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">
          Sumário
        </h3>
        <ol className="rounded-[24px] bg-surface/80 divide-y divide-line/60" aria-label="Capítulos">
          {months.map(m => (
            <li key={m.month}>
              <MonthRow month={m} onOpen={() => setReading({ month: m.month })} />
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col items-start gap-2 px-1">
        {written.length > 0 && (
          <button type="button" onClick={() => setChoosing(true)} className="inline-flex items-start gap-2 text-left text-[13.5px] font-bold text-rosa-strong">
            <span className="relative shrink-0 mt-0.5">
              <Printer className="w-4 h-4" />
              {fresh.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rosa ring-2 ring-surface" aria-hidden />}
            </span>
            <span>
              Imprimir para o fichário de memórias
              {fresh.length > 0 && <span className="block text-[12px] font-semibold text-ink-soft">Páginas novas esperando o papel</span>}
            </span>
          </button>
        )}
        {!name && onNames && (
          <button type="button" onClick={onNames} className="text-left text-[13.5px] font-bold text-rosa-strong">
            Qual vai ser o nome? Ele vai para a capa do livro ›
          </button>
        )}
      </div>

      {reading && (
        <BookReader
          months={months}
          start={reading}
          tone={tone}
          onClose={() => setReading(null)}
          onOpenEntry={id => {
            setReading(null);
            onOpenEntry(id);
          }}
          onPage={week => {
            setLastRead(week);
            store(READING_KEY, week);
            if (freshPage?.week === week) {
              setFreshRead(week);
              store(FRESH_READ_KEY, week);
            }
          }}
        />
      )}
      {choosing && (
        <PrintPicker
          book={book}
          tone={tone}
          parents={parents}
          printed={printed}
          onPrinted={done => {
            const next = new Set([...printed, ...done.map(signature)]);
            store(PRINTED_KEY, [...next]);
            setPrinted(next);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  );
}

/** Um capítulo no sumário: o número, o nome, o mês e as páginas (uma marquinha por semana). */
function MonthRow({ month: m, onOpen }: { month: MonthChapter; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Capítulo ${m.month}: ${m.title}. Abrir`} className="w-full flex items-center gap-3 px-4 py-3 text-left">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-display text-[1.05rem] tabular ${m.quiet && !m.open ? 'bg-surface-2 text-ink-mute' : 'bg-rosa-soft text-rosa-strong'}`}>{m.month}</span>
      <span className="flex-1 min-w-0">
        <span className={`block font-display text-[1.08rem] leading-tight truncate ${m.quiet && !m.open ? 'text-ink-soft' : 'text-ink'}`}>{m.title}</span>
        <span className="flex items-center gap-2 mt-1">
          <span className="text-[12px] text-ink-mute">{m.open ? 'sendo escrito' : m.name.toLowerCase()}</span>
          <span className="flex gap-1" aria-hidden>
            {m.pages.map(p => (
              <span key={p.week} className={`h-1.5 w-3.5 rounded-full ${p.open ? 'border border-dashed border-rosa' : p.quiet ? 'bg-line' : 'bg-rosa'}`} />
            ))}
          </span>
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
    </button>
  );
}

type Page = { kind: 'abertura'; month: MonthChapter } | { kind: 'semana'; month: MonthChapter; chapter: Chapter } | { kind: 'nome'; month: MonthChapter; chapter: Chapter };

/**
 * O livro aberto, como num leitor de e-book: a página ocupa a tela toda (sem
 * moldura), folheia deslizando ou pelas setas, tem sumário para pular para um
 * capítulo ou semana e lembra onde vocês pararam. Tocar num registro leva a ele.
 */
function BookReader({ months, start, tone, onClose, onOpenEntry, onPage }: { months: MonthChapter[]; start: { month: number; week?: number }; tone: BabyTone; onClose: () => void; onOpenEntry: (id: string) => void; onPage: (week: number) => void }) {
  useScrollLock();
  const name = useContext(BabyNameContext);
  const pages = useMemo<Page[]>(
    () =>
      [...months].reverse().flatMap(m => [
        { kind: 'abertura' as const, month: m },
        // A semana em que escolheram o nome ganha, logo depois, a página do nome.
        ...m.pages.filter(c => !c.quiet || c.open).flatMap(c => [{ kind: 'semana' as const, month: m, chapter: c }, ...(c.named ? [{ kind: 'nome' as const, month: m, chapter: c }] : [])]),
      ]),
    [months],
  );
  const [at, setAt] = useState(() => {
    const byWeek = start.week === undefined ? -1 : pages.findIndex(p => p.kind === 'semana' && p.chapter.week === start.week);
    return Math.max(0, byWeek >= 0 ? byWeek : pages.findIndex(p => p.kind === 'abertura' && p.month.month === start.month));
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const [contents, setContents] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const page = pages[at];
  const jump = (next: number) => {
    const to = Math.min(pages.length - 1, Math.max(0, next));
    if (to === at) return;
    setDir(to > at ? 1 : -1);
    setAt(to);
  };
  const go = (n: number) => jump(at + n);
  useEffect(() => {
    sheet.current?.scrollTo({ top: 0 });
    if (page.kind === 'semana') onPage(page.chapter.week);
  }, [at]); // eslint-disable-line react-hooks/exhaustive-deps -- só quando a página muda
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // Deslizar para o lado folheia (um gesto mais vertical que horizontal é rolagem da página).
  const down = (e: PointerEvent) => (touch.current = { x: e.clientX, y: e.clientY });
  const up = (e: PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };
  const where = page.kind === 'abertura' ? 'Abertura do capítulo' : page.kind === 'nome' ? 'A página do nome' : `Semana ${page.chapter.week}${page.chapter.open ? ' · sendo escrita' : ''}`;

  return (
    <div role="dialog" aria-label={`O livro de ${name ?? 'vocês'}`} className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-surface text-ink">
      <header className="flex items-center gap-1 border-b border-line px-2 pt-[calc(env(safe-area-inset-top,0px)+6px)] pb-1.5">
        <button type="button" onClick={onClose} aria-label="Fechar o livro" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-2">
          <X className="w-5 h-5" />
        </button>
        <p className="flex-1 min-w-0 text-center text-[12.5px] font-bold text-ink-soft truncate">
          Capítulo {page.month.month} · {page.month.title}
        </p>
        <button type="button" onClick={() => setContents(true)} aria-label="Sumário" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-2">
          <List className="w-5 h-5" />
        </button>
      </header>

      <div className="relative flex-1 min-h-0 [perspective:1600px]">
        <div key={at} ref={sheet} onPointerDown={down} onPointerUp={up} style={{ touchAction: 'pan-y' }} className={`tt-pagina ${dir > 0 ? 'tt-pagina-frente' : 'tt-pagina-volta'} h-full overflow-y-auto`} aria-live="polite">
          <div className="mx-auto max-w-[620px] px-6 pt-6 pb-10">
            {page.kind === 'abertura' ? <MonthOpening month={page.month} tone={tone} /> : page.kind === 'nome' ? <NamePageView page={page.chapter.named!} tone={tone} week={page.chapter.week} /> : <WeekPage chapter={page.chapter} tone={tone} onOpenEntry={onOpenEntry} />}
            {/* O fim da página, com a assinatura do Tumtum. */}
            <div className="mt-10 flex items-center gap-3 text-rosa/50" aria-hidden>
              <span className="flex-1 h-px bg-line" />
              <BrandMark className="w-6 h-6" />
              <span className="flex-1 h-px bg-line" />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-line px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
        {/* Onde você está no livro inteiro, como nos leitores de e-book. */}
        <div className="h-1 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
          <div className="h-full bg-rosa transition-all duration-300" style={{ width: `${((at + 1) / pages.length) * 100}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button type="button" onClick={() => go(-1)} disabled={at === 0} aria-label="Página anterior" className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface-2 disabled:opacity-25">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <p className="text-[13px] font-semibold text-ink-soft text-center">{where}</p>
          <button type="button" onClick={() => go(1)} disabled={at === pages.length - 1} aria-label="Próxima página" className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface-2 disabled:opacity-25">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </footer>

      {contents && (
        <div className="absolute inset-0 z-10 flex flex-col bg-surface" role="dialog" aria-label="Sumário do livro">
          <header className="flex items-center gap-2 border-b border-line px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5">
            <p className="flex-1 font-display text-[1.25rem] text-ink">Sumário</p>
            <button type="button" onClick={() => setContents(false)} aria-label="Fechar o sumário" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-2">
              <X className="w-5 h-5" />
            </button>
          </header>
          <ol className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {[...months].reverse().map(m => (
              <li key={m.month} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    jump(pages.findIndex(p => p.kind === 'abertura' && p.month.month === m.month));
                    setContents(false);
                  }}
                  className="w-full text-left"
                >
                  <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">Capítulo {m.month}</span>
                  <span className="block font-display text-[1.15rem] text-ink">{m.title}</span>
                </button>
                <ul className="pl-3 border-l-2 border-line space-y-0.5">
                  {pages.flatMap((p, i) =>
                    p.kind === 'semana' && p.month.month === m.month
                      ? [
                          <li key={p.chapter.week}>
                            <button
                              type="button"
                              onClick={() => {
                                jump(i);
                                setContents(false);
                              }}
                              className={`w-full text-left py-1 text-[14px] ${i === at ? 'font-bold text-rosa-strong' : 'text-ink-soft'}`}
                            >
                              Semana {p.chapter.week} · {p.chapter.personal ? titleOf(p.chapter) : p.chapter.open ? 'sendo escrita' : span(p.chapter)}
                            </button>
                          </li>,
                        ]
                      : [],
                  )}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Escolher o que imprimir: por capítulo (mês) e por página (semana); já vêm marcadas as páginas novas. */
function PrintPicker({ book, tone, parents, printed, onPrinted, onClose }: { book: Chapter[]; tone: BabyTone; parents: string; printed: Set<string>; onPrinted: (pages: Chapter[]) => void; onClose: () => void }) {
  useScrollLock();
  const months = useMemo(() => bookMonths(book), [book]);
  const ready = book.filter(c => !c.quiet);
  const fresh = newPages(book, printed);
  const [chosen, setChosen] = useState<Set<number>>(() => new Set((fresh.length ? fresh : ready.filter(c => !c.open)).map(c => c.week)));
  const [printing, setPrinting] = useState(false);
  const toggle = (weeks: number[], on: boolean) =>
    setChosen(prev => {
      const next = new Set(prev);
      for (const w of weeks) {
        if (on) next.add(w);
        else next.delete(w);
      }
      return next;
    });
  const pages = ready.filter(c => chosen.has(c.week));

  if (printing) return <BookPrint book={book} weeks={chosen} tone={tone} parents={parents} onPrint={() => onPrinted(pages)} onClose={() => setPrinting(false)} />;
  return (
    <div role="dialog" aria-label="Imprimir para o fichário" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-surface p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="font-display text-[1.35rem] leading-tight text-ink">Para o fichário de memórias</h2>
            <p className="text-[13.5px] text-ink-soft mt-0.5">Escolham as páginas. As novas já vêm marcadas, para o fichário crescer junto com o bebê.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setChosen(new Set(fresh.map(c => c.week)))} disabled={!fresh.length} className="rounded-full bg-rosa-soft text-rosa-strong px-3.5 py-1.5 text-[13px] font-bold disabled:opacity-50">
            Só as novas
          </button>
          <button type="button" onClick={() => setChosen(new Set(ready.map(c => c.week)))} className="rounded-full bg-surface-2 text-ink-soft px-3.5 py-1.5 text-[13px] font-bold">
            O livro todo
          </button>
        </div>
        <ul className="space-y-3" aria-label="Capítulos para imprimir">
          {months
            .filter(m => !m.quiet)
            .map(m => {
              const weeks = m.pages.filter(p => !p.quiet).map(p => p.week);
              const all = weeks.every(w => chosen.has(w));
              return (
                <li key={m.month} className="rounded-2xl bg-surface-2/60 p-3 space-y-2">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={all} onChange={e => toggle(weeks, e.target.checked)} className="w-5 h-5 accent-[var(--c-rosa)]" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">Capítulo {m.month}</span>
                      <span className="block font-bold text-ink">{m.title}</span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 pl-8">
                    {m.pages
                      .filter(p => !p.quiet)
                      .map(p => {
                        const on = chosen.has(p.week);
                        const isNew = fresh.some(f => f.week === p.week);
                        return (
                          <button key={p.week} type="button" aria-pressed={on} onClick={() => toggle([p.week], !on)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-bold transition ${on ? 'bg-rosa text-white' : 'bg-surface text-ink-soft'}`}>
                            {on && <Check className="w-3.5 h-3.5" />} Semana {p.week}
                            {isNew && <span className={`ml-0.5 text-[10px] font-extrabold uppercase ${on ? 'text-white/85' : 'text-rosa'}`}>nova</span>}
                          </button>
                        );
                      })}
                  </div>
                </li>
              );
            })}
        </ul>
        <button type="button" disabled={!pages.length} onClick={() => setPrinting(true)} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rosa text-white px-5 py-3 font-extrabold shadow-soft disabled:opacity-50">
          <BookOpen className="w-4 h-4" /> Montar as páginas
        </button>
      </div>
    </div>
  );
}

/** Espera as fotos carregarem (para nenhuma sair em branco no PDF). */
async function photosReady(root: HTMLElement | null) {
  const imgs = [...(root?.querySelectorAll('img') ?? [])];
  await Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
}

/**
 * As páginas escolhidas, prontas para imprimir ou salvar em PDF: capa, a
 * abertura de cada capítulo e uma página por semana. Sempre em papel claro
 * (mesmo com o celular no modo escuro), com as fotos inteiras.
 */
export function BookPrint({ book, weeks, tone, parents, onPrint, onClose }: { book: Chapter[]; weeks?: Set<number>; tone: BabyTone; parents: string; onPrint?: () => void; onClose: () => void }) {
  const name = useContext(BabyNameContext);
  const paper = useRef<HTMLElement>(null);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const months = [...bookMonths(book)].reverse().map(m => ({ ...m, pages: m.pages.filter(p => !p.quiet && (!weeks || weeks.has(p.week))) })).filter(m => m.pages.length);
  const all = months.flatMap(m => m.pages);
  const first = all[0]?.week ?? FIRST;
  const last = all[all.length - 1];
  return (
    <div role="dialog" aria-label="Páginas para imprimir" className="fixed inset-0 z-50 overflow-y-auto bg-surface-2 print:static print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 bg-surface/95 backdrop-blur px-4 py-3 shadow-soft">
        <p className="flex-1 min-w-0 text-[13px] text-ink-soft leading-snug">Para guardar em PDF, escolha <b>Salvar como PDF</b> no lugar da impressora.</p>
        <button
          type="button"
          disabled={preparing}
          onClick={async () => {
            setPreparing(true);
            await photosReady(paper.current);
            setPreparing(false);
            onPrint?.();
            window.print();
          }}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-2 text-[13.5px] font-extrabold shadow-soft disabled:opacity-60"
        >
          <Printer className="w-4 h-4" /> {preparing ? 'Preparando…' : 'Imprimir'}
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      <article ref={paper} className="print-area tt-livro tt-claro mx-auto max-w-[680px] bg-surface text-ink px-8 py-10 my-4 print:my-0 print:px-0 print:py-0 space-y-10">
        <section className="tt-livro-capa flex flex-col items-center justify-center text-center gap-4 min-h-[70vh]">
          <BabyArt week={artWeek(last?.week ?? 40)} tone={tone} className="w-56 h-56" />
          <p className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-rosa">O livro de</p>
          <h1 className="font-display text-[2.4rem] leading-tight">{name ?? parents ?? 'vocês'}</h1>
          {name && parents && <p className="text-[15px] text-ink-soft">contado por {parents}</p>}
          <p className="text-[15px] text-ink-soft">{first === last?.week ? `Semana ${first}` : `Da semana ${first} à semana ${last?.week ?? first}`}</p>
        </section>
        {months.map(m => (
          <div key={m.month} className="space-y-10">
            <MonthOpening month={m} tone={tone} print />
            {m.pages.map(c => (
              <div key={c.week} className="space-y-10">
                <WeekPage chapter={c} tone={tone} />
                {c.named && <NamePageView page={c.named} tone={tone} week={c.week} />}
              </div>
            ))}
          </div>
        ))}
      </article>
    </div>
  );
}

/** No coração do Início: o capítulo que está sendo escrito (e o aviso de página nova), levando ao livro. */
