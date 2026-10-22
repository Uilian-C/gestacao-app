import { useEffect } from 'react';
import { BookOpen, Download, PenLine, Printer, X } from 'lucide-react';
import { photoUrl } from '../api';
import type { BabyTone } from '../content/babyTones';
import { stageAt } from '../content/growth';
import type { Chapter } from '../lib/chapters';
import { formatBR, parseLocalDate } from '../lib/dates';
import { FOLDER, shortDate } from '../lib/folders';
import BabyArt from './BabyArt';

// O livro de vocês: cada semana é um capítulo, contado como história (sem
// contagem) e com o bebê daquela semana. No Mural aparece o capítulo que
// acabou de fechar; no Diário → Livro, todos, e dali sai o PDF para imprimir.

/** "16 a 22 out". */
const span = (c: Chapter) => `${parseLocalDate(c.from).getDate()} a ${shortDate(c.to)}`;
const titleOf = (c: Chapter) => (c.personal ? `“${c.title}”` : c.title);

/** O bebê naquela semana: o desenho da jornada, o tamanho e o nome carinhoso da fase. */
function BabyOfWeek({ chapter: c, tone }: { chapter: Chapter; tone: BabyTone }) {
  const stage = stageAt(Math.max(4, c.week)).title;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 pl-1.5 pr-3 py-1.5">
      <BabyArt week={Math.max(4, c.week)} tone={tone} className="w-14 h-14 shrink-0" />
      <span className="min-w-0">
        <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">O bebê na semana {c.week}</span>
        <span className="block text-[13.5px] text-ink leading-snug">
          {c.baby}
          {c.personal && <span className="text-ink-soft"> · {stage}</span>}
        </span>
      </span>
    </div>
  );
}

