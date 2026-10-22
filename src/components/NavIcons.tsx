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

/** O calendário com o dia de hoje: muda todo dia, sem precisar abrir a aba. */
function Agenda({ on }: IconProps) {
  const day = new Date().getDate();
  return (
    <svg {...base} stroke="currentColor">
      <rect x="3.5" y="5" width="17" height="16" rx="3.5" fill={on ? 'currentColor' : 'none'} />
      <path d="M8 3v4M16 3v4" />
      <path d="M3.8 10h16.4" stroke={on ? CUT : 'currentColor'} />
      <text x="12" y="18.4" textAnchor="middle" fontSize="8.2" fontWeight="800" fontFamily="var(--font-sans)" fill={on ? CUT : 'currentColor'} stroke="none">
        {day}
      </text>
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

/** O rostinho do bebê da Jornada: olhinhos fechados, bochechas, sorriso e o cachinho. */
function Birth({ on }: IconProps) {
  const detail = on ? CUT : 'currentColor';
  return (
    <svg {...base} stroke="currentColor">
      <circle cx="12" cy="13.2" r="7.8" fill={on ? 'currentColor' : 'none'} />
      <path d="M11.6 5.4c-.6-2.3 2.6-3.2 3.1-1.2.3 1.3-1.3 1.6-1.5.7" />
      <path d="M8.2 12.6q1.3 1.2 2.6 0M13.2 12.6q1.3 1.2 2.6 0" stroke={detail} strokeWidth={1.5} />
      <circle cx="8.4" cy="15" r="1" fill={detail} stroke="none" opacity={0.45} />
      <circle cx="15.6" cy="15" r="1" fill={detail} stroke="none" opacity={0.45} />
      <path d="M10.9 15.7q1.1 1 2.2 0" stroke={detail} strokeWidth={1.4} />
    </svg>
  );
}

const ICONS: Record<Tab, (p: IconProps) => React.ReactElement> = { inicio: Home, diario: Diary, agenda: Agenda, cuidados: Care, parto: Birth };

export default function NavIcon({ tab, on }: { tab: Tab; on: boolean }) {
  const Icon = ICONS[tab];
  return <Icon on={on} />;
}
