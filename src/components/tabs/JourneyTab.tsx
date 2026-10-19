import { useState } from 'react';
import { AlertCircle, CalendarCheck2, CalendarClock, CalendarPlus, Check, ChevronDown, ChevronRight, ClipboardCopy, EyeOff, FileImage, HelpCircle, ListChecks, NotebookPen, Pencil, Route, Share2, Stethoscope, Undo2, UsersRound } from 'lucide-react';
import { KIND_LABEL, KIND_WHERE, PHASES, PLAN_SOURCE } from '../../content/prenatalPlan';
import { phaseOf, plannedVisitWeeks, visitsOf } from '../../lib/journey';
import { appointmentKindFor, journeySummary, phaseCount, planToText, statusText, todoNow, weeksText, windowDates, windowDatesText, type JourneyRow, type JourneyStatus } from '../../lib/journeyPlan';
import { hasResult } from '../../lib/appointments';
import { parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';
import type { ListItem } from '../../hooks/useGestationData';
import type { Consultation } from '../../types';
import { AddItem, HiddenItems, RowMenu } from '../EditableList';
import { KIND_ICON } from '../journey/kindIcon';
import { PhaseGuide } from '../journey/Journey';
import Sheet from '../Sheet';
import { inputClass } from '../styles';
import { Button } from '../ui';
import { ScheduleForm, type NewConsultation } from './ConsultationsTab';

// Agenda → Jornada: o roteiro do pré-natal para quem nunca passou por um.
// Em cima, o que pede ação agora; embaixo, cada trimestre (recolhível) com
// seus exames, vacinas e preparos. Tocar num item abre o pop-up com o
// planejado (quando fazer, editável e com o combinado com a equipe) e o
// realizado (agendamentos, resultado, "já fizemos").

interface Props {
  rows: JourneyRow[];
  dumDate: string;
  currentWeek: number;
  /** Todos os agendamentos (consultas, exames, ultrassons e vacinas). */
  consultations: Consultation[];
  hidden: Array<{ id: string; label: string }>;
  busy: boolean;
  checksAvailable: boolean;
  listsAvailable: boolean;
  /** Migração 019: ajustar as semanas. */
  weeksAvailable: boolean;
  /** Migração 020: anotar o combinado com a equipe. */
  notesAvailable: boolean;
  /** Item que abre já em destaque (vindo da Agenda ou dos Resultados). */
  focus?: string | null;
  onToggle: (id: string, done: boolean, doneOn?: string) => void;
  onSchedule: (c: NewConsultation) => Promise<boolean>;
  onOpenAppointment: (c: Consultation) => void;
  onOpenExam: (id: string) => void;
  onResult: (c: Consultation) => void;
  onSetPlan: (id: string, from: number | null, to: number | null, note?: string | null) => Promise<boolean>;
  onHide: (id: string, hidden: boolean) => void;
  onAddStep: (title: string, week: number | null) => Promise<boolean>;
  onRenameItem: (item: ListItem, title: string) => Promise<boolean>;
  onDeleteItem: (item: ListItem) => void;
}

type Open = { kind: 'item'; id: string; mode?: 'agendar' } | { kind: 'consultas' } | { kind: 'equipe' } | null;

const ddmm = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const STATUS: Record<JourneyStatus, { label: string; chip: string; dot: string; text: string }> = {
  feito: { label: 'feito', chip: 'bg-ok-soft text-ok', dot: 'bg-ok text-on-accent', text: 'text-ok' },
  agendado: { label: 'agendado', chip: 'bg-brand-soft text-brand-strong', dot: 'bg-brand-soft text-brand-strong', text: 'text-brand-strong' },
  atrasado: { label: 'atrasado', chip: 'bg-warn-soft text-warn', dot: 'bg-warn-soft text-warn', text: 'text-warn' },
  agora: { label: 'fazer agora', chip: 'bg-surface-2 text-ink', dot: 'bg-surface-2 text-ink', text: 'text-ink' },
  'em-breve': { label: 'em breve', chip: 'bg-surface-2 text-ink-soft', dot: 'bg-surface-2 text-ink-mute', text: 'text-ink-soft' },
  depois: { label: 'mais adiante', chip: 'bg-surface-2 text-ink-mute', dot: 'bg-surface-2 text-ink-mute', text: 'text-ink-mute' },
};

const schedulable = (r: JourneyRow) => r.item.kind !== 'preparo' || !!r.item.own;

export default function JourneyTab(props: Props) {
  const { rows, dumDate, currentWeek } = props;
  const phase = phaseOf(currentWeek);
  const [openPhases, setOpenPhases] = useState<Set<string>>(() => new Set([phase.id]));
  const [open, setOpen] = useState<Open>(() => (props.focus && rows.some(r => r.item.id === props.focus) ? { kind: 'item', id: props.focus } : null));
  const [how, setHow] = useState(false);
  const now = new Date();
  const summary = journeySummary(rows, currentWeek);
  const consultas = props.consultations.filter(c => (c.kind ?? 'consulta') === 'consulta');
  const visits = visitsOf(consultas, dumDate, now);
  const planned = plannedVisitWeeks(visits.find(v => v.specialty === 'obstetra')?.week ?? 8);
  const nextVisit = visits.find(v => v.future);
  const todo = todoNow(rows);
  const timed = rows.filter(r => !r.item.anytime);
  const groups = [
    ...PHASES.map(p => ({ id: p.id, title: `${p.label} · ${p.title}`, phase: p, rows: timed.filter(r => phaseOf(r.item.from).id === p.id) })),
    { id: 'qualquer', title: 'Em qualquer fase', phase: null, rows: rows.filter(r => r.item.anytime) },
  ].filter(g => g.rows.length > 0);
  const toggle = (id: string) =>
    setOpenPhases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const current = open?.kind === 'item' ? rows.find(r => r.item.id === open.id) : undefined;
  const pct = summary.dueByNow ? Math.round((summary.done / summary.dueByNow) * 100) : 0;
  const nextUp = timed.find(r => r.status === 'depois' || r.status === 'em-breve');

  return (
    <div className="max-w-[640px] mx-auto space-y-4">
      {/* Resumo: um número que qualquer pessoa entende */}
      <section aria-label="Resumo da jornada" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-3.5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <Route className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[1.2rem] leading-tight text-ink">Jornada do pré-natal</h2>
            <p className="text-[13px] text-ink-soft">O que fazer em cada fase, quando fazer e o que vocês já fizeram.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-2/70 p-3.5 space-y-2">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-[1.9rem] leading-none text-ink tabular">
              {summary.done}
              <span className="text-ink-mute text-[1.2rem]">/{summary.dueByNow}</span>
            </span>
            <span className="text-[13px] text-ink-soft leading-snug">{summary.dueByNow ? 'do que já era para ter começado está feito' : 'nada previsto até esta semana'}</span>
          </p>
          <div className="h-2 rounded-full bg-surface overflow-hidden" role="progressbar" aria-label="Feito do previsto até agora" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] font-semibold">
            <span className="text-ok">✓ {summary.doneTotal} {summary.doneTotal === 1 ? 'feito' : 'feitos'}</span>
            <span className="text-brand-strong">{summary.scheduled} {summary.scheduled === 1 ? 'agendado' : 'agendados'}</span>
            {summary.late > 0 && <span className="text-warn">{summary.late} {summary.late === 1 ? 'atrasado' : 'atrasados'}</span>}
            <span className="text-ink-mute">de {summary.total} na gestação</span>
          </p>
        </div>

        <button type="button" onClick={() => setOpen({ kind: 'consultas' })} className="w-full flex items-center gap-3 rounded-2xl bg-surface-2/70 px-3.5 py-3 text-left">
          <Stethoscope className="w-5 h-5 text-brand shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-ink">Consultas de pré-natal</span>
            <span className="block text-xs text-ink-soft">
              {visits.filter(v => !v.future).length} de {planned.filter(w => w <= currentWeek).length} previstas até agora · {nextVisit ? `próxima ${ddmm(nextVisit.date)}` : 'nenhuma marcada'}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setHow(!how)} aria-expanded={how} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-bold text-ink-soft hover:text-ink">
            <HelpCircle className="w-4 h-4" /> Como funciona
          </button>
          <button type="button" onClick={() => setOpen({ kind: 'equipe' })} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-bold text-ink-soft hover:text-ink">
            <UsersRound className="w-4 h-4" /> Revisar com a equipe
          </button>
        </div>
        {how && (
          <ol className="space-y-2.5 text-sm text-ink-soft" aria-label="Como funciona a jornada">
            <Step n={1} title="Planejado">Quando cada exame, vacina e consulta costuma acontecer, pela Caderneta da Gestante e pela FEBRASGO. Vocês podem mudar as semanas e anotar o que a equipe combinou.</Step>
            <Step n={2} title="Realizado">O que vocês já agendaram ou fizeram. Ao agendar na Agenda, o app liga ao item sozinho; quando a data passa, ele fica como feito.</Step>
            <Step n={3} title="No dia a dia">Comecem por "Para fazer agora". Tocar num item mostra por que fazer, como se preparar e o botão para agendar.</Step>
          </ol>
        )}
      </section>

      {!props.checksAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2">Para marcar itens como feitos, rode a migração 007 no Neon.</p>}

      {/* O que pede ação agora */}
      <section aria-label="Para fazer agora" className="rounded-[26px] bg-surface shadow-soft p-4">
        <h3 className="text-[1.1rem] text-ink">Para fazer agora</h3>
        <p className="text-xs text-ink-mute mb-1">Semana {currentWeek} · {phase.label}, {phase.visits.toLowerCase()}</p>
        {todo.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">
            Tudo em dia por agora.{nextUp ? ` O próximo é ${nextUp.item.title.toLowerCase()}, ${statusText(nextUp, dumDate).toLowerCase()}.` : ''}
          </p>
        ) : (
          <>
          {summary.late > 0 && (
            <p className="my-2 rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-ink">
              Atrasado não é motivo de susto: agendem assim que puderem, ou toquem no item e marquem "Já fizemos" se fizeram fora do app.
            </p>
          )}
          <ul className="divide-y divide-line">
            {todo.map(r => (
              <ItemRow key={r.item.id} row={r} dumDate={dumDate} onOpen={() => setOpen({ kind: 'item', id: r.item.id })} onSchedule={schedulable(r) && r.status !== 'em-breve' ? () => setOpen({ kind: 'item', id: r.item.id, mode: 'agendar' }) : undefined} />
            ))}
          </ul>
          </>
        )}
      </section>

      {/* Os trimestres, recolhíveis */}
      <section aria-label="Toda a jornada" className="space-y-2.5">
        <h3 className="px-1 text-[1.1rem] text-ink">Toda a jornada</h3>
        {groups.map(g => {
          const isOpen = openPhases.has(g.id);
          const count = phaseCount(g.rows);
          const isNow = g.phase?.id === phase.id;
          return (
            <div key={g.id} role="group" aria-label={g.title} className="rounded-[22px] bg-surface shadow-soft">
              <button type="button" onClick={() => toggle(g.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-ink">{g.title}</span>
                    {isNow && <span className="text-[10.5px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand text-on-accent">agora</span>}
                  </span>
                  <span className="block text-xs text-ink-mute">
                    {g.phase ? `semanas ${g.phase.from} a ${g.phase.to} · ` : 'vacinas e itens sem semana · '}
                    {count.done} de {count.total} {count.total === 1 ? 'feito' : 'feitos'}
                    {count.late > 0 && <span className="text-warn font-semibold"> · {count.late} {count.late === 1 ? 'atrasado' : 'atrasados'}</span>}
                  </span>
                </span>
                <span className="w-10 h-1.5 rounded-full bg-surface-2 overflow-hidden shrink-0" aria-hidden>
                  <span className="block h-full bg-ok" style={{ width: `${(count.done / count.total) * 100}%` }} />
                </span>
                <ChevronDown className={`w-4 h-4 text-ink-mute shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-3">
                  {g.phase && <p className="text-xs text-ink-soft pb-1">{g.phase.focus} Consultas: {g.phase.visits.toLowerCase()}.</p>}
                  <ul className="divide-y divide-line">
                    {g.rows.map(r => (
                      <ItemRow key={r.item.id} row={r} dumDate={dumDate} onOpen={() => setOpen({ kind: 'item', id: r.item.id })} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {props.listsAvailable && (
        <section aria-label="Itens de vocês" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-1">
          <h3 className="flex items-center gap-2 text-[1.05rem] text-ink">
            <ListChecks className="w-5 h-5 text-brand" /> A equipe pediu algo a mais?
          </h3>
          <p className="text-sm text-ink-soft">Um exame, uma vacina ou uma consulta com outro especialista: ele entra na jornada, na semana que vocês escolherem.</p>
          <AddItem placeholder="Ex.: Ecocardiograma fetal" withWeek disabled={props.busy} onAdd={props.onAddStep} />
          <HiddenItems items={props.hidden} onShow={id => props.onHide(id, false)} />
        </section>
      )}

      <PhaseGuide currentWeek={currentWeek} />

      {current && <ItemSheet key={current.item.id} {...props} row={current} startMode={open?.kind === 'item' ? open.mode : undefined} onClose={() => setOpen(null)} />}
      {open?.kind === 'consultas' && <VisitsSheet {...props} consultas={consultas} onClose={() => setOpen(null)} />}
      {open?.kind === 'equipe' && <TeamSheet text={planToText(rows, dumDate, currentWeek, groups)} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-strong text-xs font-extrabold flex items-center justify-center shrink-0">{n}</span>
      <span>
        <strong className="text-ink">{title}:</strong> {children}
      </span>
    </li>
  );
}

function ItemRow({ row, dumDate, onOpen, onSchedule }: { row: JourneyRow; dumDate: string; onOpen: () => void; onSchedule?: () => void }) {
  const { item, status } = row;
  const st = STATUS[status];
  const Icon = status === 'feito' ? Check : status === 'agendado' ? CalendarClock : status === 'atrasado' ? AlertCircle : KIND_ICON[item.kind];
  return (
    <li className="flex items-center gap-2 py-1">
      <button type="button" onClick={onOpen} aria-label={`${item.title}: ${st.label}`} className="flex-1 min-w-0 flex items-center gap-3 py-2 text-left">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${st.dot}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={status === 'feito' ? 2.75 : 2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[14.5px] font-bold leading-snug ${status === 'feito' ? 'text-ink-soft' : 'text-ink'}`}>{item.title}</span>
          <span className={`block text-[12.5px] leading-snug ${st.text}`}>
            {statusText(row, dumDate)}
            {(item.base || item.note) && <span className="text-ink-mute"> · ajustado com a equipe</span>}
          </span>
        </span>
        {!onSchedule && <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />}
      </button>
      {onSchedule && (
        <button type="button" onClick={onSchedule} aria-label={`Agendar ${item.title}`} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-on-accent shadow-soft">
          <CalendarPlus className="w-3.5 h-3.5" /> Agendar
        </button>
      )}
    </li>
  );
}

/** A gestação de 4 a 42 semanas: a janela planejada, hoje e o realizado. */
function WeekBar({ row, dumDate, week }: { row: JourneyRow; dumDate: string; week: number }) {
  const from = 4;
  const to = 42;
  const pct = (w: number) => ((Math.min(to, Math.max(from, w)) - from) / (to - from)) * 100;
  const realized = row.doneOn ?? (row.appointment ? toISODate(parseTimestamp(row.appointment.scheduled_at)) : null);
  const realizedWeek = realized ? (parseLocalDate(realized).getTime() - parseLocalDate(dumDate).getTime()) / (7 * 86_400_000) : null;
  return (
    <div className="pt-1" aria-hidden>
      <div className="relative h-3 rounded-full bg-surface">
        {[13, 27].map(w => (
          <span key={w} className="absolute top-0 bottom-0 w-px bg-line" style={{ left: `${pct(w + 1)}%` }} />
        ))}
        <span className="absolute top-0 bottom-0 rounded-full bg-brand/35 ring-1 ring-brand/60" style={{ left: `${pct(row.item.from)}%`, width: `max(8px, ${pct(row.item.to + 1) - pct(row.item.from)}%)` }} />
        <span className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink" style={{ left: `${pct(week + 0.5)}%` }} />
        {realizedWeek !== null && (
          <span className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-surface ${row.status === 'feito' ? 'bg-ok' : 'bg-brand'}`} style={{ left: `${pct(realizedWeek)}%` }} />
        )}
      </div>
      <div className="relative mt-1.5 h-3 text-[10px] text-ink-mute">
        {[[4, 13, '1º tri'], [14, 27, '2º tri'], [28, 42, '3º tri']].map(([a, b, label]) => (
          <span key={label} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(pct(Number(a)) + pct(Number(b) + 1)) / 2}%` }}>
            {label}
          </span>
        ))}
      </div>
      <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-ink-mute">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-brand/35 ring-1 ring-brand/60" /> planejado</span>
        <span className="inline-flex items-center gap-1"><span className="w-0.5 h-3 bg-ink" /> hoje</span>
        {realizedWeek !== null && <span className="inline-flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${row.status === 'feito' ? 'bg-ok' : 'bg-brand'}`} /> {row.status === 'feito' ? 'feito' : 'agendado'}</span>}
      </p>
    </div>
  );
}

const pill = 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition disabled:opacity-50 [&_svg]:w-4 [&_svg]:h-4';

/** O pop-up de um item: por que, como se preparar, o planejado (editável) e o realizado. */
function ItemSheet({ row, startMode, onClose, ...props }: Props & { row: JourneyRow; startMode?: 'agendar'; onClose: () => void }) {
  const { item, status } = row;
  const [mode, setMode] = useState<'ver' | 'agendar' | 'editar' | 'feito'>(startMode ?? 'ver');
  const Icon = KIND_ICON[item.kind];
  const st = STATUS[status];
  const linked = props.consultations.filter(c => c.plan_item === item.id).sort((a, b) => parseTimestamp(a.scheduled_at).getTime() - parseTimestamp(b.scheduled_at).getTime());
  const now = new Date();
  const hasFuture = linked.some(c => parseTimestamp(c.scheduled_at) > now);
  const pastWithoutResult = !row.exam ? linked.filter(c => parseTimestamp(c.scheduled_at) <= now && hasResult(c)).pop() : undefined;

  return (
    <Sheet icon={<Icon />} title={item.title} subtitle={<span className="flex flex-wrap items-center gap-2">{KIND_LABEL[item.kind]}<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.chip}`}>{st.label}</span></span>} onClose={onClose}>
      {mode === 'agendar' ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-soft">Melhor dentro da janela planejada: {windowDatesText(item, props.dumDate)}.</p>
          <ScheduleForm
            busy={props.busy}
            preset={{ kind: appointmentKindFor(item), title: item.kind === 'consulta' ? '' : item.title, planItem: item.id, date: suggestedDate(row, props.dumDate) }}
            onCreate={async c => {
              const ok = await props.onSchedule(c);
              if (ok) setMode('ver');
              return ok;
            }}
            onClose={() => setMode('ver')}
          />
        </div>
      ) : mode === 'editar' ? (
        <PlanEditor row={row} {...props} onDone={() => setMode('ver')} />
      ) : (
        <div className="space-y-4">
          <p className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold ${st.chip}`}>{statusText(row, props.dumDate)}</p>

          <div className="space-y-1.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-mute font-sans">Por que fazer</h3>
            <p className="text-sm text-ink">{item.why}</p>
            {(item.prep || !item.own) && (
              <>
                <h3 className="pt-2 text-xs font-extrabold uppercase tracking-wide text-ink-mute font-sans">Como se preparar</h3>
                {item.prep && <p className="text-sm text-ink">{item.prep}</p>}
                <p className="text-xs text-ink-soft">{KIND_WHERE[item.kind]}</p>
              </>
            )}
          </div>

          {/* Planejado */}
          <section aria-label="Planejado" className="rounded-2xl bg-surface-2/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-mute font-sans">Planejado</h3>
              {(props.weeksAvailable || props.notesAvailable) && (
                <button type="button" onClick={() => setMode('editar')} className="inline-flex items-center gap-1 text-xs font-bold text-brand-strong">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              )}
            </div>
            <p className="text-[15px] font-bold text-ink">{item.anytime ? 'Em qualquer fase da gestação' : `${weeksText(item)[0].toUpperCase()}${weeksText(item).slice(1)} · ${windowDatesText(item, props.dumDate)}`}</p>
            {!item.anytime && <WeekBar row={row} dumDate={props.dumDate} week={props.currentWeek} />}
            {item.base && <p className="text-xs text-ink-soft">Ajustado por vocês. Referência: semanas {item.base.from} a {item.base.to}.</p>}
            {item.note && (
              <p className="flex gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-ink">
                <NotebookPen className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>
                  <strong className="block text-xs text-ink-mute">Combinado com a equipe</strong>
                  {item.note}
                </span>
              </p>
            )}
          </section>

          {/* Realizado */}
          <section aria-label="Realizado" className="rounded-2xl bg-surface-2/70 p-3.5 space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-mute font-sans">Realizado</h3>
            {linked.length === 0 && !row.exam && !row.checked && status !== 'feito' && <p className="text-sm text-ink-soft">Nada ainda. Agendem aqui ou marquem se já fizeram fora do app.</p>}
            <ul className="space-y-1.5">
              {linked.map(c => {
                const at = parseTimestamp(c.scheduled_at);
                const past = at <= now;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => props.onOpenAppointment(c)} className="w-full flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-left text-sm">
                      <CalendarCheck2 className={`w-4 h-4 shrink-0 ${past ? 'text-ok' : 'text-brand'}`} />
                      <span className="flex-1 min-w-0 text-ink">
                        {at.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} às {at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-ink-mute"> · {past ? 'aconteceu' : 'agendado'}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-mute" />
                    </button>
                  </li>
                );
              })}
              {row.exam && (
                <li>
                  <button type="button" onClick={() => props.onOpenExam(row.exam!.id)} className="w-full flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-left text-sm">
                    <FileImage className="w-4 h-4 text-ok shrink-0" />
                    <span className="flex-1 min-w-0 text-ink">
                      Resultado guardado <span className="text-ink-mute">· {ddmm(parseLocalDate(row.exam.exam_date.slice(0, 10)))}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink-mute" />
                  </button>
                </li>
              )}
              {row.checked && (
                <li className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-sm">
                  <Check className="w-4 h-4 text-ok shrink-0" />
                  <span className="flex-1 min-w-0 text-ink">Marcado como feito{row.doneOn && !linked.length && !row.exam ? ` em ${ddmm(parseLocalDate(row.doneOn))}` : ''}</span>
                  <button type="button" disabled={props.busy} onClick={() => props.onToggle(item.id, false)} className="inline-flex items-center gap-1 text-xs font-bold text-ink-mute hover:text-ink">
                    <Undo2 className="w-3.5 h-3.5" /> Desfazer
                  </button>
                </li>
              )}
              {status === 'feito' && !row.checked && !linked.length && !row.exam && <li className="text-sm text-ok">Feito pela consulta registrada no app.</li>}
            </ul>
            {row.outside && <p className="text-xs text-warn">A data fica fora da janela planejada. Se foi a equipe que pediu assim, ajustem o planejado.</p>}

            {mode === 'feito' ? (
              <DoneForm busy={props.busy} onCancel={() => setMode('ver')} onSave={day => { props.onToggle(item.id, true, day); setMode('ver'); }} />
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {status !== 'feito' && schedulable(row) && !hasFuture && (
                  <button type="button" onClick={() => setMode('agendar')} className={`${pill} bg-brand text-on-accent shadow-soft`}>
                    <CalendarPlus /> Agendar
                  </button>
                )}
                {status !== 'feito' && (
                  <button type="button" disabled={props.busy || !props.checksAvailable} onClick={() => setMode('feito')} className={`${pill} bg-surface text-ink`}>
                    <Check /> Já fizemos
                  </button>
                )}
                {pastWithoutResult && (
                  <button type="button" onClick={() => props.onResult(pastWithoutResult)} className={`${pill} bg-surface text-ink`}>
                    <FileImage /> Guardar resultado
                  </button>
                )}
              </div>
            )}
          </section>

          <ItemFooter row={row} {...props} onClose={onClose} />
          {!item.own && <p className="text-[11px] text-ink-mute">{PLAN_SOURCE}</p>}
        </div>
      )}
    </Sheet>
  );
}