export function ChapterCard({ chapter: c, tone, onOpenEntry, onWrite, showNudge = false }: { chapter: Chapter; tone: BabyTone; onOpenEntry: (id: string) => void; onWrite?: () => void; showNudge?: boolean }) {
  if (c.quiet && !c.open) {
    return (
      <article aria-label={`Capítulo ${c.week}`} className="flex items-center gap-3 rounded-[22px] bg-surface-2/60 pl-2 pr-4 py-2">
        <BabyArt week={Math.max(4, c.week)} tone={tone} className="w-10 h-10 shrink-0 opacity-70" />
        <span className="min-w-0">
          <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute">Capítulo {c.week}</span>
          <span className="block text-[13.5px] text-ink-soft italic">{c.story}</span>
        </span>
      </article>
    );
  }
  const label = `Capítulo ${c.week} · ${c.open ? 'sendo escrito' : span(c)}`;
  return (
    <article aria-label={`Capítulo ${c.week}`} className={`rounded-[28px] overflow-hidden ${c.open ? 'bg-surface border-2 border-dashed border-line' : 'bg-surface shadow-soft'}`}>
      {c.cover ? (
        <button type="button" onClick={() => onOpenEntry(c.cover!.entryId)} className="relative block w-full" aria-label={`Capítulo ${c.week}: ver a foto`}>
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

/** O capítulo que acabou de fechar, no topo do Mural, com o convite para o próximo. */
export function FreshChapter({ chapter, tone, onOpenEntry, onWrite, onOpenBook }: { chapter: Chapter; tone: BabyTone; onOpenEntry: (id: string) => void; onWrite?: () => void; onOpenBook: () => void }) {
  return (
    <section aria-label="Capítulo da semana" className="space-y-2">
      <ChapterCard chapter={chapter} tone={tone} onOpenEntry={onOpenEntry} onWrite={onWrite} showNudge />
      <div className="flex items-center gap-2 px-1">
        {onWrite && (
          <button type="button" onClick={onWrite} className="flex-1 min-w-0 inline-flex items-center gap-2 rounded-full bg-rosa-soft text-rosa-strong px-4 py-2.5 text-[13.5px] font-bold text-left">
            <PenLine className="w-4 h-4 shrink-0" />
            <span className="truncate">Começar o capítulo {chapter.week + 1}</span>
          </button>
        )}
        <button type="button" onClick={onOpenBook} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-surface shadow-soft px-4 py-2.5 text-[13.5px] font-bold text-ink-soft">
          <BookOpen className="w-4 h-4" /> Ver o livro
        </button>
      </div>
    </section>
  );
}

/** Semanas quietas seguidas viram uma linha só; os outros capítulos ficam sozinhos. */
function quietRuns(book: Chapter[]) {
  const runs: Chapter[][] = [];
  for (const c of book) {
    const last = runs[runs.length - 1];
    const quiet = c.quiet && !c.open;
    if (quiet && last && last[0].quiet && !last[0].open) last.push(c);
    else runs.push([c]);
  }
  return runs;
}

const FIRST = 4;
const LAST = 40;

/** Diário → Livro: a lombada (uma marquinha por semana), o PDF e os capítulos. */
export function BookView({ book, tone, onOpenEntry, onWrite, onPrint }: { book: Chapter[]; tone: BabyTone; onOpenEntry: (id: string) => void; onWrite?: () => void; onPrint: () => void }) {
  const written = book.filter(c => !c.quiet);
  const current = book[0]?.week ?? FIRST;
  const filled = new Set(written.map(c => c.week));
  // O convite aparece no capítulo de hoje e no que acabou de fechar.
  const nudgeAt = book.slice(0, 2).find(c => c.nudge)?.week;
  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <header className="rounded-[28px] bg-gradient-to-b from-rosa-soft to-surface px-5 pt-5 pb-4 shadow-soft">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">O livro de vocês</p>
        <h2 className="font-display text-[1.5rem] leading-tight text-ink">{written.length === 0 ? 'A primeira página espera por vocês' : 'Um livro que cresce junto com o bebê'}</h2>
        <p className="text-[13px] text-ink-soft mt-1">Cada semana vira um capítulo, com o bebê daquela semana. No fim, um livro só de vocês.</p>
        {/* A lombada: uma marquinha por semana, cheia quando o capítulo tem lembranças. */}
        <div className="mt-3 flex gap-[3px]" role="img" aria-label={`Semanas com lembranças: ${written.length} de ${LAST - FIRST + 1}`}>
          {Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).map(w => (
            <span
              key={w}
              className={`flex-1 h-3 rounded-full ${filled.has(w) ? 'bg-rosa' : w === current ? 'bg-surface border border-dashed border-rosa' : w < current ? 'bg-rosa/20' : 'bg-line/60'}`}
            />
          ))}
        </div>
        {written.length > 0 && (
          <button type="button" onClick={onPrint} className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface shadow-soft px-4 py-2 text-[13.5px] font-bold text-ink">
            <Download className="w-4 h-4 text-rosa-strong" /> Baixar o livro em PDF
          </button>
        )}
      </header>
      <ol className="space-y-3" aria-label="Capítulos">
        {quietRuns(book).map(run =>
          run.length > 1 ? (
            <li key={run[0].week} className="flex items-baseline gap-3 rounded-[22px] bg-surface-2/60 px-4 py-3">
              <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute shrink-0">
                Capítulos {run[run.length - 1].week} a {run[0].week}
              </span>
              <span className="text-[13.5px] text-ink-soft italic">Semanas quietas. Às vezes o melhor é só viver.</span>
            </li>
          ) : (
            <li key={run[0].week}>
              <ChapterCard chapter={run[0]} tone={tone} onOpenEntry={onOpenEntry} onWrite={onWrite} showNudge={run[0].week === nudgeAt} />
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

/**
 * O livro para imprimir ou salvar em PDF: capa, um capítulo por semana (do
 * primeiro ao de hoje) com o bebê da semana, a história, as fotos e tudo o que
 * vocês escreveram. Abre em tela cheia; "Salvar em PDF" usa a impressão do aparelho.
 */
export function BookPrint({ book, tone, parents, onClose }: { book: Chapter[]; tone: BabyTone; parents: string; onClose: () => void }) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const chapters = [...book].reverse();
  const first = chapters[0]?.week ?? FIRST;
  const last = chapters[chapters.length - 1];
  return (
    <div role="dialog" aria-label="O livro para imprimir" className="fixed inset-0 z-50 overflow-y-auto bg-surface-2 print:static print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 bg-surface/95 backdrop-blur px-4 py-3 shadow-soft">
        <p className="flex-1 min-w-0 text-[13px] text-ink-soft leading-snug">Em "Salvar em PDF", escolha <b>Salvar como PDF</b> no lugar da impressora.</p>
        <button type="button" onClick={() => window.print()} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-2 text-[13.5px] font-extrabold shadow-soft">
          <Printer className="w-4 h-4" /> Salvar em PDF
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      <article className="print-area tt-livro mx-auto max-w-[680px] bg-white text-[#2b2326] px-8 py-10 my-4 rounded-[24px] print:my-0 print:rounded-none print:px-0 print:py-0">
        <section className="tt-livro-capa flex flex-col items-center justify-center text-center gap-4 min-h-[80vh]">
          <BabyArt week={Math.min(40, Math.max(4, last?.week ?? 40))} tone={tone} className="w-56 h-56" />
          <p className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-[#c2456b]">O livro de</p>
          <h1 className="font-display text-[2.4rem] leading-tight">{parents || 'vocês'}</h1>
          <p className="text-[15px] text-[#6b5c62]">
            Da semana {first} à semana {last?.week ?? first} · {last && !last.open ? 'uma história guardada com carinho' : 'uma história que continua'}
          </p>
        </section>

        {chapters.map(c =>
          c.quiet && !c.open ? (
            <p key={c.week} className="tt-livro-capitulo text-[13px] italic text-[#8a7b80] py-2 border-t border-[#eee]">
              Capítulo {c.week} · {c.story}
            </p>
          ) : (
            <section key={c.week} className="tt-livro-capitulo pt-8 pb-6 border-t border-[#eee] space-y-4">
              <div className="flex items-center gap-4">
                <BabyArt week={Math.max(4, c.week)} tone={tone} className="w-24 h-24 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#c2456b]">
                    Capítulo {c.week} · {formatBR(c.from)} a {formatBR(c.to)}
                  </p>
                  <h2 className="font-display text-[1.6rem] leading-tight">{titleOf(c)}</h2>
                  <p className="text-[13px] text-[#6b5c62]">
                    {c.baby} · {stageAt(Math.max(4, c.week)).title}
                  </p>
                </div>
              </div>
              {c.cover && <img src={photoUrl(c.cover.photo.id)} alt="" className="w-full max-h-[420px] object-cover rounded-2xl" />}
              <p className="text-[15.5px] leading-relaxed">{c.story}</p>
              {[...c.entries].reverse().map(e => (
                <div key={e.id} className="tt-livro-registro space-y-2">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8a7b80]">
                    {FOLDER[e.folder].singular} · {formatBR(e.entry_date.slice(0, 10))}
                  </p>
                  {e.body && <p className={`text-[15px] leading-relaxed whitespace-pre-line ${e.folder === 'carta' || e.folder === 'momento' ? 'font-display text-[1.1rem]' : ''}`}>{e.body}</p>}
                  {e.photos.filter(p => p.id !== c.cover?.photo.id).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {e.photos
                        .filter(p => p.id !== c.cover?.photo.id)
                        .map(p => (
                          <img key={p.id} src={photoUrl(p.id)} alt="" className="w-full aspect-square object-cover rounded-xl" />
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ),
        )}
        {last?.open && <p className="text-center font-display text-[1.2rem] text-[#c2456b] pt-8">Continua…</p>}
      </article>
    </div>
  );
}
