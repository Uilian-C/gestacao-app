import { useMemo, useState } from 'react';
import { AlertTriangle, HeartHandshake, Plus, Scale, Trash2 } from 'lucide-react';
import { COMMON_SYMPTOMS, SYMPTOM_CATEGORIES, isAlertSymptom } from '../../data/symptomCatalog';
import { formatBR, toISODate, type GestationalAge } from '../../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure, parseMetricInput, type ParsedMetric } from '../../lib/health';
import { TIME_OF_DAY, normalizeSymptomName, timeOfDayFromHour, timeOfDayLabel } from '../../lib/symptoms';
import type { Author, HealthMetric, PartnerComment, SymptomItem, TimeOfDay } from '../../types';
import AuthorBadge from '../AuthorBadge';
import IntensityDots from '../IntensityDots';
import { inputClass } from '../styles';
import { Button, Card, Chip, EmptyState, Field, Pill, Segmented, SectionTitle } from '../ui';

export interface NewSymptom {
  name: string;
  category: string;
  intensity: number;
  timeOfDay: TimeOfDay;
  notes: string;
}

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
}

const INTENSITY = ['Muito leve', 'Leve', 'Moderado', 'Forte', 'Muito forte'];

export default function DiaryTab(props: Props) {
  const [mode, setMode] = useState<'sintoma' | 'medicao'>('sintoma');
  const [filter, setFilter] = useState<'recentes' | 'semana' | 'tudo'>('recentes');

  const now = new Date();
  const cutoff = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13));
  const keep = (week: number, day: string) => (filter === 'semana' ? week === props.selectedWeek : filter === 'recentes' ? day.slice(0, 10) >= cutoff : true);
  const visibleSymptoms = props.symptoms.filter(s => keep(s.week_number, s.log_date));
  const visibleMetrics = props.metrics.filter(m => keep(m.week_number, m.recorded_at));

  // Linha do tempo: sintomas e medições juntos, agrupados por dia.
  const days = useMemo(() => {
    const map = new Map<string, { symptoms: SymptomItem[]; metrics: HealthMetric[] }>();
    for (const s of visibleSymptoms) {
      const key = s.log_date.slice(0, 10);
      map.set(key, { symptoms: [...(map.get(key)?.symptoms ?? []), s], metrics: map.get(key)?.metrics ?? [] });
    }
    for (const m of visibleMetrics) {
      const key = m.recorded_at.slice(0, 10);
      map.set(key, { symptoms: map.get(key)?.symptoms ?? [], metrics: [...(map.get(key)?.metrics ?? []), m] });
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibleSymptoms, visibleMetrics]);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand" /> Novo registro de hoje
          </h2>
          <Segmented
            label="Tipo de registro"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'sintoma', label: 'Sintoma' },
              { value: 'medicao', label: 'Peso e pressão' },
            ]}
          />
        </div>
        {mode === 'sintoma' ? (
          <SymptomForm author={props.author} trimester={props.age.trimester} history={props.symptoms} busy={props.busy} currentWeek={props.currentWeek} onCreate={props.onCreateSymptom} />
        ) : (
          <MetricForm author={props.author} busy={props.busy} currentWeek={props.currentWeek} onCreate={props.onCreateMetric} />
        )}
      </Card>

      <Card>
        <SectionTitle
          title="Linha do tempo"
          subtitle="Tudo o que vocês registraram, do mais recente ao mais antigo."
          action={
            <Segmented
              label="Período"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'recentes', label: '14 dias' },
                { value: 'semana', label: `Semana ${props.selectedWeek}` },
                { value: 'tudo', label: 'Tudo' },
              ]}
            />
          }
        />
        {days.length === 0 ? (
          <EmptyState emoji="📝" title={filter === 'semana' ? `Nada registrado na semana ${props.selectedWeek}` : filter === 'recentes' ? 'Nada nos últimos 14 dias' : 'Nenhum registro ainda'}>
            Comece pelo que ela sentiu hoje. Em poucas semanas o painel mostra os padrões.
          </EmptyState>
        ) : (
          <ol className="space-y-6">
            {days.map(([day, items]) => (
              <li key={day} className="space-y-3">
                <h3 className="text-sm font-bold text-ink-mute uppercase tracking-wide">{formatDayHeading(day)}</h3>
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

function SymptomForm({ author, trimester, history, busy, currentWeek, onCreate }: { author: Author; trimester: 1 | 2 | 3; history: SymptomItem[]; busy: boolean; currentWeek: number; onCreate: (s: NewSymptom) => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Físico');
  const [intensity, setIntensity] = useState(2);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => timeOfDayFromHour(new Date().getHours()));
  const [notes, setNotes] = useState('');

  // Atalhos: os mais registrados pelo casal primeiro, depois os comuns do trimestre.
  const shortcuts = useMemo(() => {
    const counts = new Map<string, { name: string; category: string; count: number }>();
    for (const s of history) {
      const key = normalizeSymptomName(s.symptom_name);
      const prev = counts.get(key);
      counts.set(key, { name: prev?.name ?? s.symptom_name.trim(), category: s.category, count: (prev?.count ?? 0) + 1 });
    }
    const mine = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
    const seen = new Set(mine.map(m => normalizeSymptomName(m.name)));
    const common = COMMON_SYMPTOMS[trimester].filter(c => !seen.has(normalizeSymptomName(c.name)));
    return [...mine, ...common].slice(0, 12);
  }, [history, trimester]);

  const alert = name.trim() !== '' && isAlertSymptom(normalizeSymptomName(name), intensity);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await onCreate({ name: name.trim(), category, intensity, timeOfDay, notes: notes.trim() })) {
      setName('');
      setNotes('');
      setIntensity(2);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Field label="O que ela está sentindo?" htmlFor="sintoma">
          <input id="sintoma" className={inputClass} placeholder="Ex.: azia, dor lombar, enjoo" value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
        </Field>
        <div className="flex flex-wrap gap-2">
          {shortcuts.map(s => (
            <Chip
              key={s.name}
              active={normalizeSymptomName(name) === normalizeSymptomName(s.name)}
              onClick={() => {
                setName(s.name);
                setCategory(s.category);
              }}
            >
              {s.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft block">Tipo</span>
          <Segmented label="Tipo de sintoma" size="sm" value={category} onChange={setCategory} options={SYMPTOM_CATEGORIES.map(c => ({ value: c, label: c }))} />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft block">Quando</span>
          <Segmented label="Período do dia" size="sm" value={timeOfDay} onChange={setTimeOfDay} options={TIME_OF_DAY.map(t => ({ value: t.id, label: t.label }))} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink-soft">
          Intensidade: <span className="text-ink">{INTENSITY[intensity - 1].toLowerCase()}</span>
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {INTENSITY.map((label, i) => {
            const level = i + 1;
            const selected = intensity === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                aria-pressed={selected}
                className={`rounded-2xl border py-2.5 px-1 text-center transition ${selected ? 'border-transparent shadow-sm' : 'border-line bg-surface hover:border-ink-mute'}`}
                style={selected ? { background: `var(--c-int-${level})`, color: level >= 4 ? 'white' : 'var(--c-ink)' } : undefined}
              >
                <span className="block text-lg font-extrabold tabular">{level}</span>
                <span className="block text-[11px] font-semibold leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {alert && (
        <div className="flex gap-3 rounded-2xl bg-alert-soft text-alert p-4" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>Esse sintoma pode ser um sinal de alerta.</strong> Registrem, mas não esperem a próxima consulta: liguem para o obstetra ou procurem a maternidade.
          </p>
        </div>
      )}

      <Field label="Observação (opcional)" htmlFor="obs-sintoma">
        <input id="obs-sintoma" className={inputClass} placeholder="O que piorou, o que ajudou, depois de qual refeição..." value={notes} onChange={e => setNotes(e.target.value)} />
      </Field>

      <Button type="submit" disabled={busy || !name.trim()} className="w-full">
        Salvar como {author === 'pai' ? 'pai' : 'mãe'} · semana {currentWeek}
      </Button>
    </form>
  );
}

function MetricForm({ author, busy, currentWeek, onCreate }: { author: Author; busy: boolean; currentWeek: number; onCreate: (m: ParsedMetric) => Promise<boolean> }) {
  const [weight, setWeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMetricInput({ weight, systolic, diastolic });
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    if (await onCreate(parsed)) {
      setWeight('');
      setSystolic('');
      setDiastolic('');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Peso (kg)" htmlFor="peso">
          <input id="peso" inputMode="decimal" className={inputClass} placeholder="ex.: 64,5" value={weight} onChange={e => setWeight(e.target.value)} />
        </Field>
        <Field label="Pressão máxima" htmlFor="sistolica">
          <input id="sistolica" inputMode="numeric" className={inputClass} placeholder="ex.: 120" value={systolic} onChange={e => setSystolic(e.target.value)} />
        </Field>
        <Field label="Pressão mínima" htmlFor="diastolica">
          <input id="diastolica" inputMode="numeric" className={inputClass} placeholder="ex.: 80" value={diastolic} onChange={e => setDiastolic(e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-ink-mute">Preencha só o que foi medido. Peso e pressão podem ser registrados separados.</p>
      {error && <p className="text-sm font-semibold text-alert" role="alert">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        <Scale className="w-4 h-4" /> Registrar como {author === 'pai' ? 'pai' : 'mãe'} · semana {currentWeek}
      </Button>
    </form>
  );
}

function SymptomRow({ symptom: s, comments, busy, onComment, onDelete, onDeleteComment }: { symptom: SymptomItem; comments: PartnerComment[]; busy: boolean; onComment: (id: string, text: string) => Promise<boolean>; onDelete: (s: SymptomItem) => void; onDeleteComment: (c: PartnerComment) => void }) {
  const [draft, setDraft] = useState('');
  const alert = isAlertSymptom(normalizeSymptomName(s.symptom_name), s.intensity);
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${alert ? 'border-alert/40 bg-alert-soft/40' : 'border-line bg-canvas'}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink text-base">{s.symptom_name}</span>
            {alert && <Pill tone="alert"><AlertTriangle className="w-3 h-3" /> sinal de alerta</Pill>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-mute">
            <IntensityDots value={s.intensity} />
            <span>{INTENSITY[s.intensity - 1]}</span>
            <span>·</span>
            <span>{s.category}</span>
            {s.time_of_day && (
              <>
                <span>·</span>
                <span>{timeOfDayLabel(s.time_of_day)}</span>
              </>
            )}
            <AuthorBadge role={s.created_by} />
          </div>
          {s.notes && <p className="text-sm text-ink-soft">{s.notes}</p>}
        </div>
        <button onClick={() => onDelete(s)} aria-label={`Excluir registro "${s.symptom_name}"`} className="p-1.5 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {comments.map(c => (
        <div key={c.id} className="flex items-start gap-2 rounded-xl bg-surface border border-line p-3 text-sm">
          <HeartHandshake className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <span className="flex-1 text-ink">
            {c.comment_text} <AuthorBadge role={c.author_role} />
          </span>
          <button onClick={() => onDeleteComment(c)} aria-label="Excluir cuidado" className="text-ink-mute hover:text-alert">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <form
        onSubmit={async e => {
          e.preventDefault();
          if (draft.trim() && (await onComment(s.id, draft.trim()))) setDraft('');
        }}
        className="flex gap-2"
      >
        <input aria-label={`Cuidado ou apoio em "${s.symptom_name}"`} className={`${inputClass} !py-2 text-sm`} placeholder="Anotar um cuidado (ex.: fiz um chá às 22h)" value={draft} onChange={e => setDraft(e.target.value)} />
        <Button type="submit" tone="soft" disabled={busy || !draft.trim()} className="!px-4 !py-2">Salvar</Button>
      </form>
    </div>
  );
}

function MetricRow({ metric: m, onDelete }: { metric: HealthMetric; onDelete: (m: HealthMetric) => void }) {
  const high = isHighBloodPressure(m.systolic_bp, m.diastolic_bp);
  return (
    <div className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${high ? 'border-alert/40 bg-alert-soft/40' : 'border-line bg-canvas'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink tabular">
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
