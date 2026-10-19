import { useState } from 'react';
import { AlertCircle, CalendarCheck2, CalendarClock, CalendarPlus, Check, ChevronDown, EyeOff, FileImage, ListChecks, Route, SlidersHorizontal, Undo2 } from 'lucide-react';
import { PHASES } from '../../content/prenatalPlan';
import { dateOfWeek, phaseOf, plannedVisitWeeks, visitsOf } from '../../lib/journey';
import { appointmentKindFor, journeySummary, type JourneyRow, type JourneyStatus } from '../../lib/journeyPlan';
import { hasResult } from '../../lib/appointments';
import { parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';
import type { ListItem } from '../../hooks/useGestationData';
import type { Consultation } from '../../types';
import { JourneyTimeline, PlanProgressChart } from '../charts/journeyCharts';
import { AddItem, HiddenItems, RowMenu } from '../EditableList';
import { KIND_ICON } from '../journey/kindIcon';
import { PhaseGuide, PhaseStrip } from '../journey/Journey';
import { inputClass } from '../styles';
import { Button, Segmented } from '../ui';
import { ScheduleForm, type NewConsultation } from './ConsultationsTab';

// Agenda → Jornada: o planejado do pré-natal (a janela de cada consulta,
// exame e vacina, que o casal pode ajustar) ao lado do realizado (agendado,
// feito, resultado guardado). Agendar daqui já liga o agendamento ao item.

interface Props {
  rows: JourneyRow[];
  dumDate: string;
  currentWeek: number;
  /** Só as consultas (o ritmo de consultas do pré-natal). */
  consultations: Consultation[];
  hidden: Array<{ id: string; label: string }>;
  busy: boolean;
  checksAvailable: boolean;
  listsAvailable: boolean;
  /** A migração 019 já rodou: dá para ajustar as semanas. */
  weeksAvailable: boolean;
  onToggle: (id: string, done: boolean) => void;
  onSchedule: (c: NewConsultation) => Promise<boolean>;
  onOpenAppointment: (c: Consultation) => void;
  onOpenExam: (id: string) => void;
  onResult: (c: Consultation) => void;
  onSetWeeks: (id: string, from: number | null, to: number | null) => Promise<boolean>;
  onHide: (id: string, hidden: boolean) => void;
  onAddStep: (title: string, week: number | null) => Promise<boolean>;
  onRenameItem: (item: ListItem, title: string) => Promise<boolean>;
  onDeleteItem: (item: ListItem) => void;
}

const short = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const shortIso = (iso: string) => short(parseLocalDate(iso));

/** "sem. 24–28 · 30/10 a 03/12" */
function plannedText(row: JourneyRow, dumDate: string) {
  const { item } = row;
  if (item.anytime) return 'Em qualquer fase';
  const end = dateOfWeek(dumDate, item.to + 1);
  end.setDate(end.getDate() - 1);
  const weeks = item.from === item.to ? `sem. ${item.from}` : `sem. ${item.from}–${item.to}`;
  return `${weeks} · ${short(dateOfWeek(dumDate, item.from))} a ${short(end)}`;
}

function realizedText(row: JourneyRow, week: number): string {
  const at = row.appointment ? parseTimestamp(row.appointment.scheduled_at) : null;
  switch (row.status) {
    case 'feito':
      return `Feito${row.doneOn ? ` em ${shortIso(row.doneOn)}` : ''}${row.exam ? ' · resultado guardado' : ''}`;
    case 'agendado':
      return `Agendado: ${at!.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} às ${at!.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    case 'atrasado':
      return 'A janela passou sem data';
    case 'agora':
      return row.item.anytime ? 'Sem data' : 'Janela aberta · sem data';
    case 'em-breve': {
      const n = row.item.from - week;
      return n <= 1 ? 'Abre na próxima semana' : `Abre em ${n} semanas`;
    }
    default:
      return 'Mais adiante';
  }
}

const STATUS: Record<JourneyStatus, { label: string; pill: string; icon: string }> = {
  feito: { label: 'feito', pill: 'bg-ok-soft text-ok', icon: 'bg-ok text-on-accent' },
  agendado: { label: 'agendado', pill: 'bg-brand-soft text-brand-strong', icon: 'bg-brand-soft text-brand-strong' },
  atrasado: { label: 'atrasado', pill: 'bg-warn-soft text-warn', icon: 'bg-warn-soft text-warn' },
  agora: { label: 'sem data', pill: 'bg-surface-2 text-ink', icon: 'bg-surface-2 text-ink' },
  'em-breve': { label: 'em breve', pill: 'bg-surface-2 text-ink-soft', icon: 'bg-surface-2 text-ink-mute' },
  depois: { label: 'depois', pill: 'bg-surface-2 text-ink-mute', icon: 'bg-surface-2 text-ink-mute' },
};

export default function JourneyTab(props: Props) {
  const { rows, dumDate, currentWeek } = props;
  const [view, setView] = useState<'lista' | 'linha'>('lista');
  const now = new Date();
  const summary = journeySummary(rows, currentWeek);
  const phase = phaseOf(currentWeek);
  const visits = visitsOf(props.consultations, dumDate, now);
  const planned = plannedVisitWeeks(visits.find(v => v.specialty === 'obstetra')?.week ?? 8);
  const nextVisit = visits.find(v => v.future);
  const timed = rows.filter(r => !r.item.anytime);
  const anytime = rows.filter(r => r.item.anytime);

  return (
    <div className="max-w-[640px] mx-auto space-y-4">
      <section aria-label="Planejado e realizado" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <Route className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[1.2rem] leading-tight text-ink">Jornada do pré-natal</h2>
            <p className="text-xs text-ink-mute">
              {phase.label} · {phase.title} · semana {currentWeek}
            </p>
          </div>
        </div>
        <PhaseStrip week={currentWeek} />
        <dl className="grid grid-cols-4 gap-1.5 text-center">
          <Stat label="feitos" value={`${summary.done}/${summary.dueByNow}`} hint="do previsto" />
          <Stat label="agendados" value={String(summary.scheduled)} />
          <Stat label="sem data" value={String(summary.open)} hint="janela aberta" />
          <Stat label="atrasados" value={String(summary.late)} tone={summary.late ? 'warn' : undefined} />
        </dl>
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">Consultas:</strong> {visits.filter(v => !v.future).length} de {planned.filter(w => w <= currentWeek).length} previstas até agora
          {nextVisit ? ` · próxima ${short(nextVisit.date)}` : ' · nenhuma marcada'}.
        </p>
        <Segmented
          label="Ver a jornada como"
          full
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'lista', label: 'Planejado × realizado' },
            { value: 'linha', label: 'Linha do tempo' },
          ]}
        />
      </section>

      {!props.checksAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2">Para marcar itens como feitos, rode a migração 007 no Neon.</p>}

      {view === 'lista' ? (
        <>
          {PHASES.map(p => {
            const list = timed.filter(r => phaseOf(r.item.from).id === p.id);
            if (list.length === 0) return null;
            const isNow = p.id === phase.id;
            return (
              <section key={p.id} aria-label={`${p.label}: ${p.title}`} className={`rounded-[26px] bg-surface shadow-soft p-4 ${currentWeek > p.to ? 'opacity-95' : ''}`}>
                <h3 className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[1.05rem] text-ink">
                    {p.label} · {p.title}
                  </span>
                  <span className={`text-[11px] font-bold ${isNow ? 'text-brand-strong' : 'text-ink-mute'}`}>{isNow ? 'agora' : `sem. ${p.from}–${p.to}`}</span>
                </h3>
                <PlanList {...props} rows={list} />
              </section>
            );
          })}
          {anytime.length > 0 && (
            <section aria-label="Em qualquer fase" className="rounded-[26px] bg-surface shadow-soft p-4">
              <h3 className="text-[1.05rem] text-ink mb-1">Em qualquer fase</h3>
              <PlanList {...props} rows={anytime} />
            </section>
          )}
        </>
      ) : (
        <section aria-label="Linha do tempo" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-5">
          <PlanProgressChart items={rows.map(r => r.item)} doneWeeks={new Map(rows.filter(r => r.doneOn).map(r => [r.item.id, Math.floor((parseLocalDate(r.doneOn!).getTime() - parseLocalDate(dumDate).getTime()) / (7 * 86_400_000))]))} currentWeek={currentWeek} />
          <JourneyTimeline
            items={timed.map(r => r.item)}
            currentWeek={currentWeek}
            done={new Set(rows.filter(r => r.status === 'feito').map(r => r.item.id))}
            dumDate={dumDate}
            busy={props.busy || !props.checksAvailable}
            onToggle={(item, value) => props.onToggle(item.id, value)}
            visits={visits}
            plannedVisits={planned}
            autoDoneIds={new Set(rows.filter(r => r.status === 'feito' && !r.checked).map(r => r.item.id))}
          />
        </section>
      )}

      {props.listsAvailable && (
        <section aria-label="Itens de vocês" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-1">
          <h3 className="flex items-center gap-2 text-[1.05rem] text-ink">
            <ListChecks className="w-5 h-5 text-brand" /> Algo a mais?
          </h3>
          <p className="text-sm text-ink-soft">Um exame que a equipe pediu e não está na lista: ele entra na jornada, na semana que vocês escolherem.</p>
          <AddItem placeholder="Ex.: Ecocardiograma fetal" withWeek disabled={props.busy} onAdd={props.onAddStep} />
          <HiddenItems items={props.hidden} onShow={id => props.onHide(id, false)} />
        </section>
      )}

      <PhaseGuide currentWeek={currentWeek} />
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warn' }) {
  return (
    <div className={`rounded-2xl px-1 py-2 min-w-0 ${tone === 'warn' ? 'bg-warn-soft' : 'bg-surface-2/70'}`}>
      <dd className={`font-display text-xl leading-tight tabular ${tone === 'warn' ? 'text-warn' : 'text-ink'}`}>{value}</dd>
      <dt className="text-[11px] font-semibold text-ink-mute truncate">{label}</dt>
      {hint && <p className="text-[10px] text-ink-mute truncate">{hint}</p>}
    </div>
  );
}

/** Linhas de uma fase: planejado e realizado lado a lado; tocar abre as ações. */
function PlanList(props: Props) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-line">
      {props.rows.map(row => (
        <PlanRow key={row.item.id} {...props} row={row} open={open === row.item.id} onOpen={() => setOpen(open === row.item.id ? null : row.item.id)} />
      ))}
    </ul>
  );
}

function PlanRow({ row, open, onOpen, ...props }: Props & { row: JourneyRow; open: boolean; onOpen: () => void }) {
  const { item, status } = row;
  const [mode, setMode] = useState<'agendar' | 'semanas' | null>(null);
  const Icon = status === 'feito' ? Check : status === 'agendado' ? CalendarClock : status === 'atrasado' ? AlertCircle : KIND_ICON[item.kind];
  const st = STATUS[status];
  return (
    <li className="py-2.5">
      <button type="button" onClick={onOpen} aria-expanded={open} aria-label={`${item.title}: ${st.label}`} className="w-full flex items-start gap-3 text-left">
        <span className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center shrink-0 ${st.icon}`}>
          <Icon className="w-4 h-4" strokeWidth={status === 'feito' ? 2.75 : 2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-start justify-between gap-2">
            <span className={`text-sm font-bold leading-snug ${status === 'feito' ? 'text-ink-soft' : 'text-ink'}`}>{item.title}</span>
            <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${st.pill}`}>{st.label}</span>
          </span>
          <span className="mt-1 grid grid-cols-2 gap-2 text-[12px] leading-snug">
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-mute">Planejado{item.base ? ' · ajustado' : ''}</span>
              <span className="text-ink-soft">{plannedText(row, props.dumDate)}</span>
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-mute">Realizado</span>
              <span className={status === 'atrasado' ? 'text-warn font-semibold' : status === 'feito' ? 'text-ok font-semibold' : 'text-ink-soft'}>{realizedText(row, props.currentWeek)}</span>
              {row.outside && <span className="block text-warn">fora da janela planejada</span>}
            </span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 mt-2 text-ink-mute shrink-0 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-2 ml-11 space-y-3">
          <p className="text-sm text-ink-soft">{item.why}</p>
          {item.base && (
            <p className="text-xs text-ink-mute">
              Referência: sem. {item.base.from}–{item.base.to}. Vocês ajustaram para sem. {item.from}–{item.to}.
            </p>
          )}
          {mode === 'agendar' ? (
            <ScheduleForm
              busy={props.busy}
              preset={{ kind: appointmentKindFor(item), title: item.kind === 'consulta' ? '' : item.title, planItem: item.id, date: suggestedDate(row, props.dumDate) }}
              onCreate={props.onSchedule}
              onClose={() => setMode(null)}
            />
          ) : mode === 'semanas' ? (
            <WeeksForm row={row} busy={props.busy} onSave={props.onSetWeeks} onClose={() => setMode(null)} />
          ) : (
            <Actions row={row} {...props} onMode={setMode} />
          )}
        </div>
      )}
    </li>
  );
}

const chip = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition [&_svg]:w-3.5 [&_svg]:h-3.5';

function Actions({ row, onMode, ...props }: Props & { row: JourneyRow; onMode: (m: 'agendar' | 'semanas') => void }) {
  const { item, status, appointment, exam } = row;
  const [menu, setMenu] = useState(false);
  const schedulable = item.kind !== 'preparo' || !!item.own;
  return (
    <div className="flex flex-wrap gap-2">
      {schedulable && status !== 'feito' && status !== 'agendado' && (
        <button type="button" onClick={() => onMode('agendar')} className={`${chip} bg-brand text-on-accent shadow-soft`}>
          <CalendarPlus /> Agendar
        </button>
      )}
      {appointment && (
        <button type="button" onClick={() => props.onOpenAppointment(appointment)} className={`${chip} bg-surface-2 text-ink`}>
          <CalendarCheck2 /> Ver agendamento
        </button>
      )}
      {exam ? (
        <button type="button" onClick={() => props.onOpenExam(exam.id)} className={`${chip} bg-surface-2 text-ink`}>
          <FileImage /> Ver resultado
        </button>
      ) : (
        appointment &&
        status === 'feito' &&
        hasResult(appointment) && (
          <button type="button" onClick={() => props.onResult(appointment)} className={`${chip} bg-surface-2 text-ink`}>
            <FileImage /> Guardar resultado
          </button>
        )
      )}
      {(status !== 'feito' || row.checked) && (
        <button
          type="button"
          disabled={props.busy || !props.checksAvailable}
          onClick={() => props.onToggle(item.id, !row.checked)}
          aria-pressed={row.checked}
          className={`${chip} ${row.checked ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-ink-soft hover:text-ink'} disabled:opacity-50`}
        >
          {row.checked ? <Undo2 /> : <Check />} {row.checked ? 'Desmarcar feito' : 'Já fizemos'}
        </button>
      )}
      {!item.anytime && props.weeksAvailable && (
        <button type="button" onClick={() => onMode('semanas')} className={`${chip} bg-surface-2 text-ink-soft hover:text-ink`}>
          <SlidersHorizontal /> Ajustar semanas
        </button>
      )}
      {item.own ? (
        <>
          <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} className={`${chip} bg-surface-2 text-ink-soft hover:text-ink`}>
            Renomear ou apagar
          </button>
          {menu && (
            <div className="basis-full -ml-8">
              <RowMenu onDone={() => setMenu(false)} actions={{ custom: { title: item.title, onRename: t => props.onRenameItem(item.own!, t), onDelete: () => props.onDeleteItem(item.own!) } }} />
            </div>
          )}
        </>
      ) : (
        props.listsAvailable && (
          <button type="button" onClick={() => props.onHide(item.id, true)} className={`${chip} text-ink-mute hover:text-ink`}>
            <EyeOff /> Não se aplica a nós
          </button>
        )
      )}
      {status === 'feito' && !row.checked && <p className="basis-full text-xs text-ink-mute">Feito pelo {exam ? 'resultado guardado' : appointment ? 'agendamento' : 'registro da consulta'} no app.</p>}
    </div>
  );
}

