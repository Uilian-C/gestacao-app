import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Plus, Scale } from 'lucide-react';
import { COMMON_SYMPTOMS, SYMPTOM_CATEGORIES, isAlertSymptom } from '../../content/symptomCatalog';
import { parseMetricInput, type ParsedMetric } from '../../lib/health';
import { INTENSITY } from '../../lib/intensity';
import { TIME_OF_DAY, normalizeSymptomName, timeOfDayFromHour, timeOfDayLabel } from '../../lib/symptoms';
import type { Author, HealthMetric, SymptomItem, TimeOfDay } from '../../types';
import { inputClass } from '../styles';
import { formatBR, toISODate } from '../../lib/dates';
import DayPicker from './DayPicker';
import { Button, Segmented } from '../ui';

// Formulários de registro: no botão "+" (registro rápido) e, preenchidos, para editar nos detalhes.

export interface NewSymptom {
  /** Dia do sintoma (AAAA-MM-DD): hoje, ontem ou outro dia. */
  date: string;
  name: string;
  category: string;
  intensity: number;
  timeOfDay: TimeOfDay;
  notes: string;
}

/** Categoria conhecida de um sintoma: histórico do casal primeiro, depois o catálogo. */
function knownCategories(history: SymptomItem[]) {
  const map = new Map<string, string>();
  for (const list of Object.values(COMMON_SYMPTOMS)) for (const c of list) map.set(normalizeSymptomName(c.name), c.category);
  for (const s of history) map.set(normalizeSymptomName(s.symptom_name), s.category);
  return map;
}

/** Registro de sintoma. Com `initial`, abre preenchido para editar (e não limpa ao salvar). */
export function SymptomForm({ author, dumDate, trimester, history, busy, onCreate, initial }: { author: Author; dumDate: string; trimester: 1 | 2 | 3; history: SymptomItem[]; busy: boolean; onCreate: (s: NewSymptom) => Promise<boolean>; initial?: SymptomItem }) {
  const [date, setDate] = useState(initial?.log_date.slice(0, 10) ?? toISODate(new Date()));
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
    if ((await onCreate({ date, name: name.trim(), category, intensity, timeOfDay, notes: notes.trim() })) && !initial) {
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
          placeholder={author === 'pai' ? 'O que ela está sentindo?' : 'O que você está sentindo?'}
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

      <DayPicker value={date} onChange={setDate} dumDate={dumDate} />

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
        {name.trim() && !intensity ? 'Escolha a intensidade' : initial ? 'Salvar alterações' : 'Salvar sintoma'}
      </Button>
    </form>
  );
}

const asText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v).replace('.', ','));

/** Medição com o dia em que foi feita. */
export type NewMetric = ParsedMetric & { date: string };

export function MetricForm({ busy, dumDate, onCreate, initial, last }: { busy: boolean; dumDate: string; onCreate: (m: NewMetric) => Promise<boolean>; initial?: HealthMetric; last?: { weight: HealthMetric | null; pressure: HealthMetric | null } }) {
  const [date, setDate] = useState(initial?.recorded_at.slice(0, 10) ?? toISODate(new Date()));
  const [weight, setWeight] = useState(asText(initial?.weight_kg));
  const [systolic, setSystolic] = useState(asText(initial?.systolic_bp));
  const [diastolic, setDiastolic] = useState(asText(initial?.diastolic_bp));
  const [error, setError] = useState<string | null>(null);
  const empty = !weight.trim() && !systolic.trim() && !diastolic.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMetricInput({ weight, systolic, diastolic });
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    if ((await onCreate({ ...parsed, date })) && !initial) {
      setWeight('');
      setSystolic('');
      setDiastolic('');
    }
  };

  const box = 'flex items-center rounded-2xl bg-surface-2 pr-4 transition focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand/15';
  const field = 'w-full min-w-0 bg-transparent px-4 py-3 text-[1.35rem] font-display font-semibold text-ink placeholder:text-ink-mute placeholder:font-sans placeholder:text-base placeholder:font-normal focus:outline-none tabular';

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="peso" className="text-sm font-semibold text-ink-soft">Peso</label>
        <div className={box}>
          <input id="peso" aria-label="Peso (kg)" inputMode="decimal" className={field} placeholder="ex.: 64,5" value={weight} onChange={e => setWeight(e.target.value)} />
          <span className="text-sm font-bold text-ink-mute">kg</span>
        </div>
        {last?.weight && !initial && <p className="text-xs text-ink-mute">Último: {asText(last.weight.weight_kg)} kg em {formatBR(last.weight.recorded_at.slice(0, 10))}</p>}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-semibold text-ink-soft block">Pressão</span>
        <div className={box}>
          <input id="sistolica" aria-label="Pressão máxima" inputMode="numeric" className={field} placeholder="máxima (120)" value={systolic} onChange={e => setSystolic(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          <span className="text-xl font-bold text-ink-mute px-1" aria-hidden>/</span>
          <input id="diastolica" aria-label="Pressão mínima" inputMode="numeric" className={field} placeholder="mínima (80)" value={diastolic} onChange={e => setDiastolic(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          <span className="text-sm font-bold text-ink-mute">mmHg</span>
        </div>
        {last?.pressure && !initial && <p className="text-xs text-ink-mute">Última: {last.pressure.systolic_bp}/{last.pressure.diastolic_bp} em {formatBR(last.pressure.recorded_at.slice(0, 10))}</p>}
      </div>

      <DayPicker value={date} onChange={setDate} dumDate={dumDate} />

      <p className="text-xs text-ink-mute">Preencha só o que foi medido. Peso e pressão podem ser registrados separados.</p>
      {error && <p className="text-sm font-semibold text-alert" role="alert">{error}</p>}
      <Button type="submit" disabled={busy || empty} className="w-full">
        <Scale className="w-4 h-4" /> {initial ? 'Salvar alterações' : 'Salvar medição'}
      </Button>
    </form>
  );
}
