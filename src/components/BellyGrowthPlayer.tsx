import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { photoUrl } from '../api';
import type { EntryPhoto } from '../hooks/useGestationData';

// O "crescendo": as fotos da barriga, semana a semana, passando sozinhas como
// um filminho. Só existe se o ritual se mantiver: a recompensa de quem fotografa
// toda semana.

export default function BellyGrowthPlayer({ shots }: { shots: Array<{ week: number; photo: EntryPhoto }> }) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setAt(i => (i + 1) % shots.length), 1100);
    return () => window.clearInterval(t);
  }, [playing, shots.length]);
  const shot = shots[at];
  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[340px] aspect-[3/4] overflow-hidden rounded-[24px] bg-surface-2">
        {shots.map((s, i) => (
          <img key={s.photo.id} src={photoUrl(s.photo.id)} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === at ? 'opacity-100' : 'opacity-0'}`} />
        ))}
        <span className="absolute left-3 bottom-3 rounded-full bg-black/45 px-3 py-1 text-[13px] font-extrabold text-white" aria-live="polite">
          Semana {shot.week}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pausar' : 'Tocar'} className="w-10 h-10 shrink-0 rounded-full bg-lilas-soft text-lilas-strong flex items-center justify-center">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <input type="range" min={0} max={shots.length - 1} value={at} onChange={e => (setPlaying(false), setAt(Number(e.target.value)))} aria-label="Semana" className="flex-1 accent-[var(--c-lilas)]" />
      </div>
      <p className="text-center text-[13px] text-ink-soft">{shots.length} semanas de barriguinha. Continuem: cada foto nova entra no filme.</p>
    </div>
  );
}