function ItemFooter({ row, onClose, ...props }: Props & { row: JourneyRow; onClose: () => void }) {
  const [menu, setMenu] = useState(false);
  const { item } = row;
  if (item.own) {
    return menu ? (
      <RowMenu onDone={() => setMenu(false)} actions={{ custom: { title: item.title, onRename: t => props.onRenameItem(item.own!, t), onDelete: () => { props.onDeleteItem(item.own!); onClose(); } } }} />
    ) : (
      <button type="button" onClick={() => setMenu(true)} className="text-xs font-bold text-ink-mute hover:text-ink">
        Renomear ou apagar este item
      </button>
    );
  }
  if (!props.listsAvailable) return null;
  return (
    <button
      type="button"
      onClick={() => {
        props.onHide(item.id, true);
        onClose();
      }}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute hover:text-ink"
    >
      <EyeOff className="w-3.5 h-3.5" /> A equipe disse que não se aplica a nós (ocultar)
    </button>
  );
}

function DoneForm({ busy, onSave, onCancel }: { busy: boolean; onSave: (day: string) => void; onCancel: () => void }) {
  const today = toISODate(new Date());
  const [day, setDay] = useState(today);
  return (
    <form
      className="flex flex-wrap items-end gap-2 pt-1"
      onSubmit={e => {
        e.preventDefault();
        if (day && day <= today) onSave(day);
      }}
    >
      <label className="flex-1 min-w-[150px] text-xs font-semibold text-ink-soft space-y-1">
        <span>Em que dia fizeram?</span>
        <input type="date" aria-label="Dia em que fizeram" max={today} className={`${inputClass} !py-2`} value={day} onChange={e => setDay(e.target.value)} />
      </label>
      <Button tone="ghost" onClick={onCancel} className="!px-3 !py-2">Cancelar</Button>
      <Button type="submit" disabled={busy || !day} className="!px-4 !py-2">Confirmar</Button>
    </form>
  );
}

