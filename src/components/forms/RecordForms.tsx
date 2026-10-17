import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, ChevronDown, Heart, Lock, Plus, Scale, Users } from 'lucide-react';
import { COMMON_SYMPTOMS, SYMPTOM_CATEGORIES, isAlertSymptom } from '../../content/symptomCatalog';
import { WORK_RIGHTS, WORK_RIGHTS_SOURCE, WORK_TERMS } from '../../content/workRights';
import { formatBR, parseLocalDate, toISODate } from '../../lib/dates';
import { parseMetricInput, type ParsedMetric } from '../../lib/health';
import { INTENSITY } from '../../lib/intensity';
import { TIME_OF_DAY, normalizeSymptomName, timeOfDayFromHour, timeOfDayLabel } from '../../lib/symptoms';
import type { JournalEntry } from '../../hooks/useGestationData';
import type { Author, HealthMetric, SymptomItem, TimeOfDay } from '../../types';
import Guide from '../Guide';
import { inputClass } from '../styles';
import { Button, Field, Segmented } from '../ui';

// Formulários de registro: no botão "+" (registro rápido) e, preenchidos, para editar nos detalhes.

export interface NewSymptom {
  name: string;
  category: string;
  intensity: number;
  timeOfDay: TimeOfDay;
  notes: string;
}

export interface NewEntry {
  date: string;
  body: string;
  visibility: 'private' | 'shared';
  remindOn: string | null;
}

/** Categoria conhecida de um sintoma: histórico do casal primeiro, depois o catálogo. */
function knownCategories(history: SymptomItem[]) {
  const map = new Map<string, string>();
  for (const list of Object.values(COMMON_SYMPTOMS)) for (const c of list) map.set(normalizeSymptomName(c.name), c.category);
  for (const s of history) map.set(normalizeSymptomName(s.symptom_name), s.category);
  return map;
}

/** Registro de sintoma. Com `initial`, abre preenchido para editar (e não limpa ao salvar). */
export function SymptomForm({ trimester, history, busy, currentWeek, onCreate, initial }: { trimester: 1 | 2 | 3; history: SymptomItem[]; busy: boolean; currentWeek: number; onCreate: (s: NewSymptom) => Promise<boolean>; initial?: SymptomItem }) {
  const [name, setName] = useState(initial?.symptom_name ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? 'Físico');
  const [categoryTouched, setCategoryTouched] = useState(!!initial);
  const [intensity, setIntensity] = useState(initial?.intensity ?? 0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => initial?.time_of_day ?? timeOfDayFromHour(new Date().getHours()));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [editing, setEditing] = useState<'tipo' | 'quando' | 'obs' | null>(initial?.notes ? 'obs' : null);

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
    if ((await onCreate({ name: name.trim(), category, intensity, timeOfDay, notes: notes.trim() })) && !initial) {
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
        {name.trim() && !intensity ? 'Escolha a intensidade' : initial ? 'Salvar alterações' : `Salvar · semana ${currentWeek}`}
      </Button>
    </form>
  );
}

const asText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v).replace('.', ','));

export function MetricForm({ author, busy, currentWeek, onCreate, initial }: { author: Author; busy: boolean; currentWeek: number; onCreate: (m: ParsedMetric) => Promise<boolean>; initial?: HealthMetric }) {
  const [weight, setWeight] = useState(asText(initial?.weight_kg));
  const [systolic, setSystolic] = useState(asText(initial?.systolic_bp));
  const [diastolic, setDiastolic] = useState(asText(initial?.diastolic_bp));
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMetricInput({ weight, systolic, diastolic });
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    if ((await onCreate(parsed)) && !initial) {
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
        <Scale className="w-4 h-4" /> {initial ? 'Salvar alterações' : `Registrar como ${author === 'pai' ? 'pai' : 'mãe'} · semana ${currentWeek}`}
      </Button>
    </form>
  );
}

const MOMENT_IDEAS = ['Contamos no trabalho', 'Contamos para a família', 'Ouvimos o coração', 'Primeiro chute', 'Descobrimos o sexo', 'Escolhemos o nome', 'Chá de bebê', 'Ensaio de fotos'];

const addDays = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** Momentos: o diário afetivo, com lembrete opcional e privacidade por anotação. */
export function MomentForm({ busy, available, onCreate, initial }: { busy: boolean; available: boolean; onCreate: (e: NewEntry) => Promise<boolean>; initial?: JournalEntry }) {
  const today = toISODate(new Date());
  const [body, setBody] = useState(initial?.body ?? '');
  const [date, setDate] = useState(initial?.entry_date ?? today);
  const [visibility, setVisibility] = useState<'private' | 'shared'>(initial?.visibility ?? 'shared');
  const [remindOn, setRemindOn] = useState<string | null>(initial?.remind_on ?? null);
  const [showDate, setShowDate] = useState(false);
  const detail = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if ((await onCreate({ date, body: body.trim(), visibility, remindOn })) && !initial) {
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
        {!initial && (
          <button type="button" onClick={() => setShowDate(v => !v)} className={`${detail} ${date !== today ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-soft'}`}>
            {date === today ? 'Hoje' : formatBR(date)} <ChevronDown className="w-3 h-3" />
          </button>
        )}
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
        <Heart className="w-4 h-4" /> {initial ? 'Salvar alterações' : 'Guardar momento'}
      </Button>
    </form>
  );
}

