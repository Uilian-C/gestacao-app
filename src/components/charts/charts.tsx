import { useState, type ReactNode } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { TimeOfDay } from '../../types';
import { TIME_OF_DAY } from '../../lib/symptoms';

// Regras de desenho (iguais em todos os gráficos): linhas de 2px, marcadores
// de raio 4 com anel da cor da superfície, grade fina e discreta, texto nas
// cores de texto e nunca na cor da série, dica ao passar o dedo/mouse.

const C = {
  grid: 'var(--c-grid)',
  surface: 'var(--c-surface)',
  ink: 'var(--c-ink)',
  inkSoft: 'var(--c-ink-soft)',
  inkMute: 'var(--c-ink-mute)',
  alert: 'var(--c-alert)',
  brand: 'var(--c-brand)',
  brandSoft: 'var(--c-brand-soft)',
  series1: 'var(--c-series-1)',
  series2: 'var(--c-series-2)',
  int: (n: number) => `var(--c-int-${Math.min(5, Math.max(1, Math.round(n)))})`,
};

const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
const fmt = (n: number, digits = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits });

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const boxWidth = 180;
  const left = Math.min(Math.max(0, x - boxWidth / 2), Math.max(0, width - boxWidth));
  return (
    <div className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink shadow-md" style={{ left, top: Math.max(0, y - 8), width: boxWidth, transform: 'translateY(-100%)' }}>
      {children}
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      {swatch}
      {label}
    </span>
  );
}

const Dot = ({ color }: { color: string }) => <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />;
const Line = ({ color }: { color: string }) => <span className="inline-block w-4 h-0.5 rounded" style={{ background: color }} />;

/* ---------- Intensidade de um sintoma ao longo das semanas ---------- */

