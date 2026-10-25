import { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import BrandMark from './BrandMark';

// "Entrou no livro": logo depois de guardar uma lembrança, uma folha do livro
// aparece por um instante, recebe a lembrança e mostra em que capítulo ela
// ficou. É o fim bonito do registro (no lugar de um "Salvo"), e um toque leva
// ao livro.

export interface Stamp {
  /** O que foi guardado, em poucas palavras (ou a legenda da foto). */
  text: string;
  week: number;
  /** "Capítulo 5 · Os primeiros chutinhos" (quando o capítulo já existe). */
  chapter: string | null;
  /** Onde mais ficou: "No Mural, para vocês e a família". */
  also: string;
}

export default function BookStamp({ stamp, onOpenBook, onClose }: { stamp: Stamp; onOpenBook: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div className="no-print fixed inset-x-0 z-[60] flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+140px)] md:bottom-20 pointer-events-none" role="status" aria-live="polite">
      <div className="tt-carimbo pointer-events-auto w-full max-w-[380px] rounded-[24px] bg-surface shadow-lift overflow-hidden">
        <div className="flex items-stretch">
          {/* A folha do livro, com a lembrança descendo para dentro dela. */}
          <span aria-hidden className="relative w-20 shrink-0 bg-gradient-to-b from-rosa-soft to-lilas-soft flex items-center justify-center overflow-hidden">
            <span className="absolute inset-y-0 left-0 w-2 bg-rosa/20 border-r border-dashed border-surface/70" />
            <span className="tt-carimbo-folha block w-11 h-14 rounded-[6px] bg-surface shadow-soft px-1.5 pt-1.5 space-y-1">
              <span className="block h-1 rounded-full bg-rosa/50" />
              <span className="block h-1 w-3/4 rounded-full bg-line" />
              <span className="block h-1 rounded-full bg-line" />
              <span className="flex justify-center pt-0.5">
                <BrandMark className="w-4 h-4" />
              </span>
            </span>
          </span>
          <div className="flex-1 min-w-0 px-4 py-3">
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa-strong">Entrou no livro · semana {stamp.week}</p>
            <p className="font-display text-[1.02rem] leading-snug text-ink line-clamp-2">“{stamp.text}”</p>
            {stamp.chapter && <p className="text-[12.5px] font-semibold text-ink-soft truncate">{stamp.chapter}</p>}
            <p className="text-[12px] text-ink-mute truncate">{stamp.also}</p>
            <button type="button" onClick={onOpenBook} className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-rosa-strong">
              <BookOpen className="w-4 h-4" /> Ver no livro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
