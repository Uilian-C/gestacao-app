import { useContext, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, PenLine, Printer, Sparkles, X } from 'lucide-react';
import { photoUrl } from '../api';
import type { BabyTone } from '../content/babyTones';
import { stageAt } from '../content/growth';
import { BabyNameContext, babyCall } from '../lib/baby';
import { bookMonths, freshChapter, type Chapter, type MonthChapter } from '../lib/chapters';
import { formatBR, parseLocalDate } from '../lib/dates';
import { FOLDER, shortDate } from '../lib/folders';
import BabyArt from './BabyArt';
import BabyNameSetting from './BabyNameSetting';

// O livro de vocês: cada mês da gestação é um capítulo e cada semana, uma
// página, contada como história (sem contagem) e com o bebê daquela semana.
// No Mural aparece a página que acabou de fechar; no Diário → Livro, os
// capítulos, que abrem como um livro (folheando), e a impressão para o
// fichário de memórias, só com as páginas que vocês escolherem.

/** "16 a 22 out". */
const span = (c: Chapter) => `${parseLocalDate(c.from).getDate()} a ${shortDate(c.to)}`;
const titleOf = (c: Chapter) => (c.personal ? `“${c.title}”` : c.title);
const artWeek = (week: number) => Math.min(40, Math.max(4, week));

/** O bebê naquela semana: o desenho da jornada, o tamanho e o nome carinhoso da fase. */
function BabyOfWeek({ chapter: c, tone }: { chapter: Chapter; tone: BabyTone }) {
  const name = useContext(BabyNameContext);
  const stage = stageAt(artWeek(c.week)).title;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 pl-1.5 pr-3 py-1.5">
      <BabyArt week={artWeek(c.week)} tone={tone} className="w-14 h-14 shrink-0" />
      <span className="min-w-0">
        <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">
          {babyCall(name, true)} na semana {c.week}
        </span>
        <span className="block text-[13.5px] text-ink leading-snug">
          {c.baby}
          {c.personal && <span className="text-ink-soft"> · {stage}</span>}
        </span>
      </span>
    </div>
  );
}

/** Uma semana (página) como cartão: no Mural, o capítulo que acabou de fechar. */
export function ChapterCard({ chapter: c, tone, onOpenEntry, onWrite, showNudge = false }: { chapter: Chapter; tone: BabyTone; onOpenEntry: (id: string) => void; onWrite?: () => void; showNudge?: boolean }) {
  const label = `Semana ${c.week} · ${c.open ? 'sendo escrita' : span(c)}`;
  return (
    <article aria-label={`Semana ${c.week}`} className={`rounded-[28px] overflow-hidden ${c.open ? 'bg-surface border-2 border-dashed border-line' : 'bg-surface shadow-soft'}`}>
      {c.cover ? (
        <button type="button" onClick={() => onOpenEntry(c.cover!.entryId)} className="relative block w-full" aria-label={`Semana ${c.week}: ver a foto`}>
          <img src={photoUrl(c.cover.photo.id)} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover bg-surface-2" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12 text-left">
            <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-white/85">{label}</span>
            <span className="block font-display text-[1.45rem] leading-tight text-white text-balance">{titleOf(c)}</span>
          </span>
        </button>
      ) : (
        <header className="px-5 pt-5">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">{label}</p>
          <h3 className="font-display text-[1.45rem] leading-tight text-ink text-balance">{titleOf(c)}</h3>
        </header>
      )}
      <div className="px-5 pt-3 pb-5 space-y-3">
        <BabyOfWeek chapter={c} tone={tone} />
        <p className="text-[15px] leading-relaxed text-ink">{c.story}</p>
        {c.highlight && !c.open && (
          <button type="button" onClick={() => onOpenEntry(c.highlight!.entryId)} className="block w-full text-left border-l-[3px] border-rosa/60 pl-3">
            <span className="block font-display text-[1.05rem] italic leading-snug text-ink">“{c.highlight.quote}”</span>
            <span className="block text-[12px] font-bold text-rosa-strong mt-0.5">{c.highlight.hugged ? 'A lembrança mais abraçada' : 'Para guardar desta semana'}</span>
          </button>
        )}
        {showNudge && c.nudge && (
          <button type="button" onClick={onWrite} disabled={!onWrite} className="w-full flex items-start gap-2 rounded-2xl bg-rosa-soft/70 px-3.5 py-2.5 text-left text-[13.5px] text-ink">
            <PenLine className="w-4 h-4 mt-0.5 shrink-0 text-rosa-strong" />
            <span>{c.nudge}</span>
          </button>
        )}
      </div>
    </article>
  );
}

