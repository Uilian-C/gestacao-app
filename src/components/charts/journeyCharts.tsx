import { useState } from 'react';
import { AlertCircle, CalendarHeart, Check } from 'lucide-react';
import { PHASES, type PlanItem } from '../../content/prenatalPlan';
import { useElementWidth } from '../../hooks/useElementWidth';
import { itemStatus, windowText, type ItemStatus, type Visit } from '../../lib/journey';
import { DoneToggle, StatusPill } from '../journey/Journey';
import { KIND_ICON } from '../journey/kindIcon';

const W_FROM = 4;
const W_TO = 42;
const pct = (w: number) => ((Math.min(W_TO, Math.max(W_FROM, w)) - W_FROM) / (W_TO - W_FROM)) * 100;

/* ---------- Previsto x feito, acumulado por semana ---------- */

export function PlanProgressChart({ items, doneWeeks, currentWeek }: { items: PlanItem[]; doneWeeks: Map<string, number>; currentWeek: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 190, padL = 28, padR = 12, padT = 14, padB = 28;
  const timed = items.filter(i => !i.anytime);
  const total = timed.length;
  const weeks = Array.from({ length: W_TO - W_FROM + 1 }, (_, i) => W_FROM + i);
  // Previsto: itens cuja janela já fechou. Feito: itens marcados até aquela semana.
  const planned = weeks.map(w => timed.filter(i => i.to < w).length);
  const done = weeks.map(w => timed.filter(i => (doneWeeks.get(i.id) ?? Infinity) <= w).length);
  const x = (w: number) => padL + ((w - W_FROM) / (W_TO - W_FROM)) * (width - padL - padR);
  const y = (v: number) => H - padB - (v / Math.max(1, total)) * (H - padT - padB);
  const step = (vals: number[], upTo = W_TO) =>
    weeks
      .filter(w => w <= upTo)
      .map((w, i) => `${i ? `L${x(w)},${y(vals[i - 1])} L` : 'M'}${x(w)},${y(vals[i])}`)
      .join(' ');
  const now = Math.min(W_TO, Math.max(W_FROM, currentWeek));
  const yTicks = [0, Math.round(total / 2), total];
  const active = hover !== null ? hover : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-ink-mute" /> previsto até a semana</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 rounded bg-brand" /> feito</span>
      </div>
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Exames, vacinas e preparos previstos e feitos por semana. Semana ${currentWeek}: ${planned[now - W_FROM]} previstos, ${done[now - W_FROM]} feitos.`}
          onPointerMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const w = Math.round(W_FROM + ((e.clientX - rect.left - padL) / (width - padL - padR)) * (W_TO - W_FROM));
            setHover(Math.min(now, Math.max(W_FROM, w)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          {yTicks.map(t => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--c-grid)' }} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--c-ink-mute)' }} className="tabular">{t}</text>
            </g>
          ))}
          {PHASES.map(p => (
            <text key={p.id} x={x(p.from)} y={H - 10} fontSize={11} style={{ fill: 'var(--c-ink-mute)' }}>sem {p.from}</text>
          ))}
          <path d={step(planned)} fill="none" strokeWidth={2} strokeDasharray="4 4" style={{ stroke: 'var(--c-ink-mute)' }} />
          <path d={step(done, now)} fill="none" strokeWidth={2} strokeLinejoin="round" style={{ stroke: 'var(--c-brand)' }} />
          <line x1={x(now)} x2={x(now)} y1={padT - 4} y2={H - padB} strokeWidth={1} style={{ stroke: 'var(--c-ink-soft)' }} />
          <text x={x(now)} y={padT - 6} textAnchor="middle" fontSize={10} style={{ fill: 'var(--c-ink-soft)' }}>hoje</text>
          <circle cx={x(now)} cy={y(done[now - W_FROM])} r={4} strokeWidth={2} style={{ fill: 'var(--c-brand)', stroke: 'var(--c-surface)' }} />
          {active !== null && (
            <>
              <line x1={x(active)} x2={x(active)} y1={padT} y2={H - padB} style={{ stroke: 'var(--c-ink-mute)' }} />
              <circle cx={x(active)} cy={y(done[active - W_FROM])} r={5} strokeWidth={2} style={{ fill: 'var(--c-brand)', stroke: 'var(--c-surface)' }} />
            </>
          )}
        </svg>
        {active !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink shadow-md"
            style={{ left: Math.min(Math.max(0, x(active) - 80), width - 160), top: 0, width: 160 }}
          >
            <p className="font-semibold">Semana {active}</p>
            <p className="text-ink-soft tabular">Previsto: {planned[active - W_FROM]} de {total}</p>
            <p className="text-ink-soft tabular">Feito: {done[active - W_FROM]}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Jornada planejada: cada item na sua janela de semanas ---------- */

// A situação nunca depende só da cor: cada uma tem também forma própria
// (apagada, listrada, cheia e mais grossa, só contorno) e ícone na linha.
const BAR: Record<ItemStatus, React.CSSProperties> = {
  feito: { background: 'var(--c-ok)', opacity: 0.45, height: 8 },
  pendente: { background: 'repeating-linear-gradient(135deg, var(--c-warn) 0 3px, transparent 3px 5px)', boxShadow: 'inset 0 0 0 1.5px var(--c-warn)', height: 10 },
  agora: { background: 'var(--c-brand)', height: 12 },
  'em-breve': { boxShadow: 'inset 0 0 0 1.5px var(--c-ink-mute)', height: 10 },
  depois: { boxShadow: 'inset 0 0 0 1.5px var(--c-line)', height: 10 },
};

const LEGEND: Record<ItemStatus, string> = { agora: 'janela aberta', pendente: 'pendente', feito: 'feito', 'em-breve': 'próximas semanas', depois: 'mais adiante' };

export function JourneyTimeline({ items, currentWeek, done, dumDate, busy, onToggle, visits, plannedVisits, autoDoneIds }: { items: PlanItem[]; currentWeek: number; done: Set<string>; dumDate: string; busy: boolean; onToggle: (item: PlanItem, done: boolean) => void; visits: Visit[]; plannedVisits: number[]; autoDoneIds: Set<string> }) {
  const [open, setOpen] = useState<string | null>(null);
  const timed = items.filter(i => !i.anytime).sort((a, b) => a.from - b.from || a.to - b.to);
  const now = pct(currentWeek + 0.5);

  return (
    <div>
      {/* Faixa das fases, alinhada às barras */}
      <div className="grid grid-cols-[minmax(0,36%)_minmax(0,1fr)] gap-3 mb-1">
        <span />
        <div className="relative h-5 text-[10px] text-ink-mute">
          {PHASES.map(p => (
            <span key={p.id} className="absolute top-0 truncate" style={{ left: `${pct(p.from)}%`, width: `${pct(p.to + 1) - pct(p.from)}%` }}>
              {p.from}
            </span>
          ))}
        </div>
      </div>
      <ul className="relative">
        <VisitsRow visits={visits} planned={plannedVisits} currentWeek={currentWeek} now={now} open={open === 'consultas'} onToggle={() => setOpen(open === 'consultas' ? null : 'consultas')} />
        {timed.map(item => {
          const status = itemStatus(item, currentWeek, done.has(item.id));
          const Icon = KIND_ICON[item.kind];
          const isOpen = open === item.id;
          return (
            <li key={item.id} className="border-t border-line first:border-t-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                className="w-full grid grid-cols-[minmax(0,36%)_minmax(0,1fr)] gap-3 items-center py-2 text-left"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {status === 'feito' ? <Check className="w-3.5 h-3.5 text-ok shrink-0" /> : status === 'pendente' ? <AlertCircle className="w-3.5 h-3.5 text-warn shrink-0" /> : <Icon className="w-3.5 h-3.5 text-ink-mute shrink-0" />}
                  <span className={`text-xs leading-tight truncate ${status === 'feito' ? 'text-ink-mute line-through decoration-ink-mute/50' : 'text-ink'}`}>{item.short}</span>
                </span>
                <span className="relative h-5 block">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
                  <span
                    className="absolute top-1/2 -translate-y-1/2 rounded"
                    style={{ left: `${pct(item.from)}%`, width: `max(6px, ${pct(item.to + 1) - pct(item.from)}%)`, ...BAR[status] }}
                  />
                  <span className="absolute inset-y-[-8px] w-px bg-ink-soft" style={{ left: `${now}%` }} aria-hidden />
                </span>
              </button>
              {isOpen && (
                <div className="pb-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-ink-mute flex flex-wrap items-center gap-1.5">
                      <StatusPill status={status} /> {windowText(item, status, dumDate)}
                    </p>
                    <p className="text-sm text-ink-soft">{item.why}</p>
                    {autoDoneIds.has(item.id) && <p className="text-xs text-ok">Marcado automaticamente pela consulta registrada no app.</p>}
                  </div>
                  <DoneToggle done={status === 'feito'} label={item.title} busy={busy} onToggle={() => onToggle(item, status !== 'feito')} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
        {(['agora', 'pendente', 'feito', 'em-breve'] as const).map(st => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span className="w-4 rounded-sm inline-block" style={BAR[st]} /> {LEGEND[st]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="w-px h-3 bg-ink-soft" /> hoje (sem. {currentWeek})</span>
      </div>
    </div>
  );
}

/** Linha das consultas: o ritmo recomendado (traços) e as consultas do casal (pontos). */
function VisitsRow({ visits, planned, currentWeek, now, open, onToggle }: { visits: Visit[]; planned: number[]; currentWeek: number; now: number; open: boolean; onToggle: () => void }) {
  const done = visits.filter(v => !v.future);
  const next = visits.find(v => v.future);
  const expectedByNow = planned.filter(w => w <= currentWeek).length;
  const cadence = currentWeek < 28 ? 'mensal' : currentWeek < 36 ? 'a cada 15 dias' : 'semanal';
  return (
    <li className="border-b border-line">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full grid grid-cols-[minmax(0,36%)_minmax(0,1fr)] gap-3 items-center py-2 text-left">
        <span className="flex items-center gap-1.5 min-w-0">
          <CalendarHeart className="w-3.5 h-3.5 text-brand shrink-0" />
          <span className="text-xs font-semibold text-ink truncate">Consultas</span>
        </span>
        <span className="relative h-5 block" aria-label={`${done.length} consultas feitas, ${expectedByNow} previstas até agora`}>
          <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
          {planned.map(w => (
            <span key={`p${w}`} className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-ink-mute/60" style={{ left: `${pct(w + 0.5)}%` }} aria-hidden />
          ))}
          {visits.map(v => (
            <span
              key={v.id}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${v.future ? 'bg-surface ring-2 ring-brand' : 'bg-brand ring-2 ring-surface'}`}
              style={{ left: `${pct(v.week + 0.5)}%` }}
              aria-hidden
            />
          ))}
          <span className="absolute inset-y-[-8px] w-px bg-ink-soft" style={{ left: `${now}%` }} aria-hidden />
        </span>
      </button>
      {open && (
        <div className="pb-3 space-y-1.5 text-sm text-ink-soft">
          <p>
            <strong className="text-ink">{done.length}</strong> realizada{done.length === 1 ? '' : 's'} · <strong className="text-ink">{expectedByNow}</strong> previstas até a semana {currentWeek} · ritmo agora: {cadence}.
          </p>
          {next && <p>Próxima: {next.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, semana {next.week}.</p>}
          <p className="text-xs text-ink-mute">Traços: ritmo recomendado. Pontos cheios: consultas feitas; vazados: agendadas. Agende em Consultas.</p>
        </div>
      )}
    </li>
  );
}
