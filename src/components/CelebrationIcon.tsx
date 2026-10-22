import type { CelebrationKind } from '../lib/celebrations';

// Ícones das celebrações, no mesmo traço dos ícones das abas, cada um com um
// coraçãozinho escondido: a mamadeira, a fralda, o balão do segredo, a câmera
// do ensaio e o coração com brilho (do jeito de vocês).

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

/** Coraçãozinho cheio, centrado em (x, y). */
const Heart = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 2.3C-1.5 1.3-2.3.5-2.3-.5a1.15 1.15 0 0 1 2.3-.5 1.15 1.15 0 0 1 2.3.5C2.3.5 1.5 1.3 0 2.3z" fill="currentColor" stroke="none" />
);

const DRAW: Record<CelebrationKind, React.ReactNode> = {
  cha_bebe: (
    <>
      <path d="M10.7 5.3c0-1.5.6-2.6 1.3-2.6s1.3 1.1 1.3 2.6" />
      <rect x="8.6" y="5.3" width="6.8" height="2.3" rx="1.1" />
      <path d="M9.2 7.6h5.6l.9 2.4v8.8a2.6 2.6 0 0 1-2.6 2.6h-2.2a2.6 2.6 0 0 1-2.6-2.6V10z" />
      <path d="M8.4 12h2M8.4 15h1.6" strokeWidth={1.4} />
      <Heart x={13.3} y={14.6} />
    </>
  ),
  cha_fraldas: (
    <>
      <path d="M3.3 7.2h17.4v2.4c0 5-3.9 8.9-8.7 8.9s-8.7-3.9-8.7-8.9z" />
      <path d="M3.4 10.3c1.6 0 2.6.9 2.9 2.2M20.6 10.3c-1.6 0-2.6.9-2.9 2.2" strokeWidth={1.4} />
      <Heart x={12} y={12.2} s={1.05} />
    </>
  ),
  cha_revelacao: (
    <>
      <path d="M12 15.4c-3.1 0-5.6-3-5.6-6.3a5.6 5.6 0 0 1 11.2 0c0 3.3-2.5 6.3-5.6 6.3z" />
      <path d="M11 15.4h2l-1 1.3z" fill="currentColor" />
      <path d="M12 16.7c-1.2 1.3 1.2 2.4 0 4.1" />
      <path d="M10.4 7.9a1.6 1.6 0 1 1 2.4 1.4c-.6.3-.8.7-.8 1.3" strokeWidth={1.5} />
      <circle cx="12" cy="12.3" r=".55" fill="currentColor" stroke="none" />
    </>
  ),
  ensaio: (
    <>
      <path d="M8.3 7.2 9.6 5h4.8l1.3 2.2" />
      <rect x="3" y="7.2" width="18" height="12.6" rx="3.2" />
      <circle cx="12" cy="13.4" r="3.9" />
      <Heart x={12} y={13.3} />
      <circle cx="17.6" cy="10.2" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
  outra: (
    <>
      <path d="M11 20.2S3.4 15.8 3.4 10.4A4.1 4.1 0 0 1 11 8.3a4.1 4.1 0 0 1 7.6 2.1c0 5.4-7.6 9.8-7.6 9.8z" />
      <path d="M18.6 2.6v3.2M17 4.2h3.2" strokeWidth={1.5} />
      <path d="M21 7.6v1.6M20.2 8.4h1.6" strokeWidth={1.3} />
    </>
  ),
};

export default function CelebrationIcon({ kind, className = 'w-6 h-6' }: { kind: CelebrationKind; className?: string }) {
  return (
    <svg {...base} className={className}>
      {DRAW[kind]}
    </svg>
  );
}

/** O ícone num ladrilho rosa, como nas listas (branco quando o fundo já é rosa). */
export function CelebrationTile({ kind, size = 'md', onTint = false }: { kind: CelebrationKind; size?: 'sm' | 'md' | 'lg'; onTint?: boolean }) {
  const box = size === 'lg' ? 'w-14 h-14 rounded-[20px]' : size === 'sm' ? 'w-10 h-10 rounded-[14px]' : 'w-12 h-12 rounded-2xl';
  const icon = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';
  return (
    <span className={`${box} shrink-0 ${onTint ? 'bg-surface shadow-soft' : 'bg-rosa-soft'} text-rosa flex items-center justify-center`} aria-hidden>
      <CelebrationIcon kind={kind} className={icon} />
    </span>
  );
}
