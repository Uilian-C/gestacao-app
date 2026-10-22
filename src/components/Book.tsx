import { BookOpen, PenLine } from 'lucide-react';
import { photoUrl } from '../api';
import type { Chapter } from '../lib/chapters';
import { parseLocalDate } from '../lib/dates';
import { shortDate } from '../lib/folders';

// O livro de vocês: cada semana é um capítulo, contado como história (e não
// como tabela). No Mural aparece o capítulo que acabou de fechar; no Diário →
// Livro, todos, do mais novo ao mais antigo.

/** "16 a 22 out". */
const span = (c: Chapter) => `${parseLocalDate(c.from).getDate()} a ${shortDate(c.to)}`;

export function ChapterCard({ chapter: c, onOpenEntry }: { chapter: Chapter; onOpenEntry: (id: string) => void }) {
  if (c.quiet && !c.open) {
    return (
      <article aria-label={`Capítulo ${c.week}`} className="flex items-baseline gap-3 rounded-[22px] bg-surface-2/60 px-4 py-3">
        <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute shrink-0">Capítulo {c.week}</span>
        <span className="text-[13.5px] text-ink-soft italic">{c.story}</span>
      </article>
    );
  }
  const label = (
    <>
      Capítulo {c.week} · {c.open ? 'sendo escrito' : span(c)}
    </>
  );
  return (
    <article aria-label={`Capítulo ${c.week}`} className={`rounded-[28px] overflow-hidden ${c.open ? 'bg-surface border-2 border-dashed border-line' : 'bg-surface shadow-soft'}`}>
      {c.cover ? (
        <button type="button" onClick={() => onOpenEntry(c.cover!.entryId)} className="relative block w-full" aria-label={`Capítulo ${c.week}: ver a foto`}>
          <img src={photoUrl(c.cover.photo.id)} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover bg-surface-2" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12 text-left">
            <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-white/85">{label}</span>
            <span className="block font-display text-[1.45rem] leading-tight text-white text-balance">{c.personal ? `“${c.title}”` : c.title}</span>
          </span>
        </button>
      ) : (
        <header className="px-5 pt-5">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-rosa">{label}</p>
          <h3 className="font-display text-[1.45rem] leading-tight text-ink text-balance">{c.personal ? `“${c.title}”` : c.title}</h3>
        </header>
      )}
      <div className="px-5 pt-3 pb-5 space-y-3">
        <p className="text-[15px] leading-relaxed text-ink">{c.story}</p>
        {c.highlight && !c.open && (
          <button type="button" onClick={() => onOpenEntry(c.highlight!.entryId)} className="block w-full text-left border-l-[3px] border-rosa/60 pl-3">
            <span className="block font-display text-[1.05rem] italic leading-snug text-ink">“{c.highlight.quote}”</span>
            <span className="block text-[12px] font-bold text-rosa-strong mt-0.5">{c.highlight.hugged ? 'A lembrança mais abraçada' : 'Para guardar desta semana'}</span>
          </button>
        )}
      </div>
    </article>
  );
}

/** O capítulo que acabou de fechar, no topo do Mural, com o convite para o próximo. */
export function FreshChapter({ chapter, onOpenEntry, onWrite, onOpenBook }: { chapter: Chapter; onOpenEntry: (id: string) => void; onWrite?: () => void; onOpenBook: () => void }) {
  return (
    <section aria-label="Capítulo da semana" className="space-y-2">
      <ChapterCard chapter={chapter} onOpenEntry={onOpenEntry} />
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

/** Diário → Livro: a lombada (uma marquinha por semana) e os capítulos. */
export function BookView({ book, onOpenEntry }: { book: Chapter[]; onOpenEntry: (id: string) => void }) {
  const written = book.filter(c => !c.quiet);
  const memories = book.reduce((n, c) => n + c.entries.length, 0);
  const current = book[0]?.week ?? FIRST;
  const filled = new Set(written.map(c => c.week));
  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <header className="rounded-[28px] bg-gradient-to-b from-rosa-soft to-surface px-5 pt-5 pb-4 shadow-soft">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">O livro de vocês</p>
        <h2 className="font-display text-[1.5rem] leading-tight text-ink">
          {written.length === 0 ? 'A primeira página espera por vocês' : `${written.length === 1 ? 'Um capítulo escrito' : `${written.length} capítulos escritos`}, ${memories === 1 ? 'uma lembrança' : `${memories} lembranças`}`}
        </h2>
        <p className="text-[13px] text-ink-soft mt-1">Cada semana vira um capítulo. No fim, um livro só de vocês.</p>
        {/* A lombada: uma marquinha por semana, cheia quando o capítulo tem lembranças. */}
        <div className="mt-3 flex gap-[3px]" role="img" aria-label={`Semanas com lembranças: ${written.length} de ${LAST - FIRST + 1}`}>
          {Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).map(w => (
            <span
              key={w}
              className={`flex-1 h-3 rounded-full ${filled.has(w) ? 'bg-rosa' : w === current ? 'bg-surface border border-dashed border-rosa' : w < current ? 'bg-rosa/20' : 'bg-line/60'}`}
            />
          ))}
        </div>
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
              <ChapterCard chapter={run[0]} onOpenEntry={onOpenEntry} />
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
