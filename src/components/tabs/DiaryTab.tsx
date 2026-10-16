import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, Heart, HeartHandshake, Lock, NotebookPen, Scale, Trash2 } from 'lucide-react';
import { isAlertSymptom } from '../../content/symptomCatalog';
import { formatBR, parseLocalDate, toISODate, type GestationalAge } from '../../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure, type ParsedMetric } from '../../lib/health';
import { normalizeSymptomName, timeOfDayLabel } from '../../lib/symptoms';
import type { Author, HealthMetric, PartnerComment, SymptomItem } from '../../types';
import type { JournalEntry } from '../../hooks/useGestationData';
import AuthorBadge from '../AuthorBadge';
import IntensityDots from '../IntensityDots';
import { inputClass } from '../styles';
import { Button, Card, EmptyState, Pill, Segmented } from '../ui';
import { INTENSITY } from '../../lib/intensity';
import { MetricForm, MomentForm, SymptomForm, type NewEntry, type NewSymptom } from '../forms/RecordForms';

export type { NewEntry, NewSymptom };

interface Props {
  author: Author;
  age: GestationalAge;
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  selectedWeek: number;
  currentWeek: number;
  busy: boolean;
  onCreateSymptom: (s: NewSymptom) => Promise<boolean>;
  onCreateMetric: (m: ParsedMetric) => Promise<boolean>;
  onComment: (symptomId: string, text: string) => Promise<boolean>;
  onDeleteSymptom: (s: SymptomItem) => void;
  onDeleteComment: (c: PartnerComment) => void;
  onDeleteMetric: (m: HealthMetric) => void;
  dumDate: string;
  journal: JournalEntry[];
  journalAvailable: boolean;
  onCreateEntry: (e: NewEntry) => Promise<boolean>;
  onDeleteEntry: (e: JournalEntry) => void;
}