export function SymptomTrendChart({ byWeek, entries, weekFrom, weekTo }: { byWeek: Array<{ week: number; avg: number; max: number; count: number }>; entries: Array<{ week: number; intensity: number }>; weekFrom: number; weekTo: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 190, padL = 30, padR = 26, padT = 14, padB = 30;
  const x = scale(weekFrom, Math.max(weekTo, weekFrom + 1), padL, width - padR);
  const y = scale(1, 5, H - padB, padT);
  const path = byWeek.map((w, i) => `${i ? 'L' : 'M'}${x(w.week)},${y(w.avg)}`).join(' ');
  const xTicks = niceTicks(weekFrom, Math.max(weekTo, weekFrom + 1), Math.max(2, Math.floor(width / 70))).filter(t => Number.isInteger(t));
  const active = hover !== null ? byWeek[hover] : null;

  const onMove = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    let best = 0;
    byWeek.forEach((w, i) => {
      if (Math.abs(x(w.week) - px) < Math.abs(x(byWeek[best].week) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4">
        <LegendItem swatch={<Dot color={C.int(2)} />} label="cada registro" />
        <LegendItem swatch={<Line color={C.int(4)} />} label="média da semana" />
      </div>
      <div ref={ref} className="relative">
        <svg width={width} height={H} role="img" aria-label="Intensidade do sintoma por semana" onPointerMove={e => onMove(e.clientX, e.currentTarget.getBoundingClientRect())} onPointerLeave={() => setHover(null)}>
          {[1, 2, 3, 4, 5].map(t => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} style={{ stroke: C.grid }} strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} style={{ fill: C.inkMute }}>{t}</text>
            </g>
          ))}
          {xTicks.map(t => (
            <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize={11} style={{ fill: C.inkMute }}>sem {t}</text>
          ))}
          {active && <line x1={x(active.week)} x2={x(active.week)} y1={padT} y2={H - padB} style={{ stroke: C.inkMute }} strokeWidth={1} />}
          {entries.map((e, i) => (
            <circle key={i} cx={x(e.week)} cy={y(e.intensity)} r={4} style={{ fill: C.int(2), stroke: C.surface }} strokeWidth={2} />
          ))}
          <path d={path} fill="none" style={{ stroke: C.int(4) }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {byWeek.map((w, i) => (
            <circle key={w.week} cx={x(w.week)} cy={y(w.avg)} r={hover === i ? 6 : 4} style={{ fill: C.int(4), stroke: C.surface }} strokeWidth={2} />
          ))}
        </svg>
        {active && (
          <Tooltip x={x(active.week)} y={y(active.avg)} width={width}>
            <p className="font-bold">Semana {active.week}</p>
            <p className="text-ink-soft tabular">{active.count} {active.count === 1 ? 'registro' : 'registros'} · média {fmt(active.avg)} · máx. {active.max}</p>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ---------- Linha pequena para listas ---------- */

export function Sparkline({ values }: { values: number[] }) {
  const W = 88, H = 28, pad = 4;
  if (values.length === 0) return null;
  const x = scale(0, Math.max(1, values.length - 1), pad, W - pad);
  const y = scale(1, 5, H - pad, pad);
  const last = values[values.length - 1];
  return (
    <svg width={W} height={H} aria-hidden className="shrink-0">
      {values.length > 1 && <path d={values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" style={{ stroke: C.inkMute }} strokeWidth={1.5} strokeLinejoin="round" />}
      <circle cx={x(values.length - 1)} cy={y(last)} r={3.5} style={{ fill: C.int(last), stroke: C.surface }} strokeWidth={1.5} />
    </svg>
  );
}

/* ---------- Mapa de calor: categoria × semana ---------- */

export function CategoryHeatmap({ cells, categories, weekFrom, weekTo }: { cells: Map<string, { avg: number; count: number }>; categories: readonly string[]; weekFrom: number; weekTo: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ cat: string; week: number } | null>(null);
  const labelW = 84, gap = 2, rowH = 26, top = 4, bottom = 22;
  const weeks = Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => weekFrom + i);
  const cellW = Math.max(4, (width - labelW - gap * weeks.length) / weeks.length);
  const H = top + categories.length * (rowH + gap) + bottom;
  const labelEvery = Math.ceil(28 / (cellW + gap));
  const active = hover ? cells.get(`${hover.cat}|${hover.week}`) : undefined;

  return (
    <div className="space-y-2">
      <div ref={ref} className="relative">
        <svg width={width} height={H} role="img" aria-label="Intensidade média por categoria e semana" onPointerLeave={() => setHover(null)}>
          {categories.map((cat, r) => (
            <g key={cat}>
              <text x={0} y={top + r * (rowH + gap) + rowH / 2 + 4} fontSize={12} style={{ fill: C.inkSoft }}>{cat}</text>
              {weeks.map((week, c) => {
                const cell = cells.get(`${cat}|${week}`);
                const isHover = hover?.cat === cat && hover.week === week;
                return (
                  <rect
                    key={week}
                    x={labelW + c * (cellW + gap)}
                    y={top + r * (rowH + gap)}
                    width={cellW}
                    height={rowH}
                    rx={Math.min(4, cellW / 3)}
                    style={{ fill: cell ? C.int(cell.avg) : 'var(--c-surface-2)', stroke: isHover ? C.ink : 'none' }}
                    strokeWidth={1.5}
                    onPointerEnter={() => setHover({ cat, week })}
                  />
                );
              })}
            </g>
          ))}
          {weeks.map((week, c) =>
            c % labelEvery === 0 ? (
              <text key={week} x={labelW + c * (cellW + gap) + cellW / 2} y={H - 6} textAnchor="middle" fontSize={11} style={{ fill: C.inkMute }}>{week}</text>
            ) : null,
          )}
        </svg>
        {hover && (
          <Tooltip x={labelW + weeks.indexOf(hover.week) * (cellW + gap) + cellW / 2} y={top + categories.indexOf(hover.cat) * (rowH + gap)} width={width}>
            <p className="font-bold">{hover.cat} · semana {hover.week}</p>
            <p className="text-ink-soft tabular">{active ? `${active.count} ${active.count === 1 ? 'registro' : 'registros'} · média ${fmt(active.avg)}` : 'Sem registros'}</p>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-mute">
        <span>Intensidade:</span>
        <span>leve</span>
        {[1, 2, 3, 4, 5].map(n => <span key={n} className="w-5 h-3 rounded-sm" style={{ background: C.int(n) }} />)}
        <span>forte</span>
        <span className="ml-2 inline-flex items-center gap-1"><span className="w-5 h-3 rounded-sm bg-surface-2 border border-line" /> sem registro</span>
      </div>
    </div>
  );
}

/* ---------- Peso: ganho acumulado e faixa recomendada ---------- */

export interface WeightPoint {
  week: number;
  value: number;
  date: string;
  kg: number;
}

export function WeightChart({ points, band, mode }: { points: WeightPoint[]; band: Array<{ week: number; min: number; max: number }> | null; mode: 'ganho' | 'peso' }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 210, padL = 40, padR = 26, padT = 14, padB = 30;
  const weeks = [...points.map(p => p.week), ...(band?.map(b => b.week) ?? [])];
  const values = [...points.map(p => p.value), ...(band?.flatMap(b => [b.min, b.max]) ?? [])];
  const wMin = Math.min(...weeks), wMax = Math.max(...weeks, wMin + 1);
  const vMin = Math.floor(Math.min(...values) - 0.5), vMax = Math.ceil(Math.max(...values) + 0.5);
  const x = scale(wMin, wMax, padL, width - padR);
  const y = scale(vMin, vMax, H - padB, padT);
  const yTicks = niceTicks(vMin, vMax, 4);
  const xTicks = niceTicks(wMin, wMax, Math.max(2, Math.floor(width / 70))).filter(t => Number.isInteger(t));
  const active = hover !== null ? points[hover] : null;
  const unit = mode === 'ganho' ? 'kg ganhos' : 'kg';

  const bandPath = band && band.length > 1
    ? `M${band.map(b => `${x(b.week)},${y(b.max)}`).join(' L')} L${[...band].reverse().map(b => `${x(b.week)},${y(b.min)}`).join(' L')} Z`
    : null;

  const onMove = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.week) - px) < Math.abs(x(points[best].week) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="space-y-2">
      {bandPath && (
        <div className="flex flex-wrap gap-4">
          <LegendItem swatch={<Line color={C.brand} />} label={mode === 'ganho' ? 'ganho de peso' : 'peso'} />
          <LegendItem swatch={<span className="inline-block w-4 h-3 rounded-sm" style={{ background: C.brandSoft, outline: `1px solid ${C.brand}` }} />} label="faixa recomendada" />
        </div>
      )}
      <div ref={ref} className="relative">
        <svg width={width} height={H} role="img" aria-label={mode === 'ganho' ? 'Ganho de peso por semana e faixa recomendada' : 'Peso por semana'} onPointerMove={e => onMove(e.clientX, e.currentTarget.getBoundingClientRect())} onPointerLeave={() => setHover(null)}>
          {yTicks.map(t => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} style={{ stroke: C.grid }} strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} style={{ fill: C.inkMute }} className="tabular">{fmt(t)}</text>
            </g>
          ))}
          {xTicks.map(t => (
            <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize={11} style={{ fill: C.inkMute }}>sem {t}</text>
          ))}
          {bandPath && <path d={bandPath} style={{ fill: C.brand, fillOpacity: 0.12 }} />}
          {active && <line x1={x(active.week)} x2={x(active.week)} y1={padT} y2={H - padB} style={{ stroke: C.inkMute }} strokeWidth={1} />}
          {points.length > 1 && <path d={points.map((p, i) => `${i ? 'L' : 'M'}${x(p.week)},${y(p.value)}`).join(' ')} fill="none" style={{ stroke: C.brand }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {points.map((p, i) => (
            <circle key={i} cx={x(p.week)} cy={y(p.value)} r={hover === i ? 6 : 4} style={{ fill: C.brand, stroke: C.surface }} strokeWidth={2} />
          ))}
          <text x={padL - 8} y={10} textAnchor="end" fontSize={10} style={{ fill: C.inkMute }}>kg</text>
        </svg>
        {active && (
          <Tooltip x={x(active.week)} y={y(active.value)} width={width}>
            <p className="font-bold">Semana {active.week}</p>
            <p className="text-ink-soft tabular">
              {fmt(active.kg)} kg{mode === 'ganho' ? ` · ${active.value >= 0 ? '+' : ''}${fmt(active.value)} ${unit}` : ''}
            </p>
            {band && (() => {
              const b = band.find(r => r.week === active.week);
              return b ? <p className="text-ink-mute tabular">Faixa: {fmt(b.min)} a {fmt(b.max)} kg</p> : null;
            })()}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ---------- Pressão arterial com a linha de 140/90 ---------- */

export interface PressurePoint {
  label: string;
  date: string;
  systolic: number;
  diastolic: number;
}

export function BloodPressureChart({ points }: { points: PressurePoint[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 220, padL = 40, padR = 52, padT = 14, padB = 30;
  const values = points.flatMap(p => [p.systolic, p.diastolic]);
  const vMin = Math.min(50, ...values) - 5, vMax = Math.max(150, ...values) + 5;
  const x = scale(0, Math.max(1, points.length - 1), padL, width - padR);
  const y = scale(vMin, vMax, H - padB, padT);
  const yTicks = niceTicks(vMin, vMax, 4);
  const active = hover !== null ? points[hover] : null;
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(width / 64)));

  const series = [
    { key: 'systolic' as const, label: 'Máxima (sistólica)', color: C.series1, limit: 140 },
    { key: 'diastolic' as const, label: 'Mínima (diastólica)', color: C.series2, limit: 90 },
  ];

  const onMove = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const idx = Math.round(((px - padL) / (width - padL - padR)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, idx)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4">
        {series.map(s => <LegendItem key={s.key} swatch={<Line color={s.color} />} label={s.label} />)}
        <LegendItem swatch={<Line color={C.alert} />} label="limite de atenção (140/90)" />
      </div>
      <div ref={ref} className="relative">
        <svg width={width} height={H} role="img" aria-label="Pressão arterial máxima e mínima por medição" onPointerMove={e => onMove(e.clientX, e.currentTarget.getBoundingClientRect())} onPointerLeave={() => setHover(null)}>
          {yTicks.map(t => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} style={{ stroke: C.grid }} strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} style={{ fill: C.inkMute }}>{t}</text>
            </g>
          ))}
          {series.map(s => (
            <g key={`lim-${s.key}`}>
              <line x1={padL} x2={width - padR} y1={y(s.limit)} y2={y(s.limit)} style={{ stroke: C.alert }} strokeWidth={1} />
              <text x={width - padR + 6} y={y(s.limit) + 4} fontSize={11} style={{ fill: C.inkSoft }}>{s.limit}</text>
            </g>
          ))}
          {points.map((p, i) => (i % labelEvery === 0 ? <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} style={{ fill: C.inkMute }}>{p.label}</text> : null))}
          {active && <line x1={x(hover!)} x2={x(hover!)} y1={padT} y2={H - padB} style={{ stroke: C.inkMute }} strokeWidth={1} />}
          {series.map(s => (
            <g key={s.key}>
              {points.length > 1 && <path d={points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[s.key])}`).join(' ')} fill="none" style={{ stroke: s.color }} strokeWidth={2} strokeLinejoin="round" />}
              {points.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p[s.key])} r={hover === i ? 6 : 4} style={{ fill: s.color, stroke: C.surface }} strokeWidth={2} />
              ))}
            </g>
          ))}
        </svg>
        {active && (
          <Tooltip x={x(hover!)} y={y(active.systolic)} width={width}>
            <p className="font-bold">{active.date}</p>
            <p className="text-ink-soft tabular">{active.systolic}/{active.diastolic} mmHg{active.systolic >= 140 || active.diastolic >= 90 ? ' · acima de 140/90' : ''}</p>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ---------- Em que período do dia ---------- */

export function TimeOfDayBars({ counts }: { counts: Record<TimeOfDay, number> }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="space-y-1.5">
      {TIME_OF_DAY.map(t => (
        <div key={t.id} className="flex items-center gap-3 text-sm">
          <span className="w-20 text-ink-soft">{t.label}</span>
          <div className="flex-1 h-3">
            {counts[t.id] > 0 && <div className="h-3 rounded-r" style={{ width: `${(counts[t.id] / max) * 100}%`, background: C.int(3) }} />}
          </div>
          <span className="w-6 text-right tabular text-ink-soft">{counts[t.id]}</span>
        </div>
      ))}
    </div>
  );
}
