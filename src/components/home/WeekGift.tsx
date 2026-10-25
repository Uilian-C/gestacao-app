import { useState } from 'react';
import { tumtum } from '../../lib/feel';

// A semana nova chega embrulhada: um presente no lugar do bebê, que se abre com
// um toque (a tampa sobe, o coração surge e bate) e revela o novo desenho.
// Abre uma vez por semana neste aparelho.

export default function WeekGift({ week, onOpen }: { week: number; onOpen: () => void }) {
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (opening) return;
    setOpening(true);
    tumtum();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(onOpen, reduced ? 0 : 950);
  };
  return (
    <button type="button" onClick={open} aria-label={`A semana ${week} chegou: abrir o presente`} className={`relative w-40 h-40 sm:w-44 sm:h-44 rounded-full ${opening ? 'tt-presente-abrindo' : 'tt-presente'}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden>
        <defs>
          <linearGradient id="tt-presente-caixa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-rosa)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--color-rosa-strong)" />
          </linearGradient>
        </defs>
        {/* O coração que estava guardado. */}
        <path className="tt-presente-coracao" d="M60 72 C 48 63, 42 56, 42 49 a 9 9 0 0 1 18 -3 a 9 9 0 0 1 18 3 c 0 7 -6 14 -18 23 z" fill="var(--color-rosa)" />
        <g className="tt-presente-base">
          <rect x="30" y="62" width="60" height="38" rx="9" fill="url(#tt-presente-caixa)" />
          <rect x="55" y="62" width="10" height="38" fill="#fff" opacity="0.85" />
        </g>
        <g className="tt-presente-tampa">
          <rect x="25" y="50" width="70" height="15" rx="7" fill="var(--color-rosa-strong)" />
          <rect x="55" y="50" width="10" height="15" fill="#fff" opacity="0.9" />
          <path d="M60 50 C 50 36, 36 42, 46 50 Z M60 50 C 70 36, 84 42, 74 50 Z" fill="#efe4ff" stroke="var(--color-lilas)" strokeWidth="1.5" />
        </g>
        {/* Brilhinhos em volta. */}
        <g className="tt-presente-brilho" fill="var(--color-lilas)">
          <path d="M22 40 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" />
          <path d="M98 34 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" opacity="0.7" />
          <path d="M100 82 l1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1z" opacity="0.6" />
        </g>
      </svg>
    </button>
  );
}
