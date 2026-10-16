import { Baby, CalendarDays, House, LineChart, NotebookPen, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tab } from '../types';

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'inicio', label: 'Início', icon: <House /> },
  { id: 'agenda', label: 'Agenda', icon: <CalendarDays /> },
  { id: 'diario', label: 'Diário', icon: <NotebookPen /> },
  { id: 'painel', label: 'Painel', icon: <LineChart /> },
  { id: 'consultas', label: 'Consultas', icon: <Stethoscope /> },
  { id: 'parto', label: 'Parto', icon: <Baby /> },
];

/** Abas em pílula no computador; no celular, uma barra flutuante ao alcance do polegar. */
export default function Nav({ active, onChange, badges }: { active: Tab; onChange: (tab: Tab) => void; badges: Partial<Record<Tab, number>> }) {
  return (
    <>
      <nav className="no-print hidden md:block sticky top-0 z-30 bg-canvas/85 backdrop-blur-md" aria-label="Seções">
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-1">
          {TABS.map(t => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition [&_svg]:w-[18px] [&_svg]:h-[18px] ${on ? 'bg-surface text-brand shadow-soft' : 'text-ink-mute hover:text-ink'}`}
              >
                {t.icon}
                {t.label}
                {!!badges[t.id] && <span className="min-w-5 h-5 px-1.5 rounded-full bg-warm text-on-accent text-[11px] font-semibold flex items-center justify-center tabular">{badges[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <nav
        className="no-print md:hidden fixed inset-x-3 z-40 rounded-[26px] bg-surface/90 backdrop-blur-md shadow-lift"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        aria-label="Seções"
      >
        <div className="grid grid-cols-6 px-1 py-1.5">
          {TABS.map(t => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-1.5 text-[10.5px] font-medium transition [&_svg]:w-[21px] [&_svg]:h-[21px] ${on ? 'text-brand' : 'text-ink-mute'}`}
              >
                <span className={`flex items-center justify-center w-11 h-8 rounded-full transition ${on ? 'bg-brand-soft' : ''}`}>{t.icon}</span>
                {t.label}
                {!!badges[t.id] && <span className="absolute top-0.5 right-[calc(50%-20px)] min-w-4 h-4 px-1 rounded-full bg-warm text-on-accent text-[10px] font-semibold ring-2 ring-surface flex items-center justify-center tabular">{badges[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
