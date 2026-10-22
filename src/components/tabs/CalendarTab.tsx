import { useContext, useRef, useState } from 'react';
import { AlertTriangle, Bell, FileCheck2, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, Flag, Heart, ListPlus, NotebookPen, PartyPopper, Stethoscope } from 'lucide-react';
import { buildCalendar, gestationalWeekDays, gestationalWeekOf, googleCalendarUrl, monthGrid, toIcs, type CalendarEvent, type CalendarMoment, type CalendarResult, type DayRecords } from '../../lib/calendar';
import { FIRST_WEEK, LAST_WEEK, daysBetween, parseLocalDate, toISODate } from '../../lib/dates';
import type { Consultation, HealthMetric, PartnerTask, SymptomItem, Tab } from '../../types';
import AuthorBadge from '../AuthorBadge';
import MoodFace from '../MoodFace';
import type { Checkin } from '../../hooks/useGestationData';
import { MOOD_COLOR, moodLabel, moodOf } from '../../lib/moods';
import { PeopleContext, firstName, memberWithRole } from '../../lib/people';
import IntensityDots from '../IntensityDots';
import { Button, Card, Pill, Segmented } from '../ui';
import type { DetailTarget } from '../../lib/details';
import { ScheduleForm, type NewConsultation } from './ConsultationsTab';
import AppointmentIcon from '../AppointmentIcon';
import { TaskForm, type NewTask } from './TasksTab';
import type { Celebration } from '../../lib/celebrations';

interface Props {
  dumDate: string;
  currentWeek: number;
  consultations: Consultation[];
  tasks: PartnerTask[];
  symptoms: SymptomItem[];
  metrics: HealthMetric[];
  journal: CalendarMoment[];
  busy: boolean;
  migrationPending: boolean;
  onCreateConsultation: (c: NewConsultation) => Promise<boolean>;
  onCreateTask: (t: NewTask) => Promise<boolean>;
  onToggleTask: (t: PartnerTask) => void;
  onNavigate: (tab: Tab) => void;
  onNotify: (text: string) => void;
  /** Abre os detalhes de um agendamento, tarefa ou momento, ou o resultado de um exame. */
  onOpen: OpenTarget;
  /** Resultados guardados (exames e ultrassons), que entram no dia em que foram feitos. */
  results: CalendarResult[];
  /** Humor de cada um (check-in do dia): bolinhas no rodapé do dia e linha no detalhe. */
  checkins: Checkin[];
  /** Celebrações (chá de bebê...): o dia da festa e os prazos das tarefas. */
  celebrations?: Celebration[] | null;
  onOpenCelebration?: (id: string) => void;
}

/** O que um evento abre: os detalhes (agendamento, tarefa, momento) ou o resultado guardado. */
export type OpenTarget = (target: DetailTarget | { kind: 'exam'; id: string }) => void;

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const KIND_STYLE: Record<CalendarEvent['kind'], string> = {
  consulta: 'bg-brand-soft text-brand-strong',
  exame: 'bg-verde-soft text-verde-strong',
  tarefa: 'bg-surface-2 text-ink-soft',
  marco: 'bg-warm-soft text-warm',
  momento: 'bg-casal-soft text-casal',
  celebracao: 'bg-rosa-soft text-rosa',
};