/** A página que acabou de fechar, no topo do Mural, com o convite para a próxima. */
export function FreshChapter({ chapter, tone, onOpenEntry, onWrite, onOpenBook }: { chapter: Chapter; tone: BabyTone; onOpenEntry: (id: string) => void; onWrite?: () => void; onOpenBook: () => void }) {
  return (
    <section aria-label="Página da semana" className="space-y-2">
      <p className="flex items-center gap-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-rosa">
        <Sparkles className="w-3.5 h-3.5" /> Uma página nova no livro de vocês
      </p>
      <ChapterCard chapter={chapter} tone={tone} onOpenEntry={onOpenEntry} onWrite={onWrite} showNudge />
      <div className="flex items-center gap-2 px-1">
        {onWrite && (
          <button type="button" onClick={onWrite} className="flex-1 min-w-0 inline-flex items-center gap-2 rounded-full bg-rosa-soft text-rosa-strong px-4 py-2.5 text-[13.5px] font-bold text-left">
            <PenLine className="w-4 h-4 shrink-0" />
            <span className="truncate">Começar a semana {chapter.week + 1}</span>
          </button>
        )}
        <button type="button" onClick={onOpenBook} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-surface shadow-soft px-4 py-2.5 text-[13.5px] font-bold text-ink-soft">
          <BookOpen className="w-4 h-4" /> Ver o livro
        </button>
      </div>
    </section>
  );
}

// ---- As páginas do livro (no leitor e na impressão, iguais) ----

/** A abertura de um capítulo (um mês): o bebê no fim do mês, o nome do capítulo e o resumo. */
function MonthOpening({ month: m, tone, print = false }: { month: MonthChapter; tone: BabyTone; print?: boolean }) {
  const name = useContext(BabyNameContext);
  const last = m.pages[m.pages.length - 1];
  return (
    <section className={`tt-livro-abertura flex flex-col items-center justify-center text-center gap-3 ${print ? 'py-16' : 'min-h-full py-8'}`}>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-rosa">Capítulo {m.month}</p>
      <h2 className="font-display text-[2rem] leading-tight text-ink">{m.title}</h2>
      <p className="text-[14px] text-ink-soft">{m.name} {name ? `de ${name}` : 'da gestação'}</p>
      <BabyArt week={artWeek(last?.week ?? 4)} tone={tone} className="w-44 h-44" />
      {m.cover && <img src={photoUrl(m.cover.photo.id)} alt="" className={`w-full ${print ? 'max-h-[360px]' : 'max-h-[220px]'} object-cover rounded-2xl`} />}
      <p className="font-display text-[1.1rem] leading-relaxed text-ink max-w-[440px]">{m.story}</p>
    </section>
  );
}

/** Uma semana: o bebê, a história, a foto e tudo o que vocês escreveram, inteiro. */
function WeekPage({ chapter: c, tone, onOpenEntry }: { chapter: Chapter; tone: BabyTone; onOpenEntry?: (id: string) => void }) {
  return (
    <section className="tt-livro-semana space-y-4">
      <header className="flex items-center gap-4">
        <BabyArt week={artWeek(c.week)} tone={tone} className="w-20 h-20 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">
            Semana {c.week} · {c.open ? 'sendo escrita' : span(c)}
          </p>
          <h3 className="font-display text-[1.45rem] leading-tight text-ink text-balance">{titleOf(c)}</h3>
          <p className="text-[12.5px] text-ink-soft">
            {c.baby} · {stageAt(artWeek(c.week)).title}
          </p>
        </div>
      </header>
      {c.cover && <img src={photoUrl(c.cover.photo.id)} alt="" className="w-full max-h-[380px] object-cover rounded-2xl" />}
      <p className="text-[15.5px] leading-relaxed text-ink">{c.story}</p>
      {[...c.entries].reverse().map(e => {
        const photos = e.photos.filter(p => p.id !== c.cover?.photo.id);
        const Wrap = onOpenEntry ? 'button' : 'div';
        return (
          <Wrap key={e.id} {...(onOpenEntry ? { type: 'button' as const, onClick: () => onOpenEntry(e.id) } : {})} className="tt-livro-registro block w-full text-left space-y-2 border-t border-line/70 pt-3">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-mute">
              {FOLDER[e.folder].singular} · {formatBR(e.entry_date.slice(0, 10))}
            </span>
            {e.body && <span className={`block text-[15px] leading-relaxed text-ink whitespace-pre-line ${e.folder === 'carta' || e.folder === 'momento' ? 'font-display text-[1.08rem]' : ''}`}>{e.body}</span>}
            {photos.length > 0 && (
              <span className="grid grid-cols-3 gap-2">
                {photos.map(p => (
                  <img key={p.id} src={photoUrl(p.id)} alt="" className="w-full aspect-square object-cover rounded-xl" />
                ))}
              </span>
            )}
          </Wrap>
        );
      })}
    </section>
  );
}

