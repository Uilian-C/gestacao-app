import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Grid3x3, HeartHandshake, HeartPulse, Lightbulb, Scale, Sparkles, X } from 'lucide-react';
import { SYMPTOM_CATEGORIES } from '../../content/symptomCatalog';
import { daysBetween, formatBR, parseLocalDate, toISODate, type GestationalAge } from '../../lib/dates';
import { isHighBloodPressure } from '../../lib/health';
import { careNotesFor, computeSymptomStats, findPatterns, inPeriod, timeOfDayLabel, toEntries, type Period, type SymptomStats, type Trend } from '../../lib/symptoms';
import { BMI_LABEL, GAIN_STATUS_LABEL, bmi, bmiClass, expectedGain, gainStatus } from '../../lib/weightGain';
import type { DashboardView, HealthMetric, PartnerComment, PregnancyProfile, SymptomItem } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { BloodPressureChart, CategoryHeatmap, Sparkline, SymptomTrendChart, TimeOfDayBars, WeightChart, type WeightPoint } from '../charts/charts';
import { InsightList } from '../InsightList';
import { inputClass } from '../styles';
import { Button, Card, EmptyState, Field, Fold, Pill, Segmented, SectionTitle } from '../ui';

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
  view: DashboardView;
  /** Os registros do período, por dia, embaixo dos gráficos. */
  records: (period: Period) => React.ReactNode;
}