export default function CalendarTab(props: Props) {
  const today = parseLocalDate(toISODate(new Date()));
  const todayIso = toISODate(today);
  const [view, setView] = useState<'mes' | 'semana'>('mes');
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [week, setWeek] = useState(props.currentWeek);
  const [selected, setSelectedState] = useState(todayIso);
  const panelRef = useRef<HTMLDivElement>(null);
  // Ao tocar num dia, leva até o detalhe dele (que fica logo abaixo do calendário).
  const setSelected = (day: string) => {
    setSelectedState(day);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const cal = buildCalendar({ dumDate: props.dumDate, consultations: props.consultations, results: props.results, tasks: props.tasks, symptoms: props.symptoms, metrics: props.metrics, journal: props.journal, celebrations: props.celebrations, today });

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setWeek(props.currentWeek);
    setSelectedState(todayIso);
  };

  const exportIcs = () => {
    const ics = toIcs([...cal.events.values()].flat(), props.consultations);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tumtum.ics';
    a.click();
    URL.revokeObjectURL(url);
    props.onNotify('Arquivo de agenda baixado. Abra no celular para importar no Google Agenda ou no calendário do iPhone.');
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const weekDays = gestationalWeekDays(props.dumDate, week);
  const weekLabel = `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  const move = (delta: number) => {
    if (view === 'mes') {
      const d = new Date(cursor.year, cursor.month + delta, 1);
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      setWeek(w => Math.min(LAST_WEEK, Math.max(FIRST_WEEK, w + delta)));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.2rem] text-ink first-letter:uppercase">{view === 'mes' ? monthLabel : `Semana ${week} da gestação`}</h2>
          {view === 'semana' && <p className="text-sm text-ink-mute">{weekLabel}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Visualização" size="sm" value={view} onChange={setView} options={[{ value: 'mes', label: 'Mês' }, { value: 'semana', label: 'Semana' }]} />
          <div className="flex items-center gap-1">
            <button onClick={() => move(-1)} aria-label={view === 'mes' ? 'Mês anterior' : 'Semana anterior'} className="p-2 rounded-full hover:bg-surface-2 text-ink-soft">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Button tone="ghost" onClick={goToday} className="!px-3 !py-1.5">Hoje</Button>
            <button onClick={() => move(1)} aria-label={view === 'mes' ? 'Próximo mês' : 'Próxima semana'} className="p-2 rounded-full hover:bg-surface-2 text-ink-soft">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <Legend />

      <div className="space-y-5">
        <Card className="!p-3 md:!p-4">
          {view === 'mes' ? (
            <MonthView year={cursor.year} month={cursor.month} dumDate={props.dumDate} todayIso={todayIso} selected={selected} onSelect={setSelected} events={cal.events} records={cal.records} checkins={props.checkins} />
          ) : (
            <WeekView days={weekDays} todayIso={todayIso} selected={selected} onSelect={setSelected} events={cal.events} records={cal.records} checkins={props.checkins} onToggleTask={id => { const t = props.tasks.find(x => x.id === id); if (t) props.onToggleTask(t); }} onOpen={props.onOpen} onOpenCelebration={props.onOpenCelebration} />
          )}
        </Card>

        <div ref={panelRef} className="scroll-mb-24">
        <DayPanel
          key={selected}
          day={selected}
          dumDate={props.dumDate}
          todayIso={todayIso}
          events={cal.events.get(selected) ?? []}
          records={cal.records.get(selected)}
          checkins={props.checkins.filter(c => c.day === selected)}
          consultations={props.consultations}
          tasks={props.tasks}
          busy={props.busy}
          migrationPending={props.migrationPending}
          onCreateConsultation={props.onCreateConsultation}
          onCreateTask={props.onCreateTask}
          onToggleTask={props.onToggleTask}
          onNavigate={props.onNavigate}
          onOpen={props.onOpen}
          onOpenCelebration={props.onOpenCelebration}
        />
        </div>
      </div>

      <button
        type="button"
        onClick={exportIcs}
        className="w-full flex items-center gap-3 rounded-[24px] bg-surface shadow-soft px-5 py-4 text-left hover:bg-surface-2 transition"
      >
        <CalendarPlus className="w-5 h-5 text-brand shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink">Levar para a agenda do celular</span>
          <span className="block text-xs text-ink-mute">Consultas, prazos e marcos no Google Agenda ou no iPhone</span>
        </span>
        <Download className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
    </div>
  );
}

function Legend() {
  const item = (cls: string, label: string) => (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <span className={`w-3 h-3 rounded-full ${cls}`} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {item('bg-brand', 'Consulta, exame ou vacina marcados')}
      {item('bg-verde', 'Resultado guardado')}
      {item('bg-ink-mute', 'Tarefa com prazo')}
      {item('bg-warm', 'Marco do pré-natal')}
      {item('bg-casal', 'Momento ou lembrete')}
      {item('bg-alert', 'Atrasado ou alerta')}
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--c-int-3)' }} />
        Dia com registro de saúde
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <span className="inline-flex gap-0.5" aria-hidden>
          <span className="w-2 h-1 rounded-full bg-ok" />
          <span className="w-2 h-1 rounded-full bg-warn" />
        </span>
        Humor de cada um (no pé do dia)
      </span>
    </div>
  );
}

function dotClass(e: CalendarEvent) {
  if (e.overdue) return 'bg-alert';
  if (e.kind === 'consulta') return 'bg-brand';
  if (e.kind === 'exame') return 'bg-verde';
  if (e.kind === 'marco') return 'bg-warm';
  if (e.kind === 'momento') return 'bg-casal';
  if (e.kind === 'celebracao') return e.done ? 'bg-line' : 'bg-rosa';
  return e.done ? 'bg-line' : 'bg-ink-mute';
}

/** Humor do dia em bolinhas (mãe à esquerda, pai à direita), discretas para não disputar com os compromissos. */
function MoodDots({ list }: { list: Checkin[] }) {
  if (list.length === 0) return null;
  return (
    <span className="mt-auto flex justify-center gap-0.5" aria-hidden>
      {(['mae', 'pai'] as const).map(r => {
        const c = list.find(x => x.author_role === r);
        return c ? <span key={r} className={`w-2.5 md:w-3 h-1.5 rounded-full ${MOOD_COLOR[c.mood].bg}`} /> : null;
      })}
    </span>
  );
}

const moodsText = (list: Checkin[], nameOf: (r: 'mae' | 'pai') => string) =>
  list.length ? `, humor: ${list.map(c => `${nameOf(c.author_role)} ${moodLabel(c.mood, c.author_role).toLowerCase()}`).join(', ')}` : '';

function useNameOf() {
  const people = useContext(PeopleContext);
  return (r: 'mae' | 'pai') => {
    const m = memberWithRole(people, r);
    return m ? firstName(m.name) : r === 'mae' ? 'Mãe' : 'Pai';
  };
}

function MonthView({ year, month, dumDate, todayIso, selected, onSelect, events, records, checkins }: { year: number; month: number; dumDate: string; todayIso: string; selected: string; onSelect: (d: string) => void; events: Map<string, CalendarEvent[]>; records: Map<string, DayRecords>; checkins: Checkin[] }) {
  const weeks = monthGrid(year, month);
  const nameOf = useNameOf();
  return (
    <div role="grid" aria-label="Calendário do mês">
      <div className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] md:grid-cols-[36px_repeat(7,minmax(0,1fr))] gap-1 mb-1" role="row">
        <span className="text-[10px] font-semibold text-ink-mute self-end text-center" aria-hidden>sem</span>
        {WEEKDAYS.map(d => <span key={d} className="text-xs font-semibold text-ink-mute text-center " role="columnheader">{d}</span>)}
      </div>
      {weeks.map(days => {
        const gw = gestationalWeekOf(dumDate, days[3]);
        return (
          <div key={toISODate(days[0])} className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] md:grid-cols-[36px_repeat(7,minmax(0,1fr))] gap-1 mb-1" role="row">
            <span className="text-[11px] font-semibold text-ink-mute flex items-center justify-center tabular" title={`Semana ${gw} da gestação`}>{gw >= 0 && gw <= 42 ? gw : ''}</span>
            {days.map(d => {
              const iso = toISODate(d);
              const list = events.get(iso) ?? [];
              const rec = records.get(iso);
              const inMonth = d.getMonth() === month;
              const isToday = iso === todayIso;
              const isSelected = iso === selected;
              const major = list.find(e => e.kind === 'marco' && e.major);
              const moods = checkins.filter(c => c.day === iso);
              return (
                <button
                  key={iso}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} ${list.length === 1 ? 'evento' : 'eventos'}` : ''}${rec ? ', com registro de saúde' : ''}${moodsText(moods, nameOf)}`}
                  onClick={() => onSelect(iso)}
                  className={`relative min-w-0 min-h-14 md:min-h-24 rounded-xl p-0.5 md:p-1.5 text-left flex flex-col gap-1 transition border ${isSelected ? 'border-brand bg-brand-soft/60' : 'border-transparent hover:bg-surface-2'} ${inMonth ? '' : 'opacity-45'}`}
                >
                  <span className="flex items-center justify-between gap-0.5">
                    <span className={`text-xs md:text-sm font-semibold tabular w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${isToday ? 'bg-brand text-on-accent' : 'text-ink'}`}>{d.getDate()}</span>
                    {rec && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full border-2 ${rec.bpHigh ? 'bg-alert border-alert' : ''}`}
                        style={rec.bpHigh ? undefined : { borderColor: `var(--c-int-${Math.max(1, rec.maxIntensity)})` }}
                        aria-hidden
                      />
                    )}
                  </span>
                  {major && <span className="hidden md:block text-[10px] font-semibold text-warm leading-tight truncate">{major.title}</span>}
                  {/* Celular: pontos. Computador: os primeiros títulos. */}
                  <span className="flex flex-wrap gap-0.5 md:hidden">
                    {list.slice(0, 4).map(e => <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${dotClass(e)}`} />)}
                  </span>
                  <span className="hidden md:flex flex-col gap-0.5 min-w-0">
                    {list.filter(e => e !== major).slice(0, 2).map(e => (
                      <span key={e.id} className={`text-[11px] leading-tight px-1.5 py-0.5 rounded-md truncate ${e.overdue ? 'bg-alert-soft text-alert' : KIND_STYLE[e.kind]} ${e.done ? 'line-through opacity-60' : ''}`}>
                        {e.time && <span className="font-semibold">{e.time} </span>}
                        {e.title}
                      </span>
                    ))}
                    {list.filter(e => e !== major).length > 2 && <span className="text-[10px] text-ink-mute">+{list.filter(e => e !== major).length - 2}</span>}
                  </span>
                  <MoodDots list={moods} />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ days, todayIso, selected, onSelect, events, records, checkins, onToggleTask, onOpen, onOpenCelebration }: { days: Date[]; todayIso: string; selected: string; onSelect: (d: string) => void; events: Map<string, CalendarEvent[]>; records: Map<string, DayRecords>; checkins: Checkin[]; onToggleTask: (id: string) => void; onOpen: OpenTarget; onOpenCelebration?: (id: string) => void }) {
  return (
    <ol className="divide-y divide-line">
      {days.map(d => {
        const iso = toISODate(d);
        const list = events.get(iso) ?? [];
        const rec = records.get(iso);
        const isToday = iso === todayIso;
        return (
          <li key={iso}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(iso)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(iso)}
              className={`w-full flex gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${iso === selected ? 'bg-brand-soft/60' : 'hover:bg-surface-2'}`}
            >
              <div className="w-12 shrink-0 text-center">
                <p className="text-xs font-semibold text-ink-mute ">{WEEKDAYS[d.getDay()]}</p>
                <p className={`mx-auto mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-lg font-semibold tabular ${isToday ? 'bg-brand text-on-accent' : 'text-ink'}`}>{d.getDate()}</p>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 py-1">
                {list.length === 0 && !rec && <p className="text-sm text-ink-mute">Nada marcado</p>}
                {list.map(e => <EventLine key={e.id} event={e} onToggleTask={onToggleTask} onOpen={onOpen} onOpenCelebration={onOpenCelebration} />)}
                {rec && <RecordLine records={rec} />}
                <DayMoods list={checkins.filter(c => c.day === iso)} compact />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const OPENS: Partial<Record<CalendarEvent['kind'], DetailTarget['kind'] | 'exam'>> = { consulta: 'consultation', exame: 'exam', tarefa: 'task', momento: 'entry' };

function EventLine({ event: e, onToggleTask, onOpen, onOpenCelebration }: { event: CalendarEvent; onToggleTask?: (id: string) => void; onOpen?: OpenTarget; onOpenCelebration?: (id: string) => void }) {
  const opens = onOpen && e.sourceId ? OPENS[e.kind] : undefined;
  const party = e.kind === 'celebracao' && e.sourceId && onOpenCelebration ? () => onOpenCelebration(e.sourceId!) : undefined;
  const icon =
    e.kind === 'celebracao' ? (e.major ? <PartyPopper className="w-4 h-4 text-rosa" /> : <CheckCircle2 className={`w-4 h-4 ${e.done ? 'text-ok' : e.overdue ? 'text-alert' : 'text-rosa'}`} />) : e.kind === 'consulta' ? (e.appointment && e.appointment !== 'consulta' ? <AppointmentIcon kind={e.appointment} className="w-4 h-4 text-brand" /> : <Stethoscope className="w-4 h-4 text-brand" />) : e.kind === 'exame' ? <FileCheck2 className="w-4 h-4 text-verde" /> : e.kind === 'marco' ? <Flag className="w-4 h-4 text-warm" /> : e.kind === 'momento' ? (e.reminder ? <Bell className="w-4 h-4 text-casal" /> : <Heart className="w-4 h-4 text-casal" />) : e.overdue ? <AlertTriangle className="w-4 h-4 text-alert" /> : <CheckCircle2 className={`w-4 h-4 ${e.done ? 'text-ok' : 'text-ink-mute'}`} />;
  return (
    <div className="flex items-start gap-2 text-sm">
      {e.kind === 'tarefa' && onToggleTask && e.sourceId ? (
        <button
          onClick={ev => {
            ev.stopPropagation();
            onToggleTask(e.sourceId!);
          }}
          aria-label={e.done ? `Reabrir "${e.title}"` : `Concluir "${e.title}"`}
          className="mt-0.5 shrink-0"
        >
          {icon}
        </button>
      ) : (
        <span className="mt-0.5 shrink-0">{icon}</span>
      )}
      {party ? (
        <button type="button" onClick={party} className={`min-w-0 text-left hover:underline underline-offset-2 ${e.done ? 'line-through text-ink-mute' : 'text-ink'}`}>
          <EventText event={e} />
        </button>
      ) : opens ? (
        <button type="button" onClick={() => onOpen!({ kind: opens, id: e.sourceId! } as DetailTarget | { kind: 'exam'; id: string })} className={`min-w-0 text-left hover:underline underline-offset-2 ${e.done ? 'line-through text-ink-mute' : 'text-ink'}`}>
          <EventText event={e} />
        </button>
      ) : (
        <span className={`min-w-0 ${e.done ? 'line-through text-ink-mute' : 'text-ink'}`}>
          <EventText event={e} />
        </span>
      )}
    </div>
  );
}

function EventText({ event: e }: { event: CalendarEvent }) {
  return (
    <>
      {e.time && <strong className="tabular">{e.time} · </strong>}
      <span className="font-semibold">{e.title}</span>
      {e.overdue && <span className="text-alert font-semibold"> · atrasada</span>}
      {e.private && <span className="text-ink-mute font-normal"> · só você</span>}
      {e.detail && <span className="block text-xs text-ink-mute">{e.detail}</span>}
    </>
  );
}

function RecordLine({ records }: { records: DayRecords }) {
  const names = [...new Set(records.symptoms.map(s => s.symptom_name))];
  return (
    <div className="flex items-start gap-2 text-sm text-ink-soft">
      <NotebookPen className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--c-int-3)' }} />
      <span className="min-w-0">
        {names.length > 0 && <>{names.join(', ')}</>}
        {names.length > 0 && records.metrics.length > 0 && ' · '}
        {records.metrics.length > 0 && (
          <span className={records.bpHigh ? 'text-alert font-semibold' : ''}>
            {records.metrics.map(m => [m.weight_kg !== null && `${m.weight_kg.toLocaleString('pt-BR')} kg`, m.systolic_bp !== null && `${m.systolic_bp}/${m.diastolic_bp}`].filter(Boolean).join(' · ')).join('; ')}
          </span>
        )}
      </span>
    </div>
  );
}

/** "Como vocês estavam": o humor de cada um no dia. */
function DayMoods({ list, compact = false }: { list: Checkin[]; compact?: boolean }) {
  const nameOf = useNameOf();
  if (list.length === 0) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? 'text-xs text-ink-soft' : 'text-sm text-ink'}`} aria-label="Humor do dia">
      {!compact && <span className="font-semibold text-ink-soft">Como vocês estavam:</span>}
      {list.map(c => (
        <span key={c.author_role} className="inline-flex items-center gap-1">
          <MoodFace path={moodOf(c.mood).face} className={`w-4 h-4 ${MOOD_COLOR[c.mood].text}`} />
          {nameOf(c.author_role)}, {moodLabel(c.mood, c.author_role).toLowerCase()}
        </span>
      ))}
    </p>
  );
}

