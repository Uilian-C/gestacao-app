import { AlertTriangle, Clock, Info, Sparkles, TrendingDown } from 'lucide-react';
import type { Insight, InsightTone } from '../lib/symptoms';

// Cada tom tem ícone e rótulo, para não depender só da cor.
const TONES: Record<InsightTone, { icon: React.ReactNode; label: string; className: string }> = {
  alerta: { icon: <AlertTriangle className="w-4 h-4" />, label: 'Alerta', className: 'bg-alert-soft text-alert' },
  atencao: { icon: <Clock className="w-4 h-4" />, label: 'Atenção', className: 'bg-warn-soft text-warn' },
  info: { icon: <Info className="w-4 h-4" />, label: 'Padrão', className: 'bg-brand-soft text-brand-strong' },
  bom: { icon: <TrendingDown className="w-4 h-4" />, label: 'Melhora', className: 'bg-ok-soft text-ok' },
};

export function InsightList({ insights, compact = false, onSelect }: { insights: Insight[]; compact?: boolean; onSelect?: (insight: Insight) => void }) {
  if (insights.length === 0) {
    return (
      <p className="text-ink-soft flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand" /> Nenhum padrão chamou atenção neste período.
      </p>
    );
  }
  return (
    <ul className={compact ? 'space-y-2.5' : 'space-y-3'}>
      {insights.map(i => {
        const tone = TONES[i.tone];
        const content = (
          <>
            <span className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tone.className}`} aria-label={tone.label}>
              {tone.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{i.title}</span>
              {!compact && <span className="block text-sm text-ink-soft">{i.detail}</span>}
            </span>
          </>
        );
        return (
          <li key={i.id}>
            {onSelect && i.symptomKey ? (
              <button onClick={() => onSelect(i)} className="flex gap-3 text-left w-full rounded-2xl hover:bg-surface-2 -m-1.5 p-1.5">{content}</button>
            ) : (
              <div className="flex gap-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