const fmt = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const TREND: Record<Trend, { label: string; tone: 'alert' | 'ok' | 'neutral' | 'brand'; icon: React.ReactNode }> = {
  subindo: { label: 'piorando', tone: 'alert', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  descendo: { label: 'melhorando', tone: 'ok', icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  estavel: { label: 'estável', tone: 'neutral', icon: <ArrowRight className="w-3.5 h-3.5" /> },
  novo: { label: 'novo', tone: 'brand', icon: <Sparkles className="w-3.5 h-3.5" /> },
};

export default function DashboardTab(props: Props) {
  const { age, profile, symptoms, comments, metrics, migrationPending, busy, onSaveProfile, view } = props;
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



  return (
    <div className="space-y-5">
      {view === 'sintomas' && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-xs text-ink-mute">
              Semanas {weekFrom} a {weekTo} · {formatBR(toISODate(period.from))} a {formatBR(toISODate(period.to))}
            </p>
            <Segmented
              label="Período"
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

          {inPeriodEntries.length > 0 && (
            <p className="px-1 text-[14px] text-ink-soft">
              <strong className="text-ink">{inPeriodEntries.length}</strong> {inPeriodEntries.length === 1 ? 'registro' : 'registros'} em {daysWithRecord} {daysWithRecord === 1 ? 'dia' : 'dias'} · intensidade média <strong className="text-ink">{fmt(avgNow!)}/5</strong>
              {avgPrev !== null && Math.abs(avgNow! - avgPrev) >= 0.1 && <span className={avgNow! < avgPrev ? 'text-ok' : 'text-alert'}> ({avgNow! < avgPrev ? 'melhor' : 'pior'} que antes)</span>}
            </p>
          )}

          {/* Primeiro o que responde "está melhorando?": cada sintoma, quantas vezes e a tendência. */}
          {stats.length > 0 && (
            <Fold icon={<Activity />} title="Frequência e tendência" summary={`${stats.length} ${stats.length === 1 ? 'sintoma' : 'sintomas'} · toque num para ver a evolução`} defaultOpen>
              <SymptomTable stats={stats} selectedKey={selectedKey} onSelect={setSelectedKey} />
              {selected && (
                <div className="mt-4">
                  <SymptomDetail stats={selected} comments={comments} weekFrom={weekFrom} weekTo={weekTo} onClose={() => setSelectedKey(null)} />
                </div>
              )}
            </Fold>
          )}

          {insights.length > 0 && (
            <Fold icon={<Lightbulb />} title="O que os registros mostram" summary={insights.length === 1 ? insights[0].title : `${insights[0].title} e mais ${insights.length - 1}`} defaultOpen>
              <InsightList insights={insights} onSelect={i => setSelectedKey(i.symptomKey ?? null)} />
            </Fold>
          )}

          {/* O mapa da gestação inteira fica recolhido: abre para quem quer o panorama. */}
          {inPeriodEntries.length > 0 && (
            <Fold icon={<Grid3x3 />} title="Mapa da gestação" summary="Intensidade por tipo de sintoma, semana a semana">
              <CategoryHeatmap cells={heatCells} categories={SYMPTOM_CATEGORIES} weekFrom={weekFrom} weekTo={weekTo} />
            </Fold>
          )}

          <section aria-label="Registros de sintomas" className="space-y-3">
            <h2 className="px-1 text-[1.1rem] text-ink">Registros</h2>
            {props.records(period)}
          </section>
        </>
      )}

      {view === 'corpo' && (
        <>
          <WeightSection profile={profile} metrics={metrics} migrationPending={migrationPending} busy={busy} onSaveProfile={onSaveProfile} />
          <PressureSection metrics={metrics} />
          <section aria-label="Registros de peso e pressão" className="space-y-3">
            <h2 className="px-1 text-[1.1rem] text-ink">Registros</h2>
            {props.records({ from: dum, to: today })}
          </section>
        </>
      )}
    </div>
  );
}

function SymptomTable({ stats, selectedKey, onSelect }: { stats: SymptomStats[]; selectedKey: string | null; onSelect: (k: string | null) => void }) {
  return (
    <ul className="divide-y divide-line">
      {stats.map(s => (
        <li key={s.key}>
          <button
            type="button"
            onClick={() => onSelect(s.key === selectedKey ? null : s.key)}
            aria-expanded={s.key === selectedKey}
            className={`w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl text-left transition ${s.key === selectedKey ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
          >
            <span className="flex-1 min-w-0">
              <span className="font-semibold text-ink block truncate">{s.name}</span>
              <span className="text-xs text-ink-mute">
                {s.count}× · média {fmt(s.avgIntensity)} · {s.category}
                {s.isAlert ? ' · alerta' : ''}
              </span>
            </span>
            <Sparkline values={s.byWeek.map(w => w.avg)} />
            {s.trend && <Pill tone={TREND[s.trend].tone}>{TREND[s.trend].icon}{TREND[s.trend].label}</Pill>}
          </button>
        </li>
      ))}
    </ul>
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
    <Fold icon={<Scale />} title="Ganho de peso" summary={last ? `${fmt(last.kg)} kg na semana ${last.week}${status ? ` · ${GAIN_STATUS_LABEL[status].toLowerCase()}` : ''}` : 'Nenhum peso registrado ainda'} defaultOpen>
      <p className="text-[13px] text-ink-soft mb-3">
        {hasProfile ? `IMC antes da gravidez: ${fmt(bmi(profile.preWeightKg!, profile.heightCm!))} (${BMI_LABEL[cls!].toLowerCase()}).` : 'Informe o peso de antes da gravidez e a altura para ver a faixa recomendada.'}
        {!migrationPending && hasProfile && (
          <button onClick={() => setEditing(v => !v)} className="ml-1.5 text-[13px] font-semibold text-ink-mute underline underline-offset-2">
            editar
          </button>
        )}
      </p>
      {(!hasProfile || editing) && !migrationPending && (
        <ProfileForm initial={profile} busy={busy} onSave={async (w, h) => { if (await onSaveProfile(w, h)) setEditing(false); }} />
      )}
      {points.length < 2 ? (
        <EmptyState icon={<Scale />} title={last ? `Último peso: ${fmt(last.kg)} kg` : 'Poucas medições de peso'}>
          {last ? `Semana ${last.week}. Com mais uma medição o gráfico aparece.` : 'Use “Registrar peso ou pressão”, logo acima. Com duas medições o gráfico aparece.'}
        </EmptyState>
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
    </Fold>
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
    <Fold icon={<HeartPulse />} title="Pressão arterial" summary={readings.length ? `${readings.length} ${readings.length === 1 ? 'medição' : 'medições'}${high.length ? ` · ${high.length} acima de 140/90` : ' · nenhuma acima de 140/90'}` : 'Nenhuma pressão registrada ainda'} defaultOpen={high.length > 0}>
      {readings.length === 0 ? (
        <EmptyState icon={<HeartPulse />} title="Nenhuma pressão registrada">Medições em casa ou na consulta: use “Registrar peso ou pressão”, logo acima.</EmptyState>
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
    </Fold>
  );
}