function DayPanel(props: {
  day: string;
  dumDate: string;
  todayIso: string;
  events: CalendarEvent[];
  records: DayRecords | undefined;
  /** Humor de cada um nesse dia. */
  checkins: Checkin[];
  consultations: Consultation[];
  tasks: PartnerTask[];
  busy: boolean;
  migrationPending: boolean;
  onCreateConsultation: (c: NewConsultation) => Promise<boolean>;
  onCreateTask: (t: NewTask) => Promise<boolean>;
  onToggleTask: (t: PartnerTask) => void;
  onNavigate: (tab: Tab) => void;
  onOpen: OpenTarget;
  onOpenCelebration?: (id: string) => void;
}) {
  const [adding, setAdding] = useState<'consulta' | 'tarefa' | null>(null);
  const date = parseLocalDate(props.day);
  const gw = gestationalWeekOf(props.dumDate, date);
  const isPast = daysBetween(parseLocalDate(props.todayIso), date) < 0;
  const isToday = props.day === props.todayIso;
  const consultationOf = (e: CalendarEvent) => props.consultations.find(c => c.id === e.sourceId);

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm text-ink-mute first-letter:uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'long' })}{isToday ? ' · hoje' : ''}</p>
        <h3 className="text-xl font-semibold text-ink">{date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
        {gw >= 0 && gw <= 42 && <Pill tone="warm">semana {gw} da gestação</Pill>}
      </div>

      {props.events.length === 0 && !props.records && props.checkins.length === 0 && <p className="text-sm text-ink-mute">Nada marcado neste dia.</p>}
      <DayMoods list={props.checkins} />

      {props.events.length > 0 && (
        <ul className="space-y-3">
          {props.events.map(e => {
            const c = e.kind === 'consulta' ? consultationOf(e) : undefined;
            return (
              <li key={e.id} className="space-y-1.5">
                <EventLine event={e} onToggleTask={id => { const t = props.tasks.find(x => x.id === id); if (t) props.onToggleTask(t); }} onOpen={props.onOpen} onOpenCelebration={props.onOpenCelebration} />
                {e.author && <span className="ml-6"><AuthorBadge role={e.author} prefix={e.kind === 'tarefa' ? 'Resp.:' : 'Por'} /></span>}
                {c && (
                  <a href={googleCalendarUrl(c)} target="_blank" rel="noopener noreferrer" className="ml-6 inline-flex items-center gap-1 text-xs font-semibold text-brand underline underline-offset-2">
                    <ExternalLink className="w-3 h-3" /> Adicionar ao Google Agenda
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {props.records && (
        <div className="rounded-2xl bg-surface-2 p-3 space-y-2">
          <p className="text-xs font-semibold text-ink-mute">Saúde</p>
          {props.records.symptoms.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink">{s.symptom_name}</span>
              <span className="flex items-center gap-2"><IntensityDots value={s.intensity} /><AuthorBadge role={s.created_by} /></span>
            </div>
          ))}
          {props.records.metrics.length > 0 && <RecordLine records={{ ...props.records, symptoms: [] }} />}
        </div>
      )}

      {adding === 'consulta' && (
        <ScheduleForm busy={props.busy} startOpen initialDate={props.day} onCreate={props.onCreateConsultation} onClose={() => setAdding(null)} />
      )}
      {adding === 'tarefa' && (
        <TaskForm
          selectedWeek={Math.max(FIRST_WEEK, gw)}
          busy={props.busy}
          initialDueDate={props.day}
          onCancel={() => setAdding(null)}
          onCreate={async t => {
            const ok = await props.onCreateTask({ ...t, week: Math.min(LAST_WEEK, Math.max(FIRST_WEEK, gw)) });
            if (ok) setAdding(null);
            return ok;
          }}
        />
      )}

      {adding === null && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!props.migrationPending && !isPast && (
            <Button tone="soft" onClick={() => setAdding('consulta')} className="!px-3 !py-2">
              <Stethoscope className="w-4 h-4" /> Agendar
            </Button>
          )}
          <Button tone="soft" onClick={() => setAdding('tarefa')} className="!px-3 !py-2">
            <ListPlus className="w-4 h-4" /> Tarefa
          </Button>
          {isToday && (
            <Button tone="ghost" onClick={() => props.onNavigate('diario')} className="!px-3 !py-2">
              <NotebookPen className="w-4 h-4" /> Registrar no diário
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