/** Uma data para começar: o início da janela, ou hoje se ela já abriu. */
function suggestedDate(row: JourneyRow, dumDate: string): string {
  const today = toISODate(new Date());
  if (row.item.anytime) return today;
  const start = toISODate(dateOfWeek(dumDate, row.item.from));
  return start > today ? start : today;
}

const WEEKS = Array.from({ length: 39 }, (_, i) => i + 4);

function WeeksForm({ row, busy, onSave, onClose }: { row: JourneyRow; busy: boolean; onSave: Props['onSetWeeks']; onClose: () => void }) {
  const { item } = row;
  const [from, setFrom] = useState(item.from);
  const [to, setTo] = useState(item.to);
  return (
    <form
      className="rounded-2xl bg-surface-2 p-3 space-y-3"
      onSubmit={async e => {
        e.preventDefault();
        if (to < from) return;
        if (await onSave(item.id, from, to)) onClose();
      }}
    >
      <p className="text-sm font-semibold text-ink">Quando a equipe pediu?</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-ink-soft space-y-1">
          <span>Da semana</span>
          <select aria-label="Da semana" className={inputClass} value={from} onChange={e => setFrom(Number(e.target.value))}>
            {WEEKS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-soft space-y-1">
          <span>Até a semana</span>
          <select aria-label="Até a semana" className={inputClass} value={to} onChange={e => setTo(Number(e.target.value))}>
            {WEEKS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>
      {to < from && <p className="text-xs font-semibold text-alert" role="alert">A semana final precisa vir depois da inicial.</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        {(item.base || item.own) && (
          <Button
            tone="ghost"
            disabled={busy}
            onClick={async () => {
              if (await onSave(item.id, null, null)) onClose();
            }}
            className="!px-3 !py-2 mr-auto"
          >
            Voltar ao padrão
          </Button>
        )}
        <Button tone="ghost" onClick={onClose} className="!px-3 !py-2">Cancelar</Button>
        <Button type="submit" disabled={busy || to < from} className="!px-4 !py-2">Salvar</Button>
      </div>
    </form>
  );
}
