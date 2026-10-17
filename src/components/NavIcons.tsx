import type { Tab } from '../types';

// Ícones das abas, desenhados no mesmo traço: contorno quando a aba está
// apagada e cheios na cor da aba quando ativa, com os detalhes vazados.

interface IconProps {
  on: boolean;
}

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
// Cor dos detalhes vazados (porta, coração, traços): a da superfície, que muda no modo escuro.
const CUT = 'var(--c-surface)';

function Home({ on }: IconProps) {
  return (
    <svg {...base} stroke="currentColor">
      <path d="M4 10.6 12 4l8 6.6V19a2 2 0 0 1-2 2h-3.5v-5.2a2.5 2.5 0 0 0-5 0V21H6a2 2 0 0 1-2-2z" fill={on ? 'currentColor' : 'none'} />
    </svg>
  );
}

function Diary({ on }: IconProps) {
  return (
    <svg {...base} stroke="currentColor">
      <rect x="4.5" y="3" width="15" height="18" rx="3" fill={on ? 'currentColor' : 'none'} />
      <path d="M8.5 3.5v17" stroke={on ? CUT : 'currentColor'} />
      <path d="M14.2 14.8c-2-1.4-3.2-2.5-3.2-3.9a1.7 1.7 0 0 1 3.2-.8 1.7 1.7 0 0 1 3.2.8c0 1.4-1.2 2.5-3.2 3.9z" fill={on ? CUT : 'none'} stroke={on ? CUT : 'currentColor'} strokeWidth={1.5} />
    </svg>
  );
}

function Agenda({ on }: IconProps) {
  const dot = on ? CUT : 'currentColor';
  return (
    <svg {...base} stroke="currentColor">
      <rect x="3.5" y="5" width="17" height="16" rx="3.5" fill={on ? 'currentColor' : 'none'} />
      <path d="M8 3v4M16 3v4" />
      <path d="M3.8 10h16.4" stroke={on ? CUT : 'currentColor'} />
      {[
        [8.5, 14],
        [12, 14],
        [15.5, 14],
        [8.5, 17.3],
        [12, 17.3],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.05" fill={dot} stroke="none" />
      ))}
    </svg>
  );
}

function Care({ on }: IconProps) {
  return (
    <svg {...base} stroke="currentColor">
      <path d="M12 20.5S3.5 15.7 3.5 9.7A4.6 4.6 0 0 1 12 7.3a4.6 4.6 0 0 1 8.5 2.4c0 6-8.5 10.8-8.5 10.8z" fill={on ? 'currentColor' : 'none'} />
      <path d="M6.6 12.3h2.8l1.4-2.4 2.1 4.8 1.4-2.4h3.1" stroke={on ? CUT : 'currentColor'} strokeWidth={1.6} />
    </svg>
  );
}

function Birth({ on }: IconProps) {
  const detail = on ? CUT : 'currentColor';
  return (
    <svg {...base} stroke="currentColor">
      <circle cx="12" cy="13" r="8" fill={on ? 'currentColor' : 'none'} />
      <path d="M12 5c-.3-1.6.9-2.6 2.3-2.2" />
      <circle cx="9.3" cy="12.4" r="1" fill={detail} stroke="none" />
      <circle cx="14.7" cy="12.4" r="1" fill={detail} stroke="none" />
      <path d="M9.6 15.6a3.3 3.3 0 0 0 4.8 0" stroke={detail} strokeWidth={1.6} />
    </svg>
  );
}

const ICONS: Record<Tab, (p: IconProps) => React.ReactElement> = { inicio: Home, diario: Diary, agenda: Agenda, cuidados: Care, parto: Birth };

export default function NavIcon({ tab, on }: { tab: Tab; on: boolean }) {
  const Icon = ICONS[tab];
  return <Icon on={on} />;
}
