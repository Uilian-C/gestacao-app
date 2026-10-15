import { useState } from 'react';
import { AlertTriangle, BarChart2, Scale, Trash2 } from 'lucide-react';
import AuthorBadge from '../AuthorBadge';
import { formatBR } from '../../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure, parseMetricInput, type ParsedMetric } from '../../lib/health';
import type { HealthMetric } from '../../types';

interface Props {
  metrics: HealthMetric[];
  currentWeek: number;
  busy: boolean;
  onCreate: (metric: ParsedMetric) => Promise<boolean>;
  onDelete: (metric: HealthMetric) => void;
}

export default function MetricsTab({ metrics, currentWeek, busy, onCreate, onDelete }: Props) {
  const [weight, setWeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const latestBp = [...metrics].reverse().find(m => m.systolic_bp !== null && m.diastolic_bp !== null);
  const latestBpHigh = latestBp ? isHighBloodPressure(latestBp.systolic_bp, latestBp.diastolic_bp) : false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMetricInput({ weight, systolic, diastolic });
    if ('error' in parsed) {
      setFormError(parsed.error);
      return;
    }
    setFormError(null);
    if (await onCreate(parsed)) {
      setWeight('');
      setSystolic('');
      setDiastolic('');
    }
  };

  return (
    <div className="space-y-4">
      {latestBpHigh && latestBp && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-4 flex gap-3" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">
              Última pressão registrada: {latestBp.systolic_bp}/{latestBp.diastolic_bp} mmHg ({formatBR(latestBp.recorded_at)})
            </p>
            <p>
              Valores a partir de {HIGH_SYSTOLIC}/{HIGH_DIASTOLIC} na gestação pedem contato com o obstetra. Se vier com dor de cabeça forte, visão turva, dor na
              parte de cima da barriga ou inchaço súbito, procure a maternidade.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-white p-5 rounded-2xl shadow-sm border space-y-4" noValidate>
        <h3 className="font-bold text-sm uppercase flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-600" /> Registrar medição de hoje (semana {currentWeek})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            Peso (kg)
            <input inputMode="decimal" placeholder="ex.: 64,5" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            Pressão máxima (sistólica)
            <input inputMode="numeric" placeholder="ex.: 120" value={systolic} onChange={e => setSystolic(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            Pressão mínima (diastólica)
            <input inputMode="numeric" placeholder="ex.: 80" value={diastolic} onChange={e => setDiastolic(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-normal" />
          </label>
        </div>
        <p className="text-[11px] text-slate-500">Preencha só o que foi medido. Peso e pressão podem ser registrados separados.</p>
        {formError && <p className="text-sm text-rose-700 font-semibold" role="alert">{formError}</p>}
        <button type="submit" disabled={busy} className="w-full bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm">
          Registrar
        </button>
      </form>

      <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-6">
        <h3 className="font-bold text-sm uppercase flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-600" /> Evolução do peso
        </h3>
        <WeightChart metrics={metrics} />
        <p className="text-[11px] text-slate-500">
          A comparação com a faixa de ganho de peso recomendada depende do peso e da altura de antes da gravidez e chega numa próxima versão.
        </p>

        <div className="pt-2 space-y-2">
          {metrics.length === 0 && <p className="text-sm text-slate-500">Nenhuma medição registrada.</p>}
          {[...metrics].reverse().map(m => {
            const high = isHighBloodPressure(m.systolic_bp, m.diastolic_bp);
            return (
              <div key={m.id} className={`flex justify-between items-center p-3 rounded-xl border ${high ? 'bg-rose-50 border-rose-200' : 'bg-slate-50'}`}>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs">Semana {m.week_number}</span>
                    <span className="text-[11px] text-slate-500">{formatBR(m.recorded_at)}</span>
                    <AuthorBadge role={m.created_by} />
                  </div>
                  <span className={`text-xs block ${high ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                    {m.systolic_bp !== null && m.diastolic_bp !== null ? `Pressão: ${m.systolic_bp}/${m.diastolic_bp} mmHg${high ? ' · acima de 140/90' : ''}` : 'Pressão não medida'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm">{m.weight_kg !== null ? `${m.weight_kg.toLocaleString('pt-BR')} kg` : '—'}</span>
                  <button onClick={() => onDelete(m)} aria-label={`Excluir medição da semana ${m.week_number}`} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Linha do peso por semana, com eixo em kg. Sem faixa de referência até termos o IMC pré-gestacional. */
function WeightChart({ metrics }: { metrics: HealthMetric[] }) {
  const points = metrics.filter((m): m is HealthMetric & { weight_kg: number } => m.weight_kg !== null);
  if (points.length < 2) {
    return <p className="text-sm text-slate-500 bg-slate-50 border rounded-xl p-4">Registre pelo menos duas medições de peso para ver a evolução.</p>;
  }

  const W = 400, H = 180, padL = 40, padR = 12, padT = 16, padB = 26;
  const weights = points.map(p => p.weight_kg);
  const minY = Math.floor(Math.min(...weights) - 1);
  const maxY = Math.ceil(Math.max(...weights) + 1);
  const minX = Math.min(...points.map(p => p.week_number));
  const maxX = Math.max(...points.map(p => p.week_number), minX + 1);
  const x = (week: number) => padL + ((week - minX) / (maxX - minX)) * (W - padL - padR);
  const y = (kg: number) => padT + (1 - (kg - minY) / (maxY - minY)) * (H - padT - padB);
  const ticks = [minY, (minY + maxY) / 2, maxY];
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.week_number).toFixed(1)},${y(p.weight_kg).toFixed(1)}`).join(' ');
  const gain = weights[weights.length - 1] - weights[0];

  return (
    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
      <p className="text-xs text-slate-600">
        Variação desde a semana {points[0].week_number}: <strong>{gain >= 0 ? '+' : ''}{gain.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico do peso por semana">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#64748b">{t.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map(p => (
          <g key={p.id}>
            <circle cx={x(p.week_number)} cy={y(p.weight_kg)} r="4" fill="#059669">
              <title>{`Semana ${p.week_number}: ${p.weight_kg.toLocaleString('pt-BR')} kg`}</title>
            </circle>
            <text x={x(p.week_number)} y={H - 8} textAnchor="middle" fontSize="12" fill="#64748b">{p.week_number}</text>
          </g>
        ))}
        <text x={padL - 6} y={10} textAnchor="end" fontSize="11" fill="#64748b">kg</text>
      </svg>
    </div>
  );
}
