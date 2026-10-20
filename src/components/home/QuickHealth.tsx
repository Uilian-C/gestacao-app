import { useEffect, useState } from 'react';
import { ChevronRight, HeartPulse, Plus, Scale } from 'lucide-react';
import type { NewMetric } from '../forms/RecordForms';
import { daysBetween, parseLocalDate, toISODate } from '../../lib/dates';
import { isHighBloodPressure, parseMetricInput } from '../../lib/health';
import type { HealthMetric } from '../../types';
import { inputClass } from '../styles';
import { Button } from '../ui';

// Início → Saúde rápida: o último peso e a última pressão, e registrar um
// novo valor com um toque (sem abrir o formulário inteiro).

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const ago = (iso: string) => {
  const d = daysBetween(parseLocalDate(iso.slice(0, 10)), parseLocalDate(toISODate(new Date())));
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
};

export default function QuickHealth({ metrics, preWeightKg, busy, onSave, onMore }: { metrics: HealthMetric[]; preWeightKg: number | null; busy: boolean; onSave: (m: NewMetric) => Promise<boolean>; onMore: () => void }) {
  const [open, setOpen] = useState<'peso' | 'pressao' | null>(null);
  const [weight, setWeight] = useState('');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(null), 3000);
    return () => window.clearTimeout(t);
  }, [saved]);

  const lastWeight = [...metrics].filter(m => m.weight_kg !== null).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).pop();
  const lastBp = [...metrics].filter(m => m.systolic_bp !== null && m.diastolic_bp !== null).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).pop();
  const gain = lastWeight && preWeightKg !== null ? lastWeight.weight_kg! - preWeightKg : null;
  const high = lastBp ? isHighBloodPressure(lastBp.systolic_bp, lastBp.diastolic_bp) : false;

  const toggle = (which: 'peso' | 'pressao') => {
    setOpen(open === which ? null : which);
    setError(null);
    setSaved(null);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMetricInput(open === 'peso' ? { weight, systolic: '', diastolic: '' } : { weight: '', systolic: sys, diastolic: dia });
    if ('error' in parsed) return setError(parsed.error);
    if (await onSave({ ...parsed, date: toISODate(new Date()) })) {
      setSaved(open === 'peso' ? 'Peso registrado.' : 'Pressão registrada.');
      setOpen(null);
      setWeight('');
      setSys('');
      setDia('');
    }
  };

  const tile = 'flex-1 min-w-0 rounded-2xl px-3.5 py-3 text-left transition active:scale-[0.98]';
  return (
    <section aria-label="Saúde rápida" className="rounded-[24px] bg-surface shadow-soft p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink font-sans">
          <HeartPulse className="w-4 h-4 text-coral" /> Saúde rápida
        </h2>
        <button type="button" onClick={onMore} className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-strong">
          Ver evolução <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => toggle('peso')} aria-expanded={open === 'peso'} aria-label="Registrar peso" className={`${tile} ${open === 'peso' ? 'bg-brand-soft' : 'bg-surface-2/70'}`}>
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            <Scale className="w-3.5 h-3.5" /> Peso
          </span>
          <span className="block font-display text-[1.35rem] leading-tight text-ink tabular">{lastWeight ? `${fmt(lastWeight.weight_kg!)} kg` : '—'}</span>
          <span className="block text-[11.5px] text-ink-mute truncate">{lastWeight ? `${gain !== null ? `${gain >= 0 ? '+' : ''}${fmt(gain)} kg · ` : ''}${ago(lastWeight.recorded_at)}` : 'sem registro'}</span>
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand-strong">
            <Plus className="w-3.5 h-3.5" /> Registrar
          </span>
        </button>
        <button type="button" onClick={() => toggle('pressao')} aria-expanded={open === 'pressao'} aria-label="Registrar pressão" className={`${tile} ${open === 'pressao' ? 'bg-brand-soft' : high ? 'bg-alert-soft' : 'bg-surface-2/70'}`}>
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            <HeartPulse className="w-3.5 h-3.5" /> Pressão
          </span>
          <span className={`block font-display text-[1.35rem] leading-tight tabular ${high ? 'text-alert' : 'text-ink'}`}>{lastBp ? `${lastBp.systolic_bp}/${lastBp.diastolic_bp}` : '—'}</span>
          <span className={`block text-[11.5px] leading-snug ${high ? 'text-alert font-semibold' : 'text-ink-mute truncate'}`}>{lastBp ? (high ? '140/90 ou mais: avisem a equipe' : ago(lastBp.recorded_at)) : 'sem registro'}</span>
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand-strong">
            <Plus className="w-3.5 h-3.5" /> Registrar
          </span>
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          {open === 'peso' ? (
            <label className="flex-1 min-w-[140px] text-xs font-semibold text-ink-soft space-y-1">
              <span>Peso de hoje (kg)</span>
              <input autoFocus aria-label="Peso em kg" inputMode="decimal" placeholder="Ex.: 64,5" className={`${inputClass} !py-2`} value={weight} onChange={e => setWeight(e.target.value)} />
            </label>
          ) : (
            <>
              <label className="w-[96px] text-xs font-semibold text-ink-soft space-y-1">
                <span>Máxima</span>
                <input autoFocus aria-label="Pressão máxima" inputMode="numeric" placeholder="120" className={`${inputClass} !py-2`} value={sys} onChange={e => setSys(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </label>
              <span className="pb-2.5 text-ink-mute">/</span>
              <label className="w-[96px] text-xs font-semibold text-ink-soft space-y-1">
                <span>Mínima</span>
                <input aria-label="Pressão mínima" inputMode="numeric" placeholder="80" className={`${inputClass} !py-2`} value={dia} onChange={e => setDia(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </label>
            </>
          )}
          <Button type="submit" disabled={busy} className="!px-4 !py-2">Salvar</Button>
          {error && <p role="alert" className="basis-full text-xs font-semibold text-alert">{error}</p>}
        </form>
      )}
      {saved && <p role="status" className="text-xs font-semibold text-ok">{saved}</p>}
    </section>
  );
}