// ---- Diário → Livro ----

const FIRST = 4;
const LAST = 40;
const PRINTED_KEY = 'tumtum-livro-impresso';

/** A assinatura de uma página: muda quando ganha lembranças novas (para saber o que ainda não foi impresso). */
const signature = (c: Chapter) => `${c.week}:${c.entries.length}`;

function readPrinted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PRINTED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** As páginas prontas que ainda não foram impressas (neste aparelho). */
const newPages = (book: Chapter[], printed: Set<string>) => book.filter(c => !c.quiet && !c.open && !printed.has(signature(c)));

export function BookView({ book, tone, parents, onOpenEntry, onWrite, onName }: { book: Chapter[]; tone: BabyTone; parents: string; onOpenEntry: (id: string) => void; onWrite?: () => void; onName?: (name: string | null) => Promise<boolean> }) {
  const name = useContext(BabyNameContext);
  const months = useMemo(() => bookMonths(book), [book]);
  const [reading, setReading] = useState<number | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [printed, setPrinted] = useState(readPrinted);
  const fresh = newPages(book, printed);
  const written = book.filter(c => !c.quiet);
  const current = book[0]?.week ?? FIRST;
  const filled = new Set(written.map(c => c.week));
  const nudge = book.slice(0, 2).find(c => c.nudge);

  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <header className="rounded-[28px] bg-gradient-to-b from-rosa-soft to-surface px-5 pt-5 pb-5 shadow-soft">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">O livro de {name ?? 'vocês'}</p>
        <h2 className="font-display text-[1.45rem] leading-snug text-ink text-balance">
          {written.length === 0 ? 'A primeira página espera por vocês.' : `Um dia vocês vão ler estas páginas juntos, com ${babyCall(name)} no colo.`}
        </h2>
        {/* A lombada: uma marquinha por semana, cheia quando a página tem lembranças. */}
        <div className="mt-3 flex gap-[3px]" role="img" aria-label={`Semanas com lembranças: ${written.length} de ${LAST - FIRST + 1}`}>
          {Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).map(w => (
            <span key={w} className={`flex-1 h-3 rounded-full ${filled.has(w) ? 'bg-rosa' : w === current ? 'bg-surface border border-dashed border-rosa' : w < current ? 'bg-rosa/20' : 'bg-line/60'}`} />
          ))}
        </div>
        {!name && onName && <BabyNameSetting onSave={onName} invite="Já escolheram o nome? Ele vai para a capa do livro" className="mt-3" />}
        {written.length > 0 && (
          <button type="button" onClick={() => setChoosing(true)} className="mt-4 w-full flex items-center gap-3 rounded-[20px] bg-rosa text-white px-4 py-3 text-left shadow-soft active:scale-[0.99] transition">
            <span className="relative w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
              {fresh.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-300 ring-2 ring-rosa" aria-hidden />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-extrabold leading-tight">Imprimir para o fichário de memórias</span>
              <span className="block text-[12.5px] text-white/85">{fresh.length > 0 ? 'Páginas novas esperando por vocês' : 'Escolham as páginas que querem guardar'}</span>
            </span>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        )}
      </header>

      {nudge && onWrite && (
        <button type="button" onClick={onWrite} className="w-full flex items-start gap-2 rounded-2xl bg-surface shadow-soft px-4 py-3 text-left text-[13.5px] text-ink">
          <PenLine className="w-4 h-4 mt-0.5 shrink-0 text-rosa-strong" />
          <span>{nudge.nudge}</span>
        </button>
      )}

      <ol className="space-y-3" aria-label="Capítulos">
        {months.map(m => (
          <li key={m.month}>
            <MonthCard month={m} tone={tone} onOpen={() => setReading(m.month)} />
          </li>
        ))}
      </ol>

      {reading !== null && <BookReader months={months} start={reading} tone={tone} onClose={() => setReading(null)} onOpenEntry={onOpenEntry} />}
      {choosing && (
        <PrintPicker
          book={book}
          tone={tone}
          parents={parents}
          printed={printed}
          onPrinted={done => {
            const next = new Set([...printed, ...done.map(signature)]);
            try {
              localStorage.setItem(PRINTED_KEY, JSON.stringify([...next]));
            } catch {
              /* sem armazenamento: só não lembra o que já foi impresso */
            }
            setPrinted(next);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  );
}

/** Um capítulo (mês) na lista: capa, nome, o resumo e as páginas (uma bolinha por semana). */
function MonthCard({ month: m, tone, onOpen }: { month: MonthChapter; tone: BabyTone; onOpen: () => void }) {
  const last = m.pages[m.pages.length - 1];
  return (
    <button type="button" onClick={onOpen} aria-label={`Capítulo ${m.month}: ${m.title}. Abrir`} className={`w-full text-left rounded-[28px] overflow-hidden transition active:scale-[0.99] ${m.open ? 'bg-surface border-2 border-dashed border-line' : m.quiet ? 'bg-surface-2/60' : 'bg-surface shadow-soft'}`}>
      <span className="flex items-stretch">
        <span className="relative w-28 shrink-0 bg-gradient-to-b from-rosa-soft to-surface-2 flex items-center justify-center overflow-hidden">
          {m.cover ? <img src={photoUrl(m.cover.photo.id, m.cover.photo.thumb)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" /> : <BabyArt week={artWeek(last?.week ?? 4)} tone={tone} className="w-24 h-24" />}
        </span>
        <span className="flex-1 min-w-0 px-4 py-3.5 space-y-1">
          <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">
            Capítulo {m.month} · {m.open ? 'sendo escrito' : m.name.toLowerCase()}
          </span>
          <span className="block font-display text-[1.2rem] leading-tight text-ink">{m.title}</span>
          <span className="block text-[13px] text-ink-soft leading-snug line-clamp-2">{m.story}</span>
          <span className="flex items-center gap-1.5 pt-1" aria-hidden>
            {m.pages.map(p => (
              <span key={p.week} className={`h-1.5 w-5 rounded-full ${p.open ? 'border border-dashed border-rosa' : p.quiet ? 'bg-line' : 'bg-rosa'}`} />
            ))}
            <span className="ml-auto text-[12px] font-bold text-rosa-strong">Abrir ›</span>
          </span>
        </span>
      </span>
    </button>
  );
}

type Page = { kind: 'abertura'; month: MonthChapter } | { kind: 'semana'; month: MonthChapter; chapter: Chapter };

/** O livro aberto: folhear (deslizar ou setas) da abertura de um capítulo pelas semanas, até o fim. */
function BookReader({ months, start, tone, onClose, onOpenEntry }: { months: MonthChapter[]; start: number; tone: BabyTone; onClose: () => void; onOpenEntry: (id: string) => void }) {
  const name = useContext(BabyNameContext);
  const pages = useMemo<Page[]>(
    () => [...months].reverse().flatMap(m => [{ kind: 'abertura' as const, month: m }, ...m.pages.filter(c => !c.quiet || c.open).map(c => ({ kind: 'semana' as const, month: m, chapter: c }))]),
    [months],
  );
  const [at, setAt] = useState(() => Math.max(0, pages.findIndex(p => p.kind === 'abertura' && p.month.month === start)));
  const [dir, setDir] = useState<1 | -1>(1);
  const sheet = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const go = (n: number) => {
    const next = Math.min(pages.length - 1, Math.max(0, at + n));
    if (next === at) return;
    setDir(n > 0 ? 1 : -1);
    setAt(next);
  };
  useEffect(() => {
    sheet.current?.scrollTo({ top: 0 });
  }, [at]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const page = pages[at];
  const down = (e: PointerEvent) => (touch.current = e.clientX);
  const up = (e: PointerEvent) => {
    if (touch.current === null) return;
    const dx = e.clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  };

  return (
    <div role="dialog" aria-label={`O livro de ${name ?? 'vocês'}`} className="fixed inset-0 z-50 flex flex-col bg-[#2b2326]/92 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2 text-white">
        <p className="flex-1 min-w-0 text-[12px] font-extrabold uppercase tracking-wide truncate">
          Capítulo {page.month.month} · {page.month.title}
        </p>
        <button type="button" onClick={onClose} aria-label="Fechar o livro" className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 px-3 pb-2 [perspective:1600px]">
        <div
          key={at}
          ref={sheet}
          onPointerDown={down}
          onPointerUp={up}
          className={`tt-pagina ${dir > 0 ? 'tt-pagina-frente' : 'tt-pagina-volta'} h-full overflow-y-auto rounded-[22px] bg-[#fdf9f4] text-ink shadow-[0_20px_60px_rgba(0,0,0,0.35)] px-5 py-6 mx-auto max-w-[560px]`}
          style={{ touchAction: 'pan-y' }}
          aria-live="polite"
        >
          {page.kind === 'abertura' ? <MonthOpening month={page.month} tone={tone} /> : <WeekPage chapter={page.chapter} tone={tone} onOpenEntry={onOpenEntry} />}
          <p className="pt-6 text-center text-[12px] text-ink-mute">{at + 1}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-1 text-white">
        <button type="button" onClick={() => go(-1)} disabled={at === 0} aria-label="Página anterior" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-30">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-[12.5px] font-bold text-white/85 text-center">{page.kind === 'abertura' ? 'Abertura do capítulo' : `Semana ${page.chapter.week}`} · deslize para folhear</p>
        <button type="button" onClick={() => go(1)} disabled={at === pages.length - 1} aria-label="Próxima página" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/** Escolher o que imprimir: por capítulo (mês) e por página (semana); já vêm marcadas as páginas novas. */
function PrintPicker({ book, tone, parents, printed, onPrinted, onClose }: { book: Chapter[]; tone: BabyTone; parents: string; printed: Set<string>; onPrinted: (pages: Chapter[]) => void; onClose: () => void }) {
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

/**
 * As páginas escolhidas, prontas para imprimir ou salvar em PDF: capa, a
 * abertura de cada capítulo e uma página por semana. Usa a impressão do aparelho.
 */
export function BookPrint({ book, weeks, tone, parents, onPrint, onClose }: { book: Chapter[]; weeks?: Set<number>; tone: BabyTone; parents: string; onPrint?: () => void; onClose: () => void }) {
  const name = useContext(BabyNameContext);
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
          onClick={() => {
            onPrint?.();
            window.print();
          }}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-2 text-[13.5px] font-extrabold shadow-soft"
        >
          <Printer className="w-4 h-4" /> Imprimir
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      <article className="print-area tt-livro mx-auto max-w-[680px] bg-white text-ink px-8 py-10 my-4 rounded-[24px] print:my-0 print:rounded-none print:px-0 print:py-0 space-y-10">
        <section className="tt-livro-capa flex flex-col items-center justify-center text-center gap-4 min-h-[70vh]">
          <BabyArt week={artWeek(last?.week ?? 40)} tone={tone} className="w-56 h-56" />
          <p className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-rosa">O livro de</p>
          <h1 className="font-display text-[2.4rem] leading-tight">{name ?? parents ?? 'vocês'}</h1>
          {name && parents && <p className="text-[15px] text-ink-soft">contado por {parents}</p>}
          <p className="text-[15px] text-ink-soft">
            {first === last?.week ? `Semana ${first}` : `Da semana ${first} à semana ${last?.week ?? first}`}
          </p>
        </section>
        {months.map(m => (
          <div key={m.month} className="space-y-10">
            <MonthOpening month={m} tone={tone} print />
            {m.pages.map(c => (
              <WeekPage key={c.week} chapter={c} tone={tone} />
            ))}
          </div>
        ))}
      </article>
    </div>
  );
}

/** No coração do Início: o capítulo que está sendo escrito (e o aviso de página nova), levando ao livro. */
export function BookTeaser({ book, dumDate, onOpen }: { book: Chapter[]; dumDate: string; onOpen: () => void }) {
  const name = useContext(BabyNameContext);
  const m = bookMonths(book)[0];
  const fresh = freshChapter(book, dumDate, new Date());
  if (!m) return null;
  return (
    <button type="button" onClick={onOpen} aria-label={`O livro de ${name ?? 'vocês'}: abrir`} className="mt-2 w-full flex items-center gap-3 rounded-[20px] bg-gradient-to-r from-rosa-soft to-lilas-soft/70 px-3 py-2.5 text-left transition active:scale-[0.99]">
      <span className="relative w-10 h-10 rounded-2xl bg-surface flex items-center justify-center shrink-0 shadow-soft">
        <BookOpen className="w-5 h-5 text-rosa-strong" />
        {fresh && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-300 ring-2 ring-surface animate-pulse" aria-hidden />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-bold text-rosa">O livro de {name ?? 'vocês'}</span>
        <span className="block font-bold text-ink leading-snug truncate">{fresh ? 'Uma página nova foi escrita' : `Capítulo ${m.month} · ${m.title}`}</span>
        <span className="flex items-center gap-1 pt-1" aria-hidden>
          {m.pages.map(p => (
            <span key={p.week} className={`h-1.5 w-4 rounded-full ${p.open ? 'border border-dashed border-rosa' : p.quiet ? 'bg-surface' : 'bg-rosa'}`} />
          ))}
        </span>
      </span>
      <ChevronRight className="w-5 h-5 text-ink-mute shrink-0" />
    </button>
  );
}
