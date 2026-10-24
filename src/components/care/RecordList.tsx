import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, HeartHandshake, Scale } from 'lucide-react';
import { isAlertSymptom } from '../../content/symptomCatalog';

import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure } from '../../lib/health';
import { normalizeSymptomName, timeOfDayLabel } from '../../lib/symptoms';
import type { HealthMetric, PartnerComment, SymptomItem } from '../../types';
import type { Reaction } from '../../hooks/useGestationData';
import { SocialCount } from '../Social';
import type { DetailTarget } from '../../lib/details';
import AuthorBadge from '../AuthorBadge';
import IntensityDots from '../IntensityDots';
import { Pill } from '../ui';
import { INTENSITY } from '../../lib/intensity';


/**
 * Os registros de saúde por dia (sintomas e medições), do mais novo ao mais
 * antigo. Mostra os 8 dias mais recentes e o resto a um toque.
 */
export default function RecordList({ symptoms, metrics, comments, reactions, onOpen, empty }: { symptoms: SymptomItem[]; metrics: HealthMetric[]; comments: PartnerComment[]; reactions: Reaction[]; onOpen: (target: DetailTarget) => void; empty: string }) {
  const [all, setAll] = useState(false);
  const days = useMemo(() => {
    const map = new Map<string, { symptoms: SymptomItem[]; metrics: HealthMetric[] }>();
    const day = (key: string) => map.get(key) ?? { symptoms: [], metrics: [] };
    for (const s of symptoms) {
      const key = s.log_date.slice(0, 10);
      map.set(key, { ...day(key), symptoms: [...day(key).symptoms, s] });
    }
    for (const m of metrics) {
      const key = m.recorded_at.slice(0, 10);
      map.set(key, { ...day(key), metrics: [...day(key).metrics, m] });
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [symptoms, metrics]);
  if (days.length === 0) return <p className="px-1 text-sm text-ink-mute">{empty}</p>;
  const shown = all ? days : days.slice(0, 8);
  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {shown.map(([day, items]) => (
          <li key={day} className="space-y-2">
            <h3 className="px-1 text-xs font-semibold text-ink-mute first-letter:uppercase">{formatDayHeading(day)}</h3>
            {items.metrics.map(m => <MetricRow key={m.id} metric={m} onOpen={() => onOpen({ kind: 'metric', id: m.id })} />)}
            {items.symptoms.map(s => (
              <SymptomRow
                key={s.id}
                symptom={s}
                comments={comments.filter(c => c.symptom_id === s.id).length}
                reactions={reactions.filter(r => r.target_type === 'symptom' && r.target_id === s.id).length}
                onOpen={() => onOpen({ kind: 'symptom', id: s.id })}
              />
            ))}
          </li>
        ))}
      </ol>
      {days.length > shown.length && (
        <button type="button" onClick={() => setAll(true)} className="px-1 text-sm font-bold text-brand-strong">
          Ver os {days.length - shown.length} dias anteriores
        </button>
      )}
    </div>
  );
}

function formatDayHeading(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

const ROW = 'w-full text-left rounded-2xl px-4 py-3 flex items-start gap-3 transition hover:brightness-[0.98] active:scale-[0.995] focus-visible:outline-2';

function SymptomRow({ symptom: s, comments, reactions, onOpen }: { symptom: SymptomItem; comments: number; reactions: number; onOpen: () => void }) {
  const alert = isAlertSymptom(normalizeSymptomName(s.symptom_name), s.intensity);
  return (
    <button type="button" onClick={onOpen} className={`${ROW} ${alert ? 'bg-alert-soft' : 'bg-surface'}`} aria-label={`${s.symptom_name}, ${INTENSITY[s.intensity - 1].toLowerCase()}: ver detalhes`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{s.symptom_name}</span>
          <IntensityDots value={s.intensity} />
          {alert && <Pill tone="alert"><AlertTriangle className="w-3 h-3" /> alerta</Pill>}
        </div>
        <p className="text-xs text-ink-mute mt-0.5 flex flex-wrap items-center gap-x-1.5">
          <span>{INTENSITY[s.intensity - 1]}</span>·<span>{s.category}</span>
          {s.time_of_day && <>·<span>{timeOfDayLabel(s.time_of_day)}</span></>}
          <AuthorBadge role={s.created_by} />
        </p>
        {s.notes && <p className="text-sm text-ink-soft mt-1 line-clamp-1">{s.notes}</p>}
      </div>
      <span className="shrink-0 flex items-center gap-1.5 self-center">
        <SocialCount reactions={reactions} comments={0} />
        {comments > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-brand-strong">
            <HeartHandshake className="w-3.5 h-3.5" /> {comments}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-ink-mute" />
      </span>
    </button>
  );
}

function MetricRow({ metric: m, onOpen }: { metric: HealthMetric; onOpen: () => void }) {
  const high = isHighBloodPressure(m.systolic_bp, m.diastolic_bp);
  return (
    <button type="button" onClick={onOpen} className={`${ROW} items-center ${high ? 'bg-alert-soft' : 'bg-surface'}`} aria-label={`Medição da semana ${m.week_number}: ver detalhes`}>
      <span className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
        <Scale className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink tabular">
          {m.weight_kg !== null && `${m.weight_kg.toLocaleString('pt-BR')} kg`}
          {m.weight_kg !== null && m.systolic_bp !== null && ' · '}
          {m.systolic_bp !== null && `${m.systolic_bp}/${m.diastolic_bp} mmHg`}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-mute">
          <span>Semana {m.week_number}</span>
          <AuthorBadge role={m.created_by} />
        </div>
        {high && <p className="text-sm text-alert font-semibold mt-1">Acima de {HIGH_SYSTOLIC}/{HIGH_DIASTOLIC}: contatem o obstetra.</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
    </button>
  );
}
