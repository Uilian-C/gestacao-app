import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, ChevronDown, Heart, HeartHandshake, Lock, NotebookPen, Plus, Scale, Trash2, Users } from 'lucide-react';
import { COMMON_SYMPTOMS, SYMPTOM_CATEGORIES, isAlertSymptom } from '../../content/symptomCatalog';
import { formatBR, parseLocalDate, toISODate, type GestationalAge } from '../../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure, parseMetricInput, type ParsedMetric } from '../../lib/health';
import { TIME_OF_DAY, normalizeSymptomName, timeOfDayFromHour, timeOfDayLabel } from '../../lib/symptoms';
import type { Author, HealthMetric, PartnerComment, SymptomItem, TimeOfDay } from '../../types';
import type { JournalEntry } from '../../hooks/useGestationData';
import { WORK_RIGHTS, WORK_RIGHTS_SOURCE, WORK_TERMS } from '../../content/workRights';
import Guide from '../Guide';
import AuthorBadge from '../AuthorBadge';
import IntensityDots from '../IntensityDots';
import { inputClass } from '../styles';
import { Button, Card, EmptyState, Field, Pill, Segmented } from '../ui';

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
  dumDate: string;
  journal: JournalEntry[];
  journalAvailable: boolean;
  onCreateEntry: (e: NewEntry) => Promise<boolean>;
  onDeleteEntry: (e: JournalEntry) => void;
}

export interface NewEntry {
  date: string;
  body: string;
  visibility: 'private' | 'shared';
  remindOn: string | null;
}

const INTENSITY = ['Muito leve', 'Leve', 'Moderado', 'Forte', 'Muito forte'];

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

/** Categoria conhecida de um sintoma: histórico do casal primeiro, depois o catálogo. */
function knownCategories(history: SymptomItem[]) {
  const map = new Map<string, string>();
  for (const list of Object.values(COMMON_SYMPTOMS)) for (const c of list) map.set(normalizeSymptomName(c.name), c.category);
  for (const s of history) map.set(normalizeSymptomName(s.symptom_name), s.category);
  return map;
}

