import { Check } from 'lucide-react';
import { KIND_ICON } from './kindIcon';
import { PHASES, type PlanItem } from '../../data/prenatalPlan';
import { phaseOf, windowText, type ItemStatus, type Step } from '../../lib/journey';

export function StatusPill({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, [string, string]> = {
    feito: ['feito', 'bg-ok-soft text-ok'],
    pendente: ['pendente', 'bg-warn-soft text-warn'],
    agora: ['agora', 'bg-brand-soft text-brand-strong'],
    'em-breve': ['em breve', 'bg-surface-2 text-ink-soft'],
    depois: ['depois', 'bg-surface-2 text-ink-mute'],
  };
  const [label, cls] = map[status];
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
}

/** Botão redondo de "feito": um toque marca, outro desmarca. */
export function DoneToggle({ done, label, busy, onToggle }: { done: boolean; label: string; busy?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={done}
      aria-label={done ? `Desmarcar "${label}"` : `Marcar "${label}" como feito`}
      className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition ${done ? 'bg-ok text-on-accent' : 'border-2 border-line hover:border-brand text-transparent hover:text-brand'}`}
    >
      <Check className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}

/** As quatro fases da gestação numa faixa, com a semana atual marcada. */
export function PhaseStrip({ week }: { week: number }) {
  const current = phaseOf(week);
  const start = PHASES[0].from;
  const end = PHASES[PHASES.length - 1].to;
  const pos = Math.min(100, Math.max(0, ((week - start) / (end - start)) * 100));
  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-1 h-2">
          {PHASES.map(p => (
            <div
              key={p.id}
              className={`rounded-full ${p.id === current.id ? 'bg-brand' : week > p.to ? 'bg-brand/40' : 'bg-surface-2'}`}
              style={{ flex: p.to - p.from + 1 }}
            />
          ))}
        </div>
        <span className="absolute -top-1 w-4 h-4 rounded-full bg-surface border-[3px] border-brand shadow-soft" style={{ left: `calc(${pos}% - 8px)` }} aria-hidden />
      </div>
      <div className="flex gap-1 text-[11px] text-ink-mute">
        {PHASES.map(p => (
          <span key={p.id} className={`truncate ${p.id === current.id ? 'text-ink font-semibold' : ''}`} style={{ flex: p.to - p.from + 1 }}>
            {p.title}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Lista curta do que fazer a seguir, com o "feito" a um toque. */
export function StepList({ steps, dumDate, busy, onToggle }: { steps: Step[]; dumDate: string; busy: boolean; onToggle: (item: PlanItem, done: boolean) => void }) {
  return (
    <ul className="divide-y divide-line">
      {steps.map(({ item, status }) => {
        const Icon = KIND_ICON[item.kind];
        return (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-surface-2 text-ink-soft flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink leading-snug">{item.title}</p>
              <p className="text-xs text-ink-mute flex flex-wrap items-center gap-1.5 mt-0.5">
                <StatusPill status={status} /> {windowText(item, status, dumDate)}
              </p>
            </div>
            <DoneToggle done={status === 'feito'} label={item.title} busy={busy} onToggle={() => onToggle(item, status !== 'feito')} />
          </li>
        );
      })}
    </ul>
  );
}
