import { useState } from 'react';
import { PHASES } from '../../content/prenatalPlan';
import { useElementWidth } from '../../hooks/useElementWidth';
import { phaseOf } from '../../lib/journey';
import type { JourneyRow } from '../../lib/journeyPlan';
import { parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';

// O progresso da Jornada à vista: a gestação nas quatro fases, com a semana
// de hoje, e o planejado × realizado semana a semana (o que já devia ter
// começado, o que foi feito e o que está agendado).

const W_FROM = 4;
const W_TO = 42;

/** A gestação nas quatro fases, com o marcador da semana atual. */
export function GestationStrip({ week }: { week: number }) {
  const current = phaseOf(week);
  const pos = Math.min(100, Math.max(0, ((week - W_FROM) / (40 - W_FROM)) * 100));
  return (
    <div className="space-y-1.5" aria-label={`Semana ${week} de 40, fase ${current.title}`} role="img">
      <div className="relative pt-6">
        <span className="absolute top-0 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-extrabold text-surface whitespace-nowrap" style={{ left: `clamp(24px, ${pos}%, calc(100% - 24px))` }}>
          sem. {week}
        </span>
        <div className="flex gap-1 h-2.5">
          {PHASES.map(p => {
            const span = Math.min(p.to, 40) - p.from + 1;
            const filled = Math.min(1, Math.max(0, (week - p.from + 1) / span));
            return (
              <div key={p.id} className="relative rounded-full bg-surface overflow-hidden" style={{ flex: span }}>
                <div className={`absolute inset-y-0 left-0 rounded-full ${p.id === current.id ? 'bg-brand' : 'bg-brand/45'}`} style={{ width: `${filled * 100}%` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative h-4 text-[10.5px] text-ink-mute">
        {PHASES.map((p, i) => {
          // Cada nome no começo da sua fase; o último preso à borda direita, para não cortar.
          const start = (p.from - W_FROM) / (40 - W_FROM + 1);
          const edge = i === PHASES.length - 1 ? { right: 0 } : { left: `${start * 100}%` };
          return (
            <span key={p.id} className={`absolute top-0 whitespace-nowrap ${p.id === current.id ? 'text-ink font-bold' : ''}`} style={edge}>
              {p.title}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const weekOf = (dumDate: string, iso: string) => Math.floor((parseLocalDate(iso).getTime() - parseLocalDate(dumDate).getTime()) / (7 * 86_400_000));

/** Planejado × realizado: quantos itens já deviam ter começado, quantos foram feitos e os agendados. */
export function PlanVsDoneChart({ rows, dumDate, week }: { rows: JourneyRow[]; dumDate: string; week: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const [hover, setHover] = useState<number | null>(null);
  const timed = rows.filter(r => !r.item.anytime);
  const total = Math.max(1, timed.length);
  const now = Math.min(W_TO, Math.max(W_FROM, week));
  const doneAt = new Map(timed.filter(r => r.status === 'feito').map(r => [r.item.id, r.doneOn ? weekOf(dumDate, r.doneOn) : week]));
  const plannedAt = new Map(timed.filter(r => r.status === 'agendado' && r.appointment).map(r => [r.item.id, weekOf(dumDate, toISODate(parseTimestamp(r.appointment!.scheduled_at)))]));
  const weeks = Array.from({ length: W_TO - W_FROM + 1 }, (_, i) => W_FROM + i);
  const expected = weeks.map(w => timed.filter(r => r.item.from <= w).length);
  const done = weeks.map(w => [...doneAt.values()].filter(d => d <= w).length);
  const scheduled = weeks.map((w, i) => done[i] + [...plannedAt.values()].filter(d => d <= w).length);

  const H = 150, padL = 22, padR = 8, padT = 10, padB = 20;
  const x = (w: number) => padL + ((w - W_FROM) / (W_TO - W_FROM)) * (width - padL - padR);
  const y = (v: number) => H - padB - (v / total) * (H - padT - padB);
  const step = (vals: number[], from = W_FROM, to = W_TO) =>
    weeks
      .map((w, i) => ({ w, v: vals[i], i }))
      .filter(p => p.w >= from && p.w <= to)
      .map((p, k) => `${k ? `L${x(p.w)},${y(vals[p.i - 1])} L` : 'M'}${x(p.w)},${y(p.v)}`)
      .join(' ');
  const at = (w: number) => w - W_FROM;
  const active = hover ?? now;
  const hasScheduled = plannedAt.size > 0;

  return (
    <div className="space-y-2">
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Planejado e realizado por semana. Semana ${now}: ${expected[at(now)]} itens já deviam ter começado, ${done[at(now)]} feitos.`}
          onPointerMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const w = Math.round(W_FROM + ((e.clientX - rect.left - padL) / (width - padL - padR)) * (W_TO - W_FROM));
            setHover(Math.min(W_TO, Math.max(W_FROM, w)));
          }}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y"
        >
          {[0, Math.round(total / 2), total].map(t => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--c-grid)' }} />
              <text x={padL - 5} y={y(t) + 3.5} textAnchor="end" fontSize={10} className="tabular" style={{ fill: 'var(--c-ink-mute)' }}>{t}</text>
            </g>
          ))}
          {[14, 28, 37].map(w => (
            <line key={w} x1={x(w)} x2={x(w)} y1={padT} y2={H - padB} strokeDasharray="2 3" style={{ stroke: 'var(--c-grid)' }} />
          ))}
          {[['1º tri', 4], ['2º tri', 14], ['3º tri', 28], ['termo', 37]].map(([label, w]) => (
            <text key={label} x={x(Number(w)) + 3} y={H - 6} fontSize={10} style={{ fill: 'var(--c-ink-mute)' }}>{label}</text>
          ))}
          <path d={step(expected)} fill="none" strokeWidth={2} strokeDasharray="5 4" style={{ stroke: 'var(--c-ink-mute)' }} />
          {hasScheduled && <path d={step(scheduled, now)} fill="none" strokeWidth={2} strokeDasharray="2 3" style={{ stroke: 'var(--c-brand)' }} />}
          <path d={step(done, W_FROM, now)} fill="none" strokeWidth={2.5} strokeLinejoin="round" style={{ stroke: 'var(--c-ok)' }} />
          <line x1={x(now)} x2={x(now)} y1={padT} y2={H - padB} style={{ stroke: 'var(--c-ink)' }} />
          <circle cx={x(now)} cy={y(done[at(now)])} r={4.5} strokeWidth={2} style={{ fill: 'var(--c-ok)', stroke: 'var(--c-surface)' }} />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} strokeWidth={1} style={{ stroke: 'var(--c-ink-mute)' }} />}
        </svg>
      </div>
      <p className="text-[12px] text-ink-soft tabular" aria-live="polite">
        <strong className="text-ink">Semana {active}{active === now ? ' (hoje)' : ''}:</strong> {expected[at(active)]} já deviam ter começado · {active <= now ? `${done[at(active)]} ${done[at(active)] === 1 ? 'feito' : 'feitos'}` : `${scheduled[at(active)]} feitos ou agendados`}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-ink-mute" /> planejado</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-[2.5px] rounded bg-ok" /> feito</span>
        {hasScheduled && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dotted border-brand" /> agendado</span>}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-px h-3 bg-ink" /> hoje</span>
      </div>
    </div>
  );
}
