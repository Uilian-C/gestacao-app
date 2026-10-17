import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, ChevronRight, Heart, HeartHandshake, Lock, NotebookPen, Scale } from 'lucide-react';
import { isAlertSymptom } from '../../content/symptomCatalog';
import { formatBR, parseLocalDate, toISODate, type GestationalAge } from '../../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure } from '../../lib/health';
import { normalizeSymptomName, timeOfDayLabel } from '../../lib/symptoms';
import type { Author, HealthMetric, PartnerComment, SymptomItem } from '../../types';
import type { JournalEntry, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { SocialCount } from '../Social';
import type { DetailTarget } from '../../lib/details';
import AuthorBadge from '../AuthorBadge';
import IntensityDots from '../IntensityDots';
import { Button, Card, EmptyState, Pill, Segmented } from '../ui';
import { INTENSITY } from '../../lib/intensity';
import type { NewEntry, NewSymptom } from '../forms/RecordForms';

export type { NewEntry, NewSymptom };

interface Props {
  author: Author;
  age: GestationalAge;
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  selectedWeek: number;
  currentWeek: number;
  /** Abre os detalhes (com editar e excluir). */
  onOpen: (target: DetailTarget) => void;
  dumDate: string;
  journal: JournalEntry[];
  journalAvailable: boolean;
  /** Abre o registro (o mesmo do botão "+"). */
  onRecord: () => void;
  reactions: Reaction[];
  threads: ThreadComment[];
}


export default function DiaryTab(props: Props) {
  const [filter, setFilter] = useState<'recentes' | 'semana' | 'tudo'>('recentes');

  const now = new Date();
  const cutoff = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13));
  const keep = (week: number, day: string) => (filter === 'semana' ? week === props.selectedWeek : filter === 'recentes' ? day.slice(0, 10) >= cutoff : true);
  const visibleSymptoms = props.symptoms.filter(s => keep(s.week_number, s.log_date));
  const visibleMetrics = props.metrics.filter(m => keep(m.week_number, m.recorded_at));
  const dumTime = parseLocalDate(props.dumDate).getTime();
  const visibleMoments = props.journal.filter(e => keep(Math.floor((parseLocalDate(e.entry_date).getTime() - dumTime) / (7 * 86_400_000)), e.entry_date));

  // Linha do tempo: sintomas e medições juntos, agrupados por dia.
  const days = useMemo(() => {
    const map = new Map<string, { symptoms: SymptomItem[]; metrics: HealthMetric[]; moments: JournalEntry[] }>();
    const day = (key: string) => map.get(key) ?? { symptoms: [], metrics: [], moments: [] };
    for (const s of visibleSymptoms) {
      const key = s.log_date.slice(0, 10);
      map.set(key, { ...day(key), symptoms: [...day(key).symptoms, s] });
    }
    for (const m of visibleMetrics) {
      const key = m.recorded_at.slice(0, 10);
      map.set(key, { ...day(key), metrics: [...day(key).metrics, m] });
    }
    for (const e of visibleMoments) {
      const key = e.entry_date.slice(0, 10);
      map.set(key, { ...day(key), moments: [...day(key).moments, e] });
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibleSymptoms, visibleMetrics, visibleMoments]);

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
          <EmptyState icon={<NotebookPen />} title={filter === 'semana' ? `Nada registrado na semana ${props.selectedWeek}` : filter === 'recentes' ? 'Nada nos últimos 14 dias' : 'Nenhum registro ainda'}>
            <p>Comece pelo que ela sentiu hoje. Em poucas semanas os gráficos mostram os padrões.</p>
            <div className="pt-3">
              <Button onClick={props.onRecord}>Registrar agora</Button>
            </div>
          </EmptyState>
        ) : (
          <ol className="space-y-5">
            {days.map(([day, items]) => (
              <li key={day} className="space-y-2">
                <h3 className="text-xs font-semibold text-ink-mute first-letter:uppercase">{formatDayHeading(day)}</h3>
                {items.moments.map(e => (
                  <MomentRow
                    key={e.id}
                    entry={e}
                    reactions={props.reactions.filter(r => r.target_type === 'entry' && r.target_id === e.id).length}
                    comments={props.threads.filter(c => c.target_type === 'entry' && c.target_id === e.id).length}
                    onOpen={() => props.onOpen({ kind: 'entry', id: e.id })}
                  />
                ))}
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

function MomentRow({ entry: e, reactions, comments, onOpen }: { entry: JournalEntry; reactions: number; comments: number; onOpen: () => void }) {
  const upcoming = e.remind_on && e.remind_on >= toISODate(new Date());
  return (
    <button type="button" onClick={onOpen} className={`${ROW} bg-rosa-soft`} aria-label="Momento: ver detalhes">
      <Heart className="w-4 h-4 text-rosa fill-rosa shrink-0 mt-1" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-display text-[1.05rem] text-ink line-clamp-3">{e.body}</p>
        <p className="text-xs text-ink-mute flex flex-wrap items-center gap-x-2 gap-y-1">
          {e.visibility === 'private' && <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> só você</span>}
          {e.remind_on && (
            <span className={`inline-flex items-center gap-1 ${upcoming ? 'text-brand font-semibold' : ''}`}>
              <Bell className="w-3 h-3" /> lembrar em {formatBR(e.remind_on)}
            </span>
          )}
          <AuthorBadge role={e.author_role} />
          <SocialCount reactions={reactions} comments={comments} />
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0 self-center" />
    </button>
  );
}