function SymptomForm({ trimester, history, busy, currentWeek, onCreate }: { trimester: 1 | 2 | 3; history: SymptomItem[]; busy: boolean; currentWeek: number; onCreate: (s: NewSymptom) => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Físico');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => timeOfDayFromHour(new Date().getHours()));
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<'tipo' | 'quando' | 'obs' | null>(null);

  // Atalhos: os mais registrados pelo casal primeiro, depois os comuns do trimestre.
  const shortcuts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const s of history) {
      const key = normalizeSymptomName(s.symptom_name);
      counts.set(key, { name: counts.get(key)?.name ?? s.symptom_name.trim(), count: (counts.get(key)?.count ?? 0) + 1 });
    }
    const mine = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5).map(m => m.name);
    const seen = new Set(mine.map(normalizeSymptomName));
    const common = COMMON_SYMPTOMS[trimester].map(c => c.name).filter(n => !seen.has(normalizeSymptomName(n)));
    return [...mine, ...common].slice(0, 10);
  }, [history, trimester]);
  const categories = useMemo(() => knownCategories(history), [history]);

  const pick = (value: string) => {
    setName(value);
    // O tipo se ajusta sozinho ao sintoma, a menos que a pessoa já tenha escolhido.
    const known = categories.get(normalizeSymptomName(value));
    if (known && !categoryTouched) setCategory(known);
  };

  const alert = name.trim() !== '' && intensity > 0 && isAlertSymptom(normalizeSymptomName(name), intensity);
  const ready = name.trim() !== '' && intensity > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (await onCreate({ name: name.trim(), category, intensity, timeOfDay, notes: notes.trim() })) {
      setName('');
      setNotes('');
      setIntensity(0);
      setCategoryTouched(false);
      setEditing(null);
    }
  };

  const detail = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <input
          id="sintoma"
          aria-label="O que ela está sentindo?"
          className={inputClass}
          placeholder="O que ela está sentindo?"
          value={name}
          onChange={e => pick(e.target.value)}
          autoComplete="off"
        />
        <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Sugestões">
          {shortcuts.map(s => {
            const active = normalizeSymptomName(name) === normalizeSymptomName(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1 text-[13px] transition ${active ? 'bg-brand text-on-accent' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="flex items-center justify-between gap-3">
        <legend className="sr-only">Intensidade</legend>
        <span className="text-sm text-ink-soft">Intensidade</span>
        <div className="flex items-center gap-1.5">
          {INTENSITY.map((label, i) => {
            const level = i + 1;
            const on = intensity >= level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                aria-label={`${level}: ${label}`}
                aria-pressed={intensity === level}
                className={`w-8 h-8 rounded-full text-xs font-semibold tabular transition ${on ? 'shadow-soft' : 'bg-surface-2 text-ink-mute hover:text-ink'}`}
                style={on ? { background: `var(--c-int-${level})`, color: level >= 4 ? '#fff' : 'var(--c-ink)' } : undefined}
              >
                {level}
              </button>
            );
          })}
        </div>
      </fieldset>
      <p className="text-xs text-ink-mute -mt-2 text-right h-4" aria-live="polite">{intensity ? INTENSITY[intensity - 1] : '1 = muito leve · 5 = muito forte'}</p>

      {/* Tipo e período já vêm preenchidos; um toque troca. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => setEditing(editing === 'tipo' ? null : 'tipo')} aria-expanded={editing === 'tipo'} className={`${detail} ${editing === 'tipo' ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-soft'}`}>
          {category} <ChevronDown className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => setEditing(editing === 'quando' ? null : 'quando')} aria-expanded={editing === 'quando'} className={`${detail} ${editing === 'quando' ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-soft'}`}>
          {timeOfDayLabel(timeOfDay)} <ChevronDown className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => setEditing(editing === 'obs' ? null : 'obs')} aria-expanded={editing === 'obs'} className={`${detail} ${notes || editing === 'obs' ? 'bg-brand-soft text-brand-strong' : 'text-ink-mute hover:text-ink'}`}>
          <Plus className="w-3 h-3" /> Observação
        </button>
      </div>
      {editing === 'tipo' && (
        <Segmented
          label="Tipo de sintoma"
          size="sm"
          value={category}
          onChange={v => {
            setCategory(v);
            setCategoryTouched(true);
            setEditing(null);
          }}
          options={SYMPTOM_CATEGORIES.map(c => ({ value: c, label: c }))}
        />
      )}
      {editing === 'quando' && (
        <Segmented
          label="Período do dia"
          size="sm"
          value={timeOfDay}
          onChange={v => {
            setTimeOfDay(v);
            setEditing(null);
          }}
          options={TIME_OF_DAY.map(t => ({ value: t.id, label: t.label }))}
        />
      )}
      {editing === 'obs' && (
        <input autoFocus aria-label="Observação" className={inputClass} placeholder="O que piorou, o que ajudou..." value={notes} onChange={e => setNotes(e.target.value)} />
      )}

      {alert && (
        <div className="flex gap-3 rounded-2xl bg-alert-soft text-alert p-4" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>Esse sintoma pode ser um sinal de alerta.</strong> Registrem, mas não esperem a próxima consulta: liguem para o obstetra ou procurem a maternidade.
          </p>
        </div>
      )}

      <Button type="submit" disabled={busy || !ready} className="w-full">
        {name.trim() && !intensity ? 'Escolha a intensidade' : `Salvar · semana ${currentWeek}`}
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

const MOMENT_IDEAS = ['Contamos no trabalho', 'Contamos para a família', 'Ouvimos o coração', 'Primeiro chute', 'Descobrimos o sexo', 'Escolhemos o nome', 'Chá de bebê', 'Ensaio de fotos'];

const addDays = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** Momentos: o diário afetivo, com lembrete opcional e privacidade por anotação. */
function MomentForm({ busy, available, onCreate }: { busy: boolean; available: boolean; onCreate: (e: NewEntry) => Promise<boolean> }) {
  const today = toISODate(new Date());
  const [body, setBody] = useState('');
  const [date, setDate] = useState(today);
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared');
  const [remindOn, setRemindOn] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const detail = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (await onCreate({ date, body: body.trim(), visibility, remindOn })) {
      setBody('');
      setDate(today);
      setRemindOn(null);
      setShowDate(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {!available && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2">Para guardar momentos, rode a migração 008 no Neon.</p>}
      <div className="space-y-2">
        <textarea
          aria-label="O que aconteceu?"
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="O que aconteceu? Ex.: contamos hoje para a equipe do trabalho e vamos contar para a família em 15 dias."
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Ideias">
          {MOMENT_IDEAS.map(idea => (
            <button key={idea} type="button" onClick={() => setBody(b => (b.trim() ? b : idea))} className="shrink-0 rounded-full px-3 py-1 text-[13px] bg-surface-2 text-ink-soft hover:text-ink">
              {idea}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Segmented
          label="Quem vê"
          size="sm"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'shared', label: <span className="flex items-center gap-1"><Users className="w-3 h-3" />Nós dois</span> },
            { value: 'private', label: <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Só eu</span> },
          ]}
        />
        <button type="button" onClick={() => setShowDate(v => !v)} className={`${detail} ${date !== today ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-soft'}`}>
          {date === today ? 'Hoje' : formatBR(date)} <ChevronDown className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => setRemindOn(r => (r ? null : addDays(today, 15)))} className={`${detail} ${remindOn ? 'bg-brand-soft text-brand-strong' : 'text-ink-mute hover:text-ink'}`}>
          <Bell className="w-3 h-3" /> {remindOn ? `Lembrar em ${formatBR(remindOn)}` : 'Lembrar'}
        </button>
      </div>
      {showDate && <input type="date" aria-label="Data do momento" max={today} className={inputClass} value={date} onChange={e => setDate(e.target.value || today)} />}
      {remindOn && (
        <div className="flex flex-wrap items-center gap-1.5">
          {[7, 15, 30].map(n => (
            <button key={n} type="button" onClick={() => setRemindOn(addDays(today, n))} className={`${detail} ${remindOn === addDays(today, n) ? 'bg-brand text-on-accent' : 'bg-surface-2 text-ink-soft'}`}>
              em {n} dias
            </button>
          ))}
          <input type="date" aria-label="Data do lembrete" min={today} className={`${inputClass} !py-1.5 !w-auto text-sm`} value={remindOn} onChange={e => setRemindOn(e.target.value || null)} />
        </div>
      )}
      <p className="text-xs text-ink-mute -mt-1">
        {visibility === 'private' ? 'Só você vai ver este momento, nem a outra pessoa do espaço.' : 'Vocês dois vão ver este momento.'}
        {remindOn && ' O lembrete aparece no Início e na Agenda.'}
      </p>

      {WORK_TERMS.test(body) && (
        <Guide title="Seus direitos no trabalho" source={WORK_RIGHTS_SOURCE}>
          <ul className="space-y-1">
            {WORK_RIGHTS.map(r => (
              <li key={r} className="flex gap-2">
                <span className="text-brand">•</span>
                {r}
              </li>
            ))}
          </ul>
        </Guide>
      )}

      <Button type="submit" disabled={busy || !available || !body.trim()} className="w-full">
        <Heart className="w-4 h-4" /> Guardar momento
      </Button>
    </form>
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
