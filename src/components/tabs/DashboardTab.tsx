import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookHeart, ChevronDown, Grid3x3, HeartHandshake, HeartPulse, Lightbulb, Route, Scale, Sparkles, TrendingUp, X } from 'lucide-react';
import { PHASES, PLAN_SOURCE, type PlanItem } from '../../data/prenatalPlan';
import type { CheckItem } from '../../hooks/useGestationData';
import { itemStatus, phaseOf, planFor, planProgress } from '../../lib/journey';
import { JourneyTimeline, PlanProgressChart } from '../charts/journeyCharts';
import { PhaseStrip, StepList } from '../journey/Journey';
import { SYMPTOM_CATEGORIES } from '../../data/symptomCatalog';
import { daysBetween, formatBR, parseLocalDate, toISODate, type GestationalAge } from '../../lib/dates';
import { isHighBloodPressure } from '../../lib/health';
import { careNotesFor, computeSymptomStats, findPatterns, inPeriod, timeOfDayLabel, toEntries, type Period, type SymptomStats, type Trend } from '../../lib/symptoms';
import { BMI_LABEL, GAIN_STATUS_LABEL, bmi, bmiClass, expectedGain, gainStatus } from '../../lib/weightGain';
import type { HealthMetric, PartnerComment, PregnancyProfile, SymptomItem } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { BloodPressureChart, CategoryHeatmap, Sparkline, SymptomTrendChart, TimeOfDayBars, WeightChart, type WeightPoint } from '../charts/charts';
import { InsightList } from '../InsightList';
import { inputClass } from '../styles';
import { Button, Card, EmptyState, Field, Pill, Segmented, SectionTitle } from '../ui';

type PeriodId = '4sem' | 'trimestre' | 'tudo';

interface Props {
  age: GestationalAge;
  profile: PregnancyProfile & { dumDate: string };
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  migrationPending: boolean;
  busy: boolean;
  onSaveProfile: (preWeightKg: number, heightCm: number) => Promise<boolean>;
  currentWeek: number;
  checks: CheckItem[];
  checksAvailable: boolean;
  onToggleStep: (itemId: string, done: boolean) => void;
}

