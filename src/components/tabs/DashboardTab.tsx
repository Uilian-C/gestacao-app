import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Grid3x3, HeartHandshake, HeartPulse, Lightbulb, Scale, Sparkles, X } from 'lucide-react';
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
}

const fmt = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const TREND: Record<Trend, { label: string; tone: 'alert' | 'ok' | 'neutral' | 'brand'; icon: React.ReactNode }> = {
  subindo: { label: 'piorando', tone: 'alert', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  descendo: { label: 'melhorando', tone: 'ok', icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  estavel: { label: 'estável', tone: 'neutral', icon: <ArrowRight className="w-3.5 h-3.5" /> },
  novo: { label: 'novo', tone: 'brand', icon: <Sparkles className="w-3.5 h-3.5" /> },
};

export default function DashboardTab({ age, profile, symptoms, comments, metrics, migrationPending, busy, onSaveProfile }: Props) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">Painel da gestação</h2>
          <p className="text-sm text-ink-mute">
            Semanas {weekFrom} a {weekTo} · {formatBR(toISODate(period.from))} a {formatBR(toISODate(period.to))}
          </p>
        </div>
        <Segmented
          label="Período do painel"
          value={periodId}
          onChange={p => {
            setPeriodId(p);
            setSelectedKey(null);
          }}
          options={[
            { value: '4sem', label: '4 semanas' },
            { value: 'trimestre', label: 'Trimestre' },
            { value: 'tudo', label: 'Gestação toda' },
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
        <SectionTitle icon={<Lightbulb className="w-5 h-5" />} title="O que os registros mostram" subtitle={`Padrões encontrados nas ${periodLabel}. Toque em um para ver o sintoma.`} />
        <InsightList insights={insights} onSelect={i => setSelectedKey(i.symptomKey ?? null)} />
      </Card>

      <Card>
        <SectionTitle icon={<Activity className="w-5 h-5" />} title="Sintomas" subtitle="Ordenados pela frequência. Toque para ver a evolução." />
        {stats.length === 0 ? (
          <EmptyState emoji="🌿" title="Nenhum sintoma no período">Registros no Diário aparecem aqui com frequência, intensidade e tendência.</EmptyState>
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
                        <span className="font-bold text-ink block">{s.name}</span>
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

function Stat({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: { value: number; label: string; goodWhenDown: boolean } }) {
  const good = delta ? (delta.goodWhenDown ? delta.value < 0 : delta.value > 0) : false;
  return (
    <div className="rounded-3xl bg-surface border border-line p-4">
      <p className="text-xs font-semibold text-ink-mute">{label}</p>
      <p className="text-2xl font-extrabold text-ink tabular mt-1">{value}</p>
      {hint && <p className="text-xs text-ink-mute">{hint}</p>}
      {delta && Math.abs(delta.value) >= 0.05 && (
        <p className={`text-xs font-bold mt-1 ${good ? 'text-ok' : 'text-alert'}`}>
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
          <h3 className="text-sm font-bold text-ink-soft mb-2">Intensidade ao longo das semanas</h3>
          <SymptomTrendChart byWeek={s.byWeek} entries={s.entries.map(e => ({ week: e.week, intensity: e.intensity }))} weekFrom={weekFrom} weekTo={weekTo} />
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-ink-soft mb-2">Período do dia</h3>
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
            <h3 className="text-sm font-bold text-ink-soft mb-2">Quem registrou</h3>
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
              <h3 className="text-sm font-bold text-ink-soft mb-2 flex items-center gap-1.5"><HeartHandshake className="w-4 h-4 text-brand" /> O que tem ajudado</h3>
              <ul className="space-y-1.5 text-sm">
                {care.slice(-5).reverse().map(c => <li key={c.id} className="text-ink">{c.comment_text} <AuthorBadge role={c.author_role} /></li>)}
              </ul>
            </div>
          )}
          {notes.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink-soft mb-2">Observações</h3>
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
        <EmptyState emoji="⚖️" title="Poucas medições de peso">Registre o peso no Diário. Com duas medições o gráfico aparece.</EmptyState>
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
        <EmptyState emoji="🩺" title="Nenhuma pressão registrada">Medições em casa ou na consulta podem ser registradas no Diário.</EmptyState>
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
                    <td className={isHighBloodPressure(m.systolic_bp, m.diastolic_bp) ? 'text-alert font-bold' : ''}>{m.systolic_bp}/{m.diastolic_bp} mmHg</td>
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