export default function DiaryTab(props: Props) {
  const [mode, setMode] = useState<'sintoma' | 'medicao' | 'momento'>('sintoma');
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
          <h2 className="text-[1.2rem] text-ink">Registrar hoje</h2>
          <Segmented
            label="Tipo de registro"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'sintoma', label: 'Sintoma' },
              { value: 'medicao', label: 'Peso e pressão' },
              { value: 'momento', label: 'Momento' },
            ]}
          />
        </div>
        {mode === 'sintoma' ? (
          <SymptomForm trimester={props.age.trimester} history={props.symptoms} busy={props.busy} currentWeek={props.currentWeek} onCreate={props.onCreateSymptom} />
        ) : mode === 'medicao' ? (
          <MetricForm author={props.author} busy={props.busy} currentWeek={props.currentWeek} onCreate={props.onCreateMetric} />
        ) : (
          <MomentForm busy={props.busy} available={props.journalAvailable} onCreate={props.onCreateEntry} />
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-[1.2rem] text-ink">Linha do tempo</h2>
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
            Comece pelo que ela sentiu hoje. Em poucas semanas o painel mostra os padrões.
          </EmptyState>
        ) : (
          <ol className="space-y-5">
            {days.map(([day, items]) => (
              <li key={day} className="space-y-2">
                <h3 className="text-xs font-semibold text-ink-mute first-letter:uppercase">{formatDayHeading(day)}</h3>
                {items.moments.map(e => <MomentRow key={e.id} entry={e} onDelete={props.onDeleteEntry} />)}
                {items.metrics.map(m => <MetricRow key={m.id} metric={m} onDelete={props.onDeleteMetric} />)}
                {items.symptoms.map(s => (
                  <SymptomRow key={s.id} symptom={s} comments={props.comments.filter(c => c.symptom_id === s.id)} busy={props.busy} onComment={props.onComment} onDelete={props.onDeleteSymptom} onDeleteComment={props.onDeleteComment} />
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

function SymptomRow({ symptom: s, comments, busy, onComment, onDelete, onDeleteComment }: { symptom: SymptomItem; comments: PartnerComment[]; busy: boolean; onComment: (id: string, text: string) => Promise<boolean>; onDelete: (s: SymptomItem) => void; onDeleteComment: (c: PartnerComment) => void }) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const alert = isAlertSymptom(normalizeSymptomName(s.symptom_name), s.intensity);
  return (
    <div className={`rounded-2xl px-4 py-3 space-y-2 ${alert ? 'bg-alert-soft' : 'bg-surface-2/60'}`}>
      <div className="flex items-start gap-3">
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
          {s.notes && <p className="text-sm text-ink-soft mt-1">{s.notes}</p>}
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
          <HeartHandshake className="w-3.5 h-3.5" /> Cuidar
        </button>
        <button onClick={() => onDelete(s)} aria-label={`Excluir registro "${s.symptom_name}"`} className="shrink-0 p-1 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {comments.map(c => (
        <div key={c.id} className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
          <HeartHandshake className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <span className="flex-1 text-ink">
            {c.comment_text} <AuthorBadge role={c.author_role} />
          </span>
          <button onClick={() => onDeleteComment(c)} aria-label="Excluir cuidado" className="text-ink-mute hover:text-alert">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {open && (
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (draft.trim() && (await onComment(s.id, draft.trim()))) {
              setDraft('');
              setOpen(false);
            }
          }}
          className="flex gap-2"
        >
          <input autoFocus aria-label={`Cuidado ou apoio em "${s.symptom_name}"`} className={`${inputClass} !py-2 text-sm`} placeholder="O que ajudou? (ex.: chá às 22h)" value={draft} onChange={e => setDraft(e.target.value)} />
          <Button type="submit" tone="soft" disabled={busy || !draft.trim()} className="!px-4 !py-2">Salvar</Button>
        </form>
      )}
    </div>
  );
}

function MetricRow({ metric: m, onDelete }: { metric: HealthMetric; onDelete: (m: HealthMetric) => void }) {
  const high = isHighBloodPressure(m.systolic_bp, m.diastolic_bp);
  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-3 ${high ? 'bg-alert-soft' : 'bg-surface-2/60'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Scale className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink tabular">
            {m.weight_kg !== null && `${m.weight_kg.toLocaleString('pt-BR')} kg`}
            {m.weight_kg !== null && m.systolic_bp !== null && ' · '}
            {m.systolic_bp !== null && `${m.systolic_bp}/${m.diastolic_bp} mmHg`}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-mute">
            <span>Semana {m.week_number} · {formatBR(m.recorded_at)}</span>
            <AuthorBadge role={m.created_by} />
          </div>
          {high && (
            <p className="text-sm text-alert font-semibold mt-1">
              Acima de {HIGH_SYSTOLIC}/{HIGH_DIASTOLIC}: contatem o obstetra.
            </p>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(m)} aria-label={`Excluir medição da semana ${m.week_number}`} className="p-1.5 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function MomentRow({ entry: e, onDelete }: { entry: JournalEntry; onDelete: (e: JournalEntry) => void }) {
  const upcoming = e.remind_on && e.remind_on >= toISODate(new Date());
  return (
    <div className="rounded-2xl px-4 py-3 bg-casal-soft flex items-start gap-3">
      <Heart className="w-4 h-4 text-casal shrink-0 mt-1" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-ink whitespace-pre-line">{e.body}</p>
        <p className="text-xs text-ink-mute flex flex-wrap items-center gap-x-2 gap-y-1">
          {e.visibility === 'private' && <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> só você</span>}
          {e.remind_on && (
            <span className={`inline-flex items-center gap-1 ${upcoming ? 'text-brand font-semibold' : ''}`}>
              <Bell className="w-3 h-3" /> lembrar em {formatBR(e.remind_on)}
            </span>
          )}
          <AuthorBadge role={e.author_role} />
        </p>
      </div>
      {e.mine && (
        <button onClick={() => onDelete(e)} aria-label="Excluir momento" className="shrink-0 p-1 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
