import NavIcon from './NavIcons';
import type { Tab } from '../types';

const TAB_LABEL: Record<Tab, string> = { inicio: 'Início', diario: 'Diário', agenda: 'Agenda', cuidados: 'Cuidados', parto: 'Parto' };

const TABS: Array<{ id: Tab }> = [{ id: 'inicio' }, { id: 'diario' }, { id: 'agenda' }, { id: 'cuidados' }, { id: 'parto' }];

/**
 * Abas em pílula no computador; no celular, uma barra flutuante ao alcance do polegar.
 * A aba ativa ganha a cor dela (ver data-aba no index.css), ícone cheio e nome em negrito.
 */
export default function Nav({ active, onChange, badges }: { active: Tab; onChange: (tab: Tab) => void; badges: Partial<Record<Tab, number>> }) {
  return (
    <>
      <nav className="no-print hidden md:block sticky top-0 z-30 bg-canvas/85 backdrop-blur-md" aria-label="Seções">
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-1.5">
          {TABS.map(t => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm transition [&_svg]:w-[18px] [&_svg]:h-[18px] ${on ? 'bg-brand-soft text-brand-strong font-bold shadow-soft' : 'font-medium text-ink-mute hover:text-ink hover:bg-surface'}`}
              >
                <NavIcon tab={t.id} on={on} />
                {TAB_LABEL[t.id]}
                {!!badges[t.id] && <span className="min-w-5 h-5 px-1.5 rounded-full bg-warm text-on-accent text-[11px] font-semibold flex items-center justify-center tabular">{badges[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <nav
        className="no-print md:hidden fixed inset-x-3 z-40 rounded-[26px] bg-surface/95 backdrop-blur-md shadow-lift"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        aria-label="Seções"
      >
        <div className="grid grid-cols-5 px-1 py-1.5">
          {TABS.map(t => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-1.5 text-[11px] transition [&_svg]:w-[23px] [&_svg]:h-[23px] ${on ? 'text-brand-strong font-extrabold' : 'text-ink-mute font-semibold'}`}
              >
                <span className={`flex items-center justify-center w-12 h-8 rounded-full transition ${on ? 'bg-brand-soft' : ''}`}>
                  <NavIcon tab={t.id} on={on} />
                </span>
                {TAB_LABEL[t.id]}
                {!!badges[t.id] && <span className="absolute top-0.5 right-[calc(50%-22px)] min-w-4 h-4 px-1 rounded-full bg-warm text-on-accent text-[10px] font-semibold ring-2 ring-surface flex items-center justify-center tabular">{badges[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
