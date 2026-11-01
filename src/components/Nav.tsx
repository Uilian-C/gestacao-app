import { Plus } from 'lucide-react';
import NavIcon from './NavIcons';
import type { Tab } from '../types';

const TAB_LABEL: Record<Tab, string> = { inicio: 'Início', diario: 'Diário', agenda: 'Agenda', cuidados: 'Cuidados', parto: 'Parto' };

const TABS: Array<{ id: Tab }> = [{ id: 'inicio' }, { id: 'diario' }, { id: 'agenda' }, { id: 'cuidados' }, { id: 'parto' }];

/**
 * Abas em pílula no computador; no celular, uma barra flutuante ao alcance do polegar.
 * A aba ativa ganha a cor dela (ver data-aba no index.css), ícone cheio e nome em negrito.
 * Quando há carinho novo (o outro postou ou comentou), o ícone dá a batida do
 * Tumtum de vez em quando, com um pontinho rosa, no lugar de um número.
 * O "Registrar" mora no centro do menu (no computador, no fim da fileira): nada
 * flutua por cima do conteúdo.
 */
export default function Nav({ active, onChange, onRecord, badges, pulse = {}, hidden = [] }: { active: Tab; onChange: (tab: Tab) => void; onRecord?: () => void; badges: Partial<Record<Tab, number>>; pulse?: Partial<Record<Tab, boolean>>; hidden?: Tab[] }) {
  // No modo cuidado o Parto sai do menu.
  const tabs = TABS.filter(t => !hidden.includes(t.id));
  // No celular, o Registrar fica no meio, depois de Início e Diário.
  const mobile: Array<{ id: Tab } | null> = onRecord ? [...tabs.slice(0, 2), null, ...tabs.slice(2)] : tabs;
  return (
    <>
      <nav className="no-print hidden md:block sticky top-0 z-30 bg-canvas/85 backdrop-blur-md" aria-label="Seções">
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-1.5">
          {tabs.map(t => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm transition [&_svg]:w-[18px] [&_svg]:h-[18px] ${on ? 'bg-brand-soft text-brand-strong font-bold shadow-soft' : 'font-medium text-ink-mute hover:text-ink hover:bg-surface'}`}
              >
                <span className={pulse[t.id] && !on ? 'tt-menu-batida' : undefined}>
                  <NavIcon tab={t.id} on={on} />
                </span>
                {TAB_LABEL[t.id]}
                {pulse[t.id] && !on && <span className="w-2 h-2 rounded-full bg-rosa" aria-label="novidades" />}
                {!!badges[t.id] && <span className="min-w-5 h-5 px-1.5 rounded-full bg-warm text-on-accent text-[11px] font-semibold flex items-center justify-center tabular">{badges[t.id]}</span>}
              </button>
            );
          })}
          {onRecord && (
            <button type="button" onClick={onRecord} className="tt-registrar relative ml-auto flex items-center gap-1.5 h-9 pl-3 pr-4 rounded-full text-white text-sm font-extrabold transition active:scale-95 hover:brightness-110">
              <Plus className="w-4 h-4" strokeWidth={3} /> Registrar
            </button>
          )}
        </div>
      </nav>

      <nav
        className="no-print md:hidden fixed inset-x-3 z-40 rounded-[26px] bg-surface/95 backdrop-blur-md shadow-lift"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        aria-label="Seções"
      >
        <div className={`grid px-1 py-1.5 ${['grid-cols-4', 'grid-cols-5', 'grid-cols-6'][mobile.length - 4]}`}>
          {mobile.map(t => {
            if (!t)
              return (
                <button key="registrar" type="button" onClick={onRecord} aria-label="Registrar" className="relative flex flex-col items-center justify-end gap-1 py-1.5 text-[11px] font-extrabold text-brand-strong">
                  <span className="tt-registrar relative -mt-6 w-[52px] h-[52px] rounded-full text-white flex items-center justify-center ring-4 ring-surface transition active:scale-95">
                    <Plus className="w-6 h-6" strokeWidth={3} />
                  </span>
                  Registrar
                </button>
              );
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-1.5 text-[11px] transition [&_svg]:w-[23px] [&_svg]:h-[23px] ${on ? 'text-brand-strong font-extrabold' : 'text-ink-mute font-semibold'}`}
              >
                <span className={`flex items-center justify-center w-12 h-8 rounded-full transition ${on ? 'bg-brand-soft' : ''} ${pulse[t.id] && !on ? 'tt-menu-batida text-rosa' : ''}`}>
                  <NavIcon tab={t.id} on={on} />
                </span>
                {TAB_LABEL[t.id]}
                {pulse[t.id] && !on && <span className="absolute top-1 right-[calc(50%-18px)] w-2 h-2 rounded-full bg-rosa ring-2 ring-surface" aria-label="novidades" />}
                {!!badges[t.id] && <span className="absolute top-0.5 right-[calc(50%-22px)] min-w-4 h-4 px-1 rounded-full bg-warm text-on-accent text-[10px] font-semibold ring-2 ring-surface flex items-center justify-center tabular">{badges[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