const fmt = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const TREND: Record<Trend, { label: string; tone: 'alert' | 'ok' | 'neutral' | 'brand'; icon: React.ReactNode }> = {
  subindo: { label: 'piorando', tone: 'alert', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  descendo: { label: 'melhorando', tone: 'ok', icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  estavel: { label: 'estável', tone: 'neutral', icon: <ArrowRight className="w-3.5 h-3.5" /> },
  novo: { label: 'novo', tone: 'brand', icon: <Sparkles className="w-3.5 h-3.5" /> },
};

export default function DashboardTab({ age, profile, symptoms, comments, metrics, migrationPending, busy, onSaveProfile, currentWeek, checks, checksAvailable, onToggleStep }: Props) {
  const [periodId, setPeriodId] = useState<PeriodId>('4sem');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const today = parseLocalDate(toISODate(new Date()));
  const dum = parseLocalDate(profile.dumDate);
  const weekOf = (d: Date) => Math.max(0, Math.floor(daysBetween(dum, d) / 7));

  const startWeek = age.trimester === 1 ? 0 : age.trimester === 2 ? 13 : 27;
  const period: Period =
    periodId === '4sem' ? { from: addDays(today, -27), to: today } : periodId === 'trimestre' ? { from: addDays(dum, startWeek * 7), to: today } : { from: dum, to: today };

  const periodDays = daysBetween(period.from, period.to) + 1;
  const previous: Period = { from: addDays(period.from, -periodDays), to: addDays(period.from, -1) };

  const entries = toEntries(symptoms);
  const stats = computeSymptomStats(entries, period);
  const insights = findPatterns(entries, period);
  const inPeriodEntries = entries.filter(e => inPeriod(e.date, period));
  const prevEntries = entries.filter(e => inPeriod(e.date, previous));
  const avg = (list: typeof entries) => (list.length ? list.reduce((a, e) => a + e.intensity, 0) / list.length : null);
  const avgNow = avg(inPeriodEntries);
  const avgPrev = avg(prevEntries);
  const daysWithRecord = new Set(inPeriodEntries.map(e => e.date.toDateString())).size;

  const weekFrom = weekOf(period.from);
  const weekTo = weekOf(period.to);
  const selected = stats.find(s => s.key === selectedKey) ?? null;

  const heatAcc = new Map<string, { sum: number; count: number }>();
  for (const e of inPeriodEntries) {
    const key = `${e.category}|${e.week}`;
    const cur = heatAcc.get(key) ?? { sum: 0, count: 0 };
    heatAcc.set(key, { sum: cur.sum + e.intensity, count: cur.count + 1 });
  }
  const heatCells = new Map([...heatAcc.entries()].map(([k, v]) => [k, { avg: v.sum / v.count, count: v.count }]));

  const periodLabel = periodId === '4sem' ? 'últimas 4 semanas' : periodId === 'trimestre' ? `${age.trimester}º trimestre` : 'toda a gestação';

  return (
    <div className="space-y-5">
      <JourneySection
        profile={profile}
        currentWeek={currentWeek}
        checks={checks}
        checksAvailable={checksAvailable}
        busy={busy}
        onToggleStep={onToggleStep}
      />

      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <h2 className="text-[1.2rem] text-ink">Sintomas</h2>
          <p className="text-xs text-ink-mute">
            Semanas {weekFrom} a {weekTo} · {formatBR(toISODate(period.from))} a {formatBR(toISODate(period.to))}
          </p>
        </div>
        <Segmented
          label="Período do painel"
          size="sm"
          value={periodId}
          onChange={p => {
            setPeriodId(p);
            setSelectedKey(null);
          }}
          options={[
            { value: '4sem', label: '4 semanas' },
            { value: 'trimestre', label: 'Trimestre' },
            { value: 'tudo', label: 'Tudo' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Registros de sintomas" value={String(inPeriodEntries.length)} />
        <Stat label="Sintomas diferentes" value={String(stats.length)} />
        <Stat
          label="Intensidade média"
          value={avgNow !== null ? `${fmt(avgNow)}/5` : '—'}
          delta={avgNow !== null && avgPrev !== null ? { value: avgNow - avgPrev, label: 'vs. período anterior', goodWhenDown: true } : undefined}
        />
        <Stat label="Dias com registro" value={`${daysWithRecord}`} hint={`de ${periodDays} dias`} />
      </div>

      <Card>
        <SectionTitle icon={<Lightbulb className="w-5 h-5" />} title="O que os registros mostram" subtitle={`Padrões nas ${periodLabel}.`} />
        <InsightList insights={insights} onSelect={i => setSelectedKey(i.symptomKey ?? null)} />
      </Card>

      <Card>
        <SectionTitle icon={<Activity className="w-5 h-5" />} title="Frequência e tendência" subtitle="Toque em um sintoma para ver a evolução." />
        {stats.length === 0 ? (
          <EmptyState icon={<Activity />} title="Nenhum sintoma no período">Registros no Diário aparecem aqui com frequência, intensidade e tendência.</EmptyState>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-xs text-ink-mute">
                  <th className="font-semibold px-2 pb-2">Sintoma</th>
                  <th className="font-semibold px-2 pb-2 text-right">Vezes</th>
                  <th className="font-semibold px-2 pb-2 text-right">Média</th>
                  <th className="font-semibold px-2 pb-2">Tendência</th>
                  <th className="font-semibold px-2 pb-2">Por semana</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr
                    key={s.key}
                    onClick={() => setSelectedKey(s.key === selectedKey ? null : s.key)}
                    className={`cursor-pointer border-t border-line transition ${s.key === selectedKey ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
                  >
                    <td className="px-2 py-2.5">
                      <button className="text-left" aria-expanded={s.key === selectedKey}>
                        <span className="font-semibold text-ink block">{s.name}</span>
                        <span className="text-xs text-ink-mute">{s.category}{s.isAlert ? ' · sinal de alerta' : ''}</span>
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular font-semibold text-ink">{s.count}</td>
                    <td className="px-2 py-2.5 text-right tabular text-ink-soft">{fmt(s.avgIntensity)}</td>
                    <td className="px-2 py-2.5">{s.trend ? <Pill tone={TREND[s.trend].tone}>{TREND[s.trend].icon}{TREND[s.trend].label}</Pill> : <span className="text-ink-mute">—</span>}</td>
                    <td className="px-2 py-2.5"><Sparkline values={s.byWeek.map(w => w.avg)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && <SymptomDetail stats={selected} comments={comments} weekFrom={weekFrom} weekTo={weekTo} onClose={() => setSelectedKey(null)} />}

      {inPeriodEntries.length > 0 && (
        <Card>
          <SectionTitle icon={<Grid3x3 className="w-5 h-5" />} title="Mapa da gestação" subtitle="Intensidade média por tipo de sintoma em cada semana." />
          <CategoryHeatmap cells={heatCells} categories={SYMPTOM_CATEGORIES} weekFrom={weekFrom} weekTo={weekTo} />
        </Card>
      )}

      <WeightSection profile={profile} metrics={metrics} migrationPending={migrationPending} busy={busy} onSaveProfile={onSaveProfile} />
      <PressureSection metrics={metrics} />
    </div>
  );
}

/** Progresso, jornada planejada do pré-natal e o que importa em cada fase. */
function JourneySection({ profile, currentWeek, checks, checksAvailable, busy, onToggleStep }: { profile: PregnancyProfile & { dumDate: string }; currentWeek: number; checks: CheckItem[]; checksAvailable: boolean; busy: boolean; onToggleStep: (itemId: string, done: boolean) => void }) {
  const items = planFor(profile.bloodType);
  const prenatal = checks.filter(c => c.list === 'prenatal');
  const done = new Set(prenatal.map(c => c.item_id));
  const dum = parseLocalDate(profile.dumDate);
  const doneWeeks = new Map(prenatal.map(c => [c.item_id, Math.floor(daysBetween(dum, parseLocalDate(c.done_at)) / 7)]));
  const progress = planProgress(items, currentWeek, done);
  const phase = phaseOf(currentWeek);
  const [openPhase, setOpenPhase] = useState<string | null>(phase.id);
  const anytime = items.filter(i => i.anytime);
  const pctWeeks = Math.min(100, Math.round((currentWeek / 40) * 100));
  const toggle = (item: PlanItem, value: boolean) => onToggleStep(item.id, value);

  return (
    <>
      <Card>
        <SectionTitle icon={<TrendingUp className="w-5 h-5" />} title="Progresso" subtitle={`${phase.label} · ${phase.title}`} />
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-surface-2/60 px-4 py-3">
            <p className="text-xs text-ink-mute">Gestação</p>
            <p className="font-display text-2xl text-ink tabular">{pctWeeks}%</p>
            <p className="text-xs text-ink-mute">semana {currentWeek} de 40</p>
          </div>
          <div className="rounded-2xl bg-surface-2/60 px-4 py-3">
            <p className="text-xs text-ink-mute">Plano em dia</p>
            <p className="font-display text-2xl text-ink tabular">
              {progress.doneByNow}/{progress.dueByNow}
            </p>
            <p className="text-xs text-ink-mute">{progress.dueByNow === progress.doneByNow ? 'tudo o que já era previsto' : `${progress.dueByNow - progress.doneByNow} pendente${progress.dueByNow - progress.doneByNow > 1 ? 's' : ''}`}</p>
          </div>
        </div>
        <PhaseStrip week={currentWeek} />
        <div className="mt-5">
          <PlanProgressChart items={items} doneWeeks={doneWeeks} currentWeek={currentWeek} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Route className="w-5 h-5" />} title="Jornada do pré-natal" subtitle="Exames, vacinas e preparos na janela de semanas recomendada. Toque para ver e marcar como feito." />
        {!checksAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2 mb-3">Para marcar itens como feitos, rode a migração 007 no Neon.</p>}
        <JourneyTimeline items={items} currentWeek={currentWeek} done={done} dumDate={profile.dumDate} busy={busy || !checksAvailable} onToggle={toggle} />
        <h3 className="text-sm font-semibold text-ink mt-6 mb-2">Vacinas a qualquer momento</h3>
        <StepList steps={anytime.map(item => ({ item, status: itemStatus(item, currentWeek, done.has(item.id)) }))} dumDate={profile.dumDate} busy={busy || !checksAvailable} onToggle={toggle} />
        <p className="text-[11px] text-ink-mute mt-4">{PLAN_SOURCE}</p>
      </Card>

      <Card>
        <SectionTitle icon={<BookHeart className="w-5 h-5" />} title="O que importa em cada fase" />
        <ul className="divide-y divide-line">
          {PHASES.map(p => {
            const isOpen = openPhase === p.id;
            const isNow = p.id === phase.id;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setOpenPhase(isOpen ? null : p.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 py-3 text-left">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isNow ? 'bg-brand' : currentWeek > p.to ? 'bg-ok' : 'bg-line'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-ink">{p.title}</span>
                    <span className="text-xs text-ink-mute"> · {p.label}, sem. {p.from}–{p.to}</span>
                  </span>
                  {isNow && <Pill tone="brand">agora</Pill>}
                  <ChevronDown className={`w-4 h-4 text-ink-mute transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="pb-4 pl-5 space-y-2">
                    <p className="text-sm text-ink-soft">{p.focus}</p>
                    <p className="text-xs font-semibold text-ink">{p.visits}</p>
                    <ul className="space-y-1.5">
                      {p.care.map(c => (
                        <li key={c} className="text-sm text-ink flex gap-2">
                          <span className="text-brand">•</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}

function Stat({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: { value: number; label: string; goodWhenDown: boolean } }) {
  const good = delta ? (delta.goodWhenDown ? delta.value < 0 : delta.value > 0) : false;
  return (
    <div className="rounded-[24px] bg-surface shadow-soft p-4">
      <p className="text-xs font-semibold text-ink-mute">{label}</p>
      <p className="text-2xl font-semibold text-ink tabular mt-1">{value}</p>
      {hint && <p className="text-xs text-ink-mute">{hint}</p>}
      {delta && Math.abs(delta.value) >= 0.05 && (
        <p className={`text-xs font-semibold mt-1 ${good ? 'text-ok' : 'text-alert'}`}>
          {delta.value > 0 ? '▲' : '▼'} {fmt(Math.abs(delta.value))} {delta.label}
        </p>
      )}
    </div>
  );
}

function SymptomDetail({ stats: s, comments, weekFrom, weekTo, onClose }: { stats: SymptomStats; comments: PartnerComment[]; weekFrom: number; weekTo: number; onClose: () => void }) {
  const care = careNotesFor(s, comments);
  const byAuthor = { mae: s.entries.filter(e => e.author === 'mae').length, pai: s.entries.filter(e => e.author === 'pai').length };
  const notes = s.entries.filter(e => e.notes).slice(-4).reverse();
  return (
    <Card className="border-brand/40">
      <SectionTitle
        title={s.name}
        subtitle={`${s.count} ${s.count === 1 ? 'registro' : 'registros'} · média ${fmt(s.avgIntensity)}/5 · máximo ${s.maxIntensity} · de ${formatBR(toISODate(s.firstDate))} a ${formatBR(toISODate(s.lastDate))}`}
        action={
          <button onClick={onClose} aria-label="Fechar detalhe" className="p-2 rounded-full hover:bg-surface-2 text-ink-mute">
            <X className="w-4 h-4" />
          </button>
        }
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <h3 className="text-sm font-semibold text-ink-soft mb-2">Intensidade ao longo das semanas</h3>
          <SymptomTrendChart byWeek={s.byWeek} entries={s.entries.map(e => ({ week: e.week, intensity: e.intensity }))} weekFrom={weekFrom} weekTo={weekTo} />
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-ink-soft mb-2">Período do dia</h3>
            {s.timeOfDay.known > 0 ? (
              <>
                <TimeOfDayBars counts={s.timeOfDay.counts} />
                {s.timeOfDay.dominant && s.timeOfDay.share >= 0.5 && (
                  <p className="text-xs text-ink-mute mt-2">Mais comum de {timeOfDayLabel(s.timeOfDay.dominant).toLowerCase()}.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-mute">Os registros novos guardam o período do dia.</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-soft mb-2">Quem registrou</h3>
            <div className="flex gap-2">
              {byAuthor.mae > 0 && <span className="flex items-center gap-1.5 text-sm text-ink"><AuthorBadge role="mae" /> {byAuthor.mae}</span>}
              {byAuthor.pai > 0 && <span className="flex items-center gap-1.5 text-sm text-ink"><AuthorBadge role="pai" /> {byAuthor.pai}</span>}
            </div>
          </div>
        </div>
      </div>
      {(care.length > 0 || notes.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6 mt-6 pt-5 border-t border-line">
          {care.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-soft mb-2 flex items-center gap-1.5"><HeartHandshake className="w-4 h-4 text-brand" /> O que tem ajudado</h3>
              <ul className="space-y-1.5 text-sm">
                {care.slice(-5).reverse().map(c => <li key={c.id} className="text-ink">{c.comment_text} <AuthorBadge role={c.author_role} /></li>)}
              </ul>
            </div>
          )}
          {notes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-soft mb-2">Observações</h3>
              <ul className="space-y-1.5 text-sm">
                {notes.map(e => <li key={e.id} className="text-ink"><span className="text-ink-mute">{formatBR(toISODate(e.date))}:</span> {e.notes}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function WeightSection({ profile, metrics, migrationPending, busy, onSaveProfile }: { profile: PregnancyProfile & { dumDate: string }; metrics: HealthMetric[]; migrationPending: boolean; busy: boolean; onSaveProfile: (w: number, h: number) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const withWeight = metrics.filter(m => m.weight_kg !== null).map(m => ({ ...m, weight_kg: m.weight_kg as number }));
  const hasProfile = profile.preWeightKg !== null && profile.heightCm !== null;
  const cls = hasProfile ? bmiClass(bmi(profile.preWeightKg!, profile.heightCm!)) : null;

  const points: WeightPoint[] = withWeight.map(m => ({
    week: m.week_number,
    kg: m.weight_kg,
    value: hasProfile ? m.weight_kg - profile.preWeightKg! : m.weight_kg,
    date: m.recorded_at,
  }));
  const last = points[points.length - 1];
  const band = cls && points.length
    ? Array.from({ length: Math.max(2, Math.max(...points.map(p => p.week)) + 2 - Math.min(...points.map(p => p.week))) }, (_, i) => {
        const week = Math.min(...points.map(p => p.week)) + i;
        const [min, max] = expectedGain(week, cls);
        return { week, min, max };
      })
    : null;
  const status = cls && last ? gainStatus(last.value, last.week, cls) : null;

  return (
    <Card>
      <SectionTitle
        icon={<Scale className="w-5 h-5" />}
        title="Ganho de peso"
        subtitle={hasProfile ? `IMC antes da gravidez: ${fmt(bmi(profile.preWeightKg!, profile.heightCm!))} (${BMI_LABEL[cls!].toLowerCase()})` : 'Informe o peso de antes da gravidez e a altura para ver a faixa recomendada.'}
        action={!migrationPending && hasProfile ? <button onClick={() => setEditing(v => !v)} className="text-sm font-semibold text-ink-mute underline underline-offset-2">editar</button> : undefined}
      />
      {(!hasProfile || editing) && !migrationPending && (
        <ProfileForm initial={profile} busy={busy} onSave={async (w, h) => { if (await onSaveProfile(w, h)) setEditing(false); }} />
      )}
      {points.length < 2 ? (
        <EmptyState icon={<Scale />} title="Poucas medições de peso">Registre o peso no Diário. Com duas medições o gráfico aparece.</EmptyState>
      ) : (
        <div className="space-y-3 mt-2">
          {status && last && (
            <p className="text-ink">
              <strong className="tabular">{last.value >= 0 ? '+' : ''}{fmt(last.value)} kg</strong> desde antes da gravidez, <Pill tone={status === 'dentro' ? 'ok' : 'warn'}>{GAIN_STATUS_LABEL[status]}</Pill>
            </p>
          )}
          <WeightChart points={points} band={band} mode={hasProfile ? 'ganho' : 'peso'} />
          {hasProfile && (
            <p className="text-xs text-ink-mute">
              Faixa do Institute of Medicine (2009) por IMC pré-gestacional. A Caderneta da Gestante usa a curva brasileira, com valores próximos. Quem avalia o ganho de peso é o obstetra ou a nutricionista.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function ProfileForm({ initial, busy, onSave }: { initial: PregnancyProfile; busy: boolean; onSave: (w: number, h: number) => void }) {
  const [weight, setWeight] = useState(initial.preWeightKg?.toString().replace('.', ',') ?? '');
  const [height, setHeight] = useState(initial.heightCm?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid sm:grid-cols-3 gap-3 items-end bg-surface-2 rounded-2xl p-4 mb-4"
      onSubmit={e => {
        e.preventDefault();
        const w = Number(weight.replace(',', '.'));
        const h = Number(height.replace(',', '.'));
        if (!(w >= 30 && w <= 250) || !(h >= 120 && h <= 220)) {
          setError('Confira os valores: peso em kg (ex.: 60) e altura em cm (ex.: 165).');
          return;
        }
        setError(null);
        onSave(w, h);
      }}
    >
      <Field label="Peso antes da gravidez (kg)" htmlFor="peso-pre">
        <input id="peso-pre" inputMode="decimal" className={inputClass} placeholder="ex.: 60" value={weight} onChange={e => setWeight(e.target.value)} />
      </Field>
      <Field label="Altura (cm)" htmlFor="altura">
        <input id="altura" inputMode="numeric" className={inputClass} placeholder="ex.: 165" value={height} onChange={e => setHeight(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>Salvar</Button>
      {error && <p className="sm:col-span-3 text-sm font-semibold text-alert" role="alert">{error}</p>}
    </form>
  );
}

function PressureSection({ metrics }: { metrics: HealthMetric[] }) {
  const readings = metrics.filter(m => m.systolic_bp !== null && m.diastolic_bp !== null);
  const high = readings.filter(m => isHighBloodPressure(m.systolic_bp, m.diastolic_bp));
  return (
    <Card>
      <SectionTitle
        icon={<HeartPulse className="w-5 h-5" />}
        title="Pressão arterial"
        subtitle={readings.length ? `${readings.length} ${readings.length === 1 ? 'medição' : 'medições'}${high.length ? ` · ${high.length} acima de 140/90` : ' · nenhuma acima de 140/90'}` : undefined}
      />
      {readings.length === 0 ? (
        <EmptyState icon={<HeartPulse />} title="Nenhuma pressão registrada">Medições em casa ou na consulta podem ser registradas no Diário.</EmptyState>
      ) : (
        <>
          <BloodPressureChart
            points={readings.map(m => ({
              label: `sem ${m.week_number}`,
              date: `${formatBR(m.recorded_at)} · semana ${m.week_number}`,
              systolic: m.systolic_bp!,
              diastolic: m.diastolic_bp!,
            }))}
          />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-ink-mute">Ver em tabela</summary>
            <table className="w-full mt-2 tabular">
              <thead>
                <tr className="text-left text-xs text-ink-mute"><th className="py-1">Data</th><th>Semana</th><th>Pressão</th></tr>
              </thead>
              <tbody>
                {readings.map(m => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-1.5">{formatBR(m.recorded_at)}</td>
                    <td>{m.week_number}</td>
                    <td className={isHighBloodPressure(m.systolic_bp, m.diastolic_bp) ? 'text-alert font-semibold' : ''}>{m.systolic_bp}/{m.diastolic_bp} mmHg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  );
}
