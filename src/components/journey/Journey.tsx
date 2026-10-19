import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { PHASES, PLAN_SOURCE } from '../../content/prenatalPlan';
import { phaseOf } from '../../lib/journey';
import { Pill } from '../ui';

/** Conteúdo de referência: o que importa em cada fase (visual de guia). */
export function PhaseGuide({ currentWeek }: { currentWeek: number }) {
  const phase = phaseOf(currentWeek);
  const [openPhase, setOpenPhase] = useState<string | null>(phase.id);
  return (
    <section className="rounded-[28px] bg-surface-2/70 p-5 md:p-7">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-mute mb-1">
        <BookOpen className="w-3.5 h-3.5" /> Guia
      </p>
      <h2 className="text-[1.2rem] text-ink mb-2">O que importa em cada fase</h2>
      <ul className="divide-y divide-line">
        {PHASES.map(p => {
          const isOpen = openPhase === p.id;
          const isNow = p.id === phase.id;
          return (
            <li key={p.id}>
              <button type="button" onClick={() => setOpenPhase(isOpen ? null : p.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 py-3 text-left">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isNow ? 'bg-brand' : currentWeek > p.to ? 'bg-ok' : 'bg-line'}`} />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-ink">{p.title}</span>
                  <span className="text-xs text-ink-mute"> · {p.label}, sem. {p.from}–{p.to}</span>
                </span>
                {isNow && <Pill tone="brand">agora</Pill>}
                <ChevronDown className={`w-4 h-4 text-ink-mute transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="pb-4 pl-5 space-y-2">
                  <p className="text-sm text-ink-soft">{p.focus}</p>
                  <p className="text-xs font-semibold text-ink">{p.visits}</p>
                  <ul className="space-y-1.5">
                    {p.care.map(c => (
                      <li key={c} className="text-sm text-ink flex gap-2">
                        <span className="text-brand">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ink-mute mt-3">{PLAN_SOURCE}</p>
    </section>
  );
}
