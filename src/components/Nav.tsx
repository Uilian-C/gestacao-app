import { Baby, CalendarDays, Home, LineChart, NotebookPen, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tab } from '../types';

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'inicio', label: 'Início', icon: <Home className="w-5 h-5" /> },
  { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'diario', label: 'Diário', icon: <NotebookPen className="w-5 h-5" /> },
  { id: 'painel', label: 'Painel', icon: <LineChart className="w-5 h-5" /> },
  { id: 'consultas', label: 'Consultas', icon: <Stethoscope className="w-5 h-5" /> },
  { id: 'parto', label: 'Parto', icon: <Baby className="w-5 h-5" /> },
];

/** Abas no topo no computador e barra fixa embaixo no celular, ao alcance do polegar. */
export default function Nav({ active, onChange, badges }: { active: Tab; onChange: (tab: Tab) => void; badges: Partial<Record<Tab, number>> }) {
  return (
    <>
      <nav className="no-print hidden md:block sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-line" aria-label="Seções">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={active === t.id ? 'page' : undefined}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition border-b-2 ${active === t.id ? 'text-brand border-brand' : 'text-ink-mute border-transparent hover:text-ink'}`}
            >
              {t.icon}
              {t.label}
              {!!badges[t.id] && <span className="min-w-5 h-5 px-1.5 rounded-full bg-warm text-on-accent text-[11px] flex items-center justify-center tabular">{badges[t.id]}</span>}
            </button>
          ))}
        </div>
      </nav>

      <nav
        className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Seções"
      >
        <div className="grid grid-cols-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={active === t.id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-bold transition ${active === t.id ? 'text-brand' : 'text-ink-mute'}`}
            >
              <span className={`px-3 py-1 rounded-full transition ${active === t.id ? 'bg-brand-soft' : ''}`}>{t.icon}</span>
              {t.label}
              {!!badges[t.id] && <span className="absolute top-1.5 right-[calc(50%-20px)] min-w-4 h-4 px-1 rounded-full bg-warm text-on-accent text-[10px] flex items-center justify-center tabular">{badges[t.id]}</span>}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