const WEEKS = Array.from({ length: 39 }, (_, i) => i + 4);

/** Editar o planejado: as semanas (com as datas ao lado) e o combinado com a equipe. */
function PlanEditor({ row, onDone, ...props }: Props & { row: JourneyRow; onDone: () => void }) {
  const { item } = row;
  const [from, setFrom] = useState(item.from);
  const [to, setTo] = useState(item.to);
  const [note, setNote] = useState(item.note ?? '');
  const weeks = props.weeksAvailable && !item.anytime;
  const dateOf = (w: number) => ddmm(windowDates({ ...item, from: w, to: w }, props.dumDate).start);
  const changed = weeks && (from !== (item.base?.from ?? item.from) || to !== (item.base?.to ?? item.to));
  const save = async (f: number | null, t: number | null, n: string | null) => {
    const ok = props.notesAvailable ? await props.onSetPlan(item.id, f, t, n) : await props.onSetPlan(item.id, f, t);
    if (ok) onDone();
  };
  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        if (to < from) return;
        // Semanas iguais às da referência voltam a ser a referência.
        save(changed ? from : null, changed ? to : null, note.trim() || null);
      }}
    >
      <p className="text-sm text-ink-soft">
        A referência é um ponto de partida. Se a equipe do pré-natal pediu outra semana, um exame a mais ou combinou algo diferente, anotem aqui.
      </p>
      {weeks ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-ink">Quando fazer</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-ink-soft space-y-1">
              <span>Da semana</span>
              <select aria-label="Da semana" className={inputClass} value={from} onChange={e => setFrom(Number(e.target.value))}>
                {WEEKS.map(w => <option key={w} value={w}>{w} · {dateOf(w)}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-ink-soft space-y-1">
              <span>Até a semana</span>
              <select aria-label="Até a semana" className={inputClass} value={to} onChange={e => setTo(Number(e.target.value))}>
                {WEEKS.map(w => <option key={w} value={w}>{w} · {dateOf(w)}</option>)}
              </select>
            </label>
          </div>
          {item.base && <p className="text-xs text-ink-mute">Referência: semanas {item.base.from} a {item.base.to}.</p>}
          {to < from && <p className="text-xs font-semibold text-alert" role="alert">A semana final precisa vir depois da inicial.</p>}
        </fieldset>
      ) : (
        !item.anytime && <p className="text-xs text-warn">Para mudar as semanas, rode a migração 019 no Neon.</p>
      )}
      {props.notesAvailable ? (
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">Combinado com a equipe (opcional)</span>
          <textarea aria-label="Combinado com a equipe" className={`${inputClass} min-h-[84px]`} maxLength={500} placeholder="Ex.: a Dra. Ana pediu repetir com 30 semanas, em jejum." value={note} onChange={e => setNote(e.target.value)} />
        </label>
      ) : (
        <p className="text-xs text-ink-mute">Para anotar o combinado com a equipe, rode a migração 020 no Neon.</p>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        {(item.base || item.note) && (
          <Button tone="ghost" disabled={props.busy} onClick={() => save(null, null, null)} className="!px-3 !py-2 mr-auto">
            Voltar à referência
          </Button>
        )}
        <Button tone="ghost" onClick={onDone} className="!px-3 !py-2">Cancelar</Button>
        <Button type="submit" disabled={props.busy || to < from} className="!px-4 !py-2">Salvar</Button>
      </div>
    </form>
  );
}

/** Uma data para começar: o início da janela, ou hoje se ela já abriu. */
function suggestedDate(row: JourneyRow, dumDate: string): string {
  const today = toISODate(new Date());
  if (row.item.anytime) return today;
  const start = toISODate(windowDates(row.item, dumDate).start);
  return start > today ? start : today;
}

/** As consultas: o ritmo recomendado em cada fase e as do casal. */
function VisitsSheet({ consultas, onClose, ...props }: Props & { consultas: Consultation[]; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const now = new Date();
  const visits = visitsOf(consultas, props.dumDate, now);
  const planned = plannedVisitWeeks(visits.find(v => v.specialty === 'obstetra')?.week ?? 8);
  const phase = phaseOf(props.currentWeek);
  return (
    <Sheet icon={<Stethoscope />} title="Consultas de pré-natal" subtitle={`${visits.filter(v => !v.future).length} feitas · ${planned.filter(w => w <= props.currentWeek).length} previstas até a semana ${props.currentWeek}`} onClose={onClose}>
      {adding ? (
        <ScheduleForm busy={props.busy} preset={{ kind: 'consulta', title: '', date: toISODate(now) }} onCreate={async c => { const ok = await props.onSchedule(c); if (ok) setAdding(false); return ok; }} onClose={() => setAdding(false)} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">O Ministério da Saúde recomenda pelo menos 6 consultas, começando o quanto antes. O ritmo aumenta perto do parto:</p>
          <ul className="space-y-1.5">
            {PHASES.map(p => (
              <li key={p.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${p.id === phase.id ? 'bg-brand-soft text-ink font-semibold' : 'bg-surface-2/70 text-ink-soft'}`}>
                <span>{p.label} <span className="text-ink-mute font-normal">· sem. {p.from}–{p.to}</span></span>
                <span>{p.visits}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-mute font-sans">As de vocês</h3>
            {visits.length === 0 && <p className="text-sm text-ink-soft">Nenhuma consulta na Agenda ainda.</p>}
            <ul className="space-y-1.5">
              {visits.map(v => {
                const c = consultas.find(x => x.id === v.id)!;
                return (
                  <li key={v.id}>
                    <button type="button" onClick={() => props.onOpenAppointment(c)} className="w-full flex items-center gap-2.5 rounded-xl bg-surface-2/70 px-3 py-2 text-left text-sm">
                      <CalendarCheck2 className={`w-4 h-4 shrink-0 ${v.future ? 'text-brand' : 'text-ok'}`} />
                      <span className="flex-1 min-w-0 text-ink">
                        {v.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · semana {v.week}
                        <span className="text-ink-mute"> · {v.future ? 'agendada' : 'feita'}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-mute" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <Button onClick={() => setAdding(true)} className="w-full">
            <CalendarPlus /> Agendar consulta
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** Revisar com a equipe: o plano em texto para levar à consulta, copiar ou compartilhar. */
function TeamSheet({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <Sheet icon={<UsersRound />} title="Revisar com a equipe" subtitle="O plano de vocês, para combinar na consulta" onClose={onClose}>
      <div className="space-y-4">
        <ol className="space-y-2.5 text-sm text-ink-soft">
          <Step n={1} title="Levem o plano">Copiem ou compartilhem o texto abaixo e mostrem na próxima consulta.</Step>
          <Step n={2} title="Perguntem">Algum exame a mais, a menos ou em outra semana para vocês?</Step>
          <Step n={3} title="Ajustem aqui">Toquem no item, em Planejado → Editar, e anotem o que a equipe combinou.</Step>
        </ol>
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-surface-2/70 p-3 text-[12px] leading-relaxed text-ink font-sans">{text}</pre>
        <div className={`grid gap-2 ${canShare ? 'grid-cols-2' : ''}`}>
          <Button
            tone="soft"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <ClipboardCopy /> {copied ? 'Copiado' : 'Copiar'}
          </Button>
          {canShare && (
            <Button onClick={() => navigator.share({ title: 'Plano do pré-natal', text }).catch(() => undefined)}>
              <Share2 /> Compartilhar
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
