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

/** "Dar à luz": o sol nascendo no horizonte. Aceso, o sol fica cheio, com um coraçãozinho vazado. */
function Birth({ on }: IconProps) {
  return (
    <svg {...base} stroke="currentColor">
      <path d="M5.6 17.5a6.4 6.4 0 0 1 12.8 0" fill={on ? 'currentColor' : 'none'} />
      <path d="M12 8.9V7M16.9 10.4l1.1-1.4M7.1 10.4 6 9M19.9 14.3l1.6-.6M4.1 14.3l-1.6-.6M2.5 17.5h19" />
      {on && <path d="M12 16.4c-1.3-.85-2-1.5-2-2.35a1 1 0 0 1 2-.45 1 1 0 0 1 2 .45c0 .85-.7 1.5-2 2.35z" fill={CUT} stroke={CUT} strokeWidth={1} />}
    </svg>
  );
}

const ICONS: Record<Tab, (p: IconProps) => React.ReactElement> = { inicio: Home, diario: Diary, agenda: Agenda, cuidados: Care, parto: Birth };

export default function NavIcon({ tab, on }: { tab: Tab; on: boolean }) {
  const Icon = ICONS[tab];
  return <Icon on={on} />;
}
