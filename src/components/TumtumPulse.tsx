import { useEffect, useState } from 'react';
import { TUMTUM_EVENT } from '../lib/feel';

// O tum-tum que se vê: onde a pessoa tocou, um halo rosa e lilás se abre e um
// coraçãozinho bate duas vezes e sobe, em menos de um segundo, sem tapar nada
// (não recebe toques). Com "reduzir movimento", só aparece e some.

interface Beat {
  id: number;
  x: number;
  y: number;
}

export default function TumtumPulse() {
  const [beats, setBeats] = useState<Beat[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const at = (e as CustomEvent<{ x: number; y: number } | null>).detail;
      const beat = { id: ++n, x: at?.x ?? window.innerWidth / 2, y: at?.y ?? window.innerHeight / 2 };
      setBeats(b => [...b.slice(-2), beat]);
      window.setTimeout(() => setBeats(b => b.filter(x => x.id !== beat.id)), 1100);
    };
    window.addEventListener(TUMTUM_EVENT, on);
    return () => window.removeEventListener(TUMTUM_EVENT, on);
  }, []);
  if (!beats.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {beats.map(b => (
        <span key={b.id} className="absolute" style={{ left: b.x, top: b.y }} data-tumtum>
          <span className="tt-tumtum-halo absolute -left-10 -top-10 w-20 h-20 rounded-full" />
          <svg viewBox="0 0 24 24" className="tt-tumtum-coracao absolute -left-4 -top-4 w-8 h-8">
            <defs>
              <linearGradient id={`tt-g-${b.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--color-rosa)" />
                <stop offset="1" stopColor="var(--color-lilas)" />
              </linearGradient>
            </defs>
            <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 5 6.4 5c2.1 0 3.6 1.2 4.4 2.6h2.4C14 6.2 15.5 5 17.6 5 21 5 23.1 8.3 21.6 11.7 19.5 16.4 12 21 12 21z" fill={`url(#tt-g-${b.id})`} />
          </svg>
        </span>
      ))}
    </div>
  );
}
