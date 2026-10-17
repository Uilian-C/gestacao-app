import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, HeartHandshake, NotebookPen, Scale } from 'lucide-react';
import { isAlertSymptom } from '../../content/symptomCatalog';
import { toISODate } from '../../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure } from '../../lib/health';
import { normalizeSymptomName, timeOfDayLabel } from '../../lib/symptoms';
import type { HealthMetric, PartnerComment, SymptomItem } from '../../types';
import type { Reaction } from '../../hooks/useGestationData';
import { SocialCount } from '../Social';
import type { DetailTarget } from '../../lib/details';
import AuthorBadge from '../AuthorBadge';
import IntensityDots from '../IntensityDots';
import { Button, Card, EmptyState, Pill, Segmented } from '../ui';
import { INTENSITY } from '../../lib/intensity';
import type { NewSymptom } from '../forms/RecordForms';

export type { NewSymptom };

interface Props {
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  selectedWeek: number;
  /** Abre os detalhes (com editar e excluir). */
  onOpen: (target: DetailTarget) => void;
  /** Abre o registro (o mesmo do botão "+"). */
  onRecord: () => void;
  reactions: Reaction[];
}

/**
 * Registros de saúde (em Cuidados → Saúde): sintomas e medições de peso e
 * pressão, por dia. É o que a equipe médica quer ver; o lado afetivo fica no Diário.
 */
export default function HealthTab(props: Props) {
  const [filter, setFilter] = useState<'recentes' | 'semana' | 'tudo'>('recentes');

  const now = new Date();
  const cutoff = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13));
  const keep = (week: number, day: string) => (filter === 'semana' ? week === props.selectedWeek : filter === 'recentes' ? day.slice(0, 10) >= cutoff : true);
  const visibleSymptoms = props.symptoms.filter(s => keep(s.week_number, s.log_date));
  const visibleMetrics = props.metrics.filter(m => keep(m.week_number, m.recorded_at));

  // Sintomas e medições juntos, agrupados por dia.
  const days = useMemo(() => {
    const map = new Map<string, { symptoms: SymptomItem[]; metrics: HealthMetric[] }>();
    const day = (key: string) => map.get(key) ?? { symptoms: [], metrics: [] };
    for (const s of visibleSymptoms) {
      const key = s.log_date.slice(0, 10);
      map.set(key, { ...day(key), symptoms: [...day(key).symptoms, s] });
    }
    for (const m of visibleMetrics) {
      const key = m.recorded_at.slice(0, 10);
      map.set(key, { ...day(key), metrics: [...day(key).metrics, m] });
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibleSymptoms, visibleMetrics]);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-ink-soft">Período</p>
          <Segmented
            label="Período"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'recentes', label: '14 dias' },
              { value: 'semana', label: `Sem. ${props.selectedWeek}` },
              { value: 'tudo', label: 'Tudo' },
            ]}
          />
        </div>
        {days.length === 0 ? (
          <EmptyState icon={<NotebookPen />} title={filter === 'semana' ? `Nada registrado na semana ${props.selectedWeek}` : filter === 'recentes' ? 'Nada nos últimos 14 dias' : 'Nenhum registro de saúde ainda'}>
            <p>Sintomas, peso e pressão. Em poucas semanas os gráficos mostram os padrões, e o resumo da consulta fica pronto.</p>
            <div className="pt-3">
              <Button onClick={props.onRecord}>Registrar agora</Button>
            </div>
          </EmptyState>
        ) : (
          <ol className="space-y-5">
            {days.map(([day, items]) => (
              <li key={day} className="space-y-2">
                <h3 className="text-xs font-semibold text-ink-mute first-letter:uppercase">{formatDayHeading(day)}</h3>
                {items.metrics.map(m => <MetricRow key={m.id} metric={m} onOpen={() => props.onOpen({ kind: 'metric', id: m.id })} />)}
                {items.symptoms.map(s => (
                  <SymptomRow
                    key={s.id}
                    symptom={s}
                    comments={props.comments.filter(c => c.symptom_id === s.id).length}
                    reactions={props.reactions.filter(r => r.target_type === 'symptom' && r.target_id === s.id).length}
                    onOpen={() => props.onOpen({ kind: 'symptom', id: s.id })}
                  />
                ))}
              </li>
            ))}
          </ol>
        )}
      </Card>
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
    <button type="button" onClick={onOpen} className={`${ROW} ${alert ? 'bg-alert-soft' : 'bg-surface-2/60'}`} aria-label={`${s.symptom_name}, ${INTENSITY[s.intensity - 1].toLowerCase()}: ver detalhes`}>
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
    <button type="button" onClick={onOpen} className={`${ROW} items-center ${high ? 'bg-alert-soft' : 'bg-surface-2/60'}`} aria-label={`Medição da semana ${m.week_number}: ver detalhes`}>
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
