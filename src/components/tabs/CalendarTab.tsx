import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, FileCheck2, CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, Flag, Heart, ListPlus, NotebookPen, PartyPopper, Stethoscope } from 'lucide-react';
import { CALENDAR_FILTERS, buildCalendar, dayDots, gestationDay, gestationMonths, gestationalWeekDays, gestationalWeekOf, googleCalendarUrl, matchesFilter, toIcs, type CalendarEvent, type CalendarFilter, type CalendarMoment, type CalendarResult, type DayRecords, type GestationDay } from '../../lib/calendar';
import { FIRST_WEEK, LAST_WEEK, daysBetween, parseLocalDate, toISODate } from '../../lib/dates';
import type { Consultation, HealthMetric, PartnerTask, SymptomItem, Tab } from '../../types';
import AuthorBadge from '../AuthorBadge';
import MoodFace from '../MoodFace';
import type { Checkin } from '../../hooks/useGestationData';
import { MOOD_COLOR, moodLabel, moodOf } from '../../lib/moods';
import { PeopleContext, firstName, memberWithRole } from '../../lib/people';
import IntensityDots from '../IntensityDots';
import { Button, Card, Segmented } from '../ui';
import type { DetailTarget } from '../../lib/details';
import { ScheduleForm, type NewConsultation } from './ConsultationsTab';
import AppointmentIcon from '../AppointmentIcon';
import { TaskForm, type NewTask } from './TasksTab';
import type { Celebration } from '../../lib/celebrations';
import Sheet from '../Sheet';
import BabyArt from '../BabyArt';
import { weekInfo } from '../../content/weeks';
import { gestationMonth } from '../../lib/ficha';

// O calendário do Tumtum: o lugar de tudo o que tem data, sem virar uma salada.
// Três jeitos de ver: o Mês (rolando de um mês para o outro, como uma agenda de
// papel), a Semana da gestação e o Ano inteiro. A gestação aparece como uma
// faixa suave na cor de cada trimestre, com o número da semana no dia em que
// ela começa e um coração na data provável do parto. Cada dia mostra só um
// ponto por tipo (no máximo três) e os filtros deixam ver uma coisa de cada
// vez. Tocar num dia abre a folha dele: como estava a gestação, o bebê, o que
// estava marcado, a saúde, o humor e os atalhos para agendar ou criar tarefa.

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
  /** Humor de cada um (check-in do dia): tracinhos no pé do dia e linha na folha do dia. */
  checkins: Checkin[];
  /** Celebrações (chá de bebê...): o dia da festa e os prazos das tarefas. */
  celebrations?: Celebration[] | null;
  onOpenCelebration?: (id: string) => void;
  /** Um dia para abrir já de cara (o atalho do Início). */
  focusDay?: string | null;
  onFocusUsed?: () => void;
}

/** O que um evento abre: os detalhes (agendamento, tarefa, momento) ou o resultado guardado. */
export type OpenTarget = (target: DetailTarget | { kind: 'exam'; id: string }) => void;

type View = 'mes' | 'semana' | 'ano';
const VIEW_KEY = 'tumtum-calendario-vista';
const FILTER_KEY = 'tumtum-calendario-filtro';
const remembered = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: só não lembra da escolha */
  }
};

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEK_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
/** As cores de cada trimestre: rosa, lilás e azul, como a barra da gestação no Início. */
const TRI_BAND = { 1: 'bg-rosa-soft', 2: 'bg-lilas-soft', 3: 'bg-azul-soft' } as const;
const TRI_TEXT = { 1: 'text-rosa-strong', 2: 'text-lilas-strong', 3: 'text-azul-strong' } as const;
const TRI_DOT = { 1: 'bg-rosa', 2: 'bg-lilas', 3: 'bg-azul' } as const;
const monthKey = (iso: string) => iso.slice(0, 7);
const keyOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;
const monthName = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long' });
/** Dentro da faixa da gestação (da DUM à data provável do parto). */
const inBand = (g: GestationDay | null): g is GestationDay => !!g && g.daysToDpp >= 0;

export default function CalendarTab(props: Props) {
  const today = parseLocalDate(toISODate(new Date()));
  const todayIso = toISODate(today);
  const [view, setViewState] = useState<View>(() => (props.focusDay ? 'mes' : remembered(VIEW_KEY, ['mes', 'semana', 'ano'] as const, 'mes')));
  const [filter, setFilterState] = useState<CalendarFilter>(() => remembered(FILTER_KEY, CALENDAR_FILTERS.map(f => f.id), 'tudo'));
  const [week, setWeek] = useState(props.currentWeek);
  const [openDay, setOpenDay] = useState<string | null>(props.focusDay ?? null);
  // Para onde o Mês rola: o mês de hoje (ou do dia pedido) ao abrir; "Hoje" e o Ano mudam o alvo.
  const [target, setTarget] = useState(() => ({ key: monthKey(props.focusDay ?? todayIso), smooth: false, n: 0 }));
  const focusUsed = useRef(props.onFocusUsed);
  useEffect(() => {
    focusUsed.current?.();
  }, []);

  const setView = (v: View) => {
    setViewState(v);
    remember(VIEW_KEY, v);
  };
  const setFilter = (f: CalendarFilter) => {
    setFilterState(f);
    remember(FILTER_KEY, f);
  };
  const goMonth = (key: string, smooth: boolean) => {
    setView('mes');
    setTarget(t => ({ key, smooth, n: t.n + 1 }));
  };

  const cal = buildCalendar({ dumDate: props.dumDate, consultations: props.consultations, results: props.results, tasks: props.tasks, symptoms: props.symptoms, metrics: props.metrics, journal: props.journal, celebrations: props.celebrations, today });
  const months = gestationMonths(props.dumDate, today);

  const goToday = () => {
    setWeek(props.currentWeek);
    if (view === 'semana') return;
    goMonth(monthKey(todayIso), true);
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

  const weekDays = gestationalWeekDays(props.dumDate, week);
  const weekLabel = `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  // Abrir algo a partir da folha do dia fecha a folha (os detalhes abrem por cima, sem duas janelas).
  const fromSheet = <A extends unknown[]>(fn: ((...a: A) => void) | undefined) => (fn ? (...a: A) => (setOpenDay(null), fn(...a)) : undefined);
  const onToggleTaskId = (id: string) => {
    const t = props.tasks.find(x => x.id === id);
    if (t) props.onToggleTask(t);
  };

  return (
    <div className="space-y-4">
      {/* A barra do calendário fica parada no alto; só os meses rolam, dentro do próprio espaço (as abas da Agenda continuam à vista). */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Segmented label="Visualização" size="sm" value={view} onChange={setView} options={[{ value: 'mes', label: 'Mês' }, { value: 'semana', label: 'Semana' }, { value: 'ano', label: 'Ano' }]} />
          <button type="button" onClick={goToday} className="inline-flex items-center gap-1.5 rounded-full bg-surface shadow-soft px-3.5 py-1.5 text-[13px] font-bold text-brand-strong">
            <CalendarDays className="w-4 h-4" strokeWidth={1.75} /> Hoje
          </button>
        </div>
        <FilterChips value={filter} onChange={setFilter} />
      </div>

      {view === 'mes' && <MonthsView months={months} target={target} dumDate={props.dumDate} todayIso={todayIso} openDay={openDay} onSelect={setOpenDay} events={cal.events} records={cal.records} checkins={props.checkins} filter={filter} footer={<ExportButton onClick={exportIcs} />} />}

      {view === 'ano' && <YearView target={target} months={months} dumDate={props.dumDate} todayIso={todayIso} events={cal.events} records={cal.records} filter={filter} onDay={setOpenDay} onMonth={key => goMonth(key, false)} footer={<ExportButton onClick={exportIcs} />} />}

      {view === 'semana' && (
        <section className="space-y-3" aria-label="Semana da gestação">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setWeek(w => Math.max(FIRST_WEEK, w - 1))} aria-label="Semana anterior" className="w-9 h-9 rounded-full hover:bg-surface-2 text-ink-soft flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-[1.2rem] text-ink">Semana {week} da gestação</h2>
              <p className="text-sm text-ink-mute">{weekLabel}</p>
            </div>
            <button onClick={() => setWeek(w => Math.min(LAST_WEEK, w + 1))} aria-label="Próxima semana" className="w-9 h-9 rounded-full hover:bg-surface-2 text-ink-soft flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <Card className="!p-2 md:!p-3">
            <WeekView days={weekDays} todayIso={todayIso} selected={openDay ?? ''} onSelect={setOpenDay} events={filterEvents(cal.events, filter)} records={filter === 'tudo' || filter === 'saude' ? cal.records : new Map()} checkins={filter === 'tudo' || filter === 'saude' ? props.checkins : []} onToggleTask={onToggleTaskId} onOpen={props.onOpen} onOpenCelebration={props.onOpenCelebration} />
          </Card>
        </section>
      )}

      {view === 'semana' && <ExportButton onClick={exportIcs} />}

      {openDay && (
        <DaySheet
          key={openDay}
          day={openDay}
          dumDate={props.dumDate}
          todayIso={todayIso}
          events={cal.events.get(openDay) ?? []}
          records={cal.records.get(openDay)}
          checkins={props.checkins.filter(c => c.day === openDay)}
          consultations={props.consultations}
          tasks={props.tasks}
          busy={props.busy}
          migrationPending={props.migrationPending}
          onCreateConsultation={props.onCreateConsultation}
          onCreateTask={props.onCreateTask}
          onToggleTask={props.onToggleTask}
          onNavigate={fromSheet(props.onNavigate)!}
          onOpen={fromSheet(props.onOpen)!}
          onOpenCelebration={fromSheet(props.onOpenCelebration)}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

const filterEvents = (events: Map<string, CalendarEvent[]>, filter: CalendarFilter) => (filter === 'tudo' ? events : new Map([...events].map(([k, list]) => [k, list.filter(e => matchesFilter(e, filter))])));

/** Os filtros, numa fileira que corre para o lado: um de cada vez. */
function FilterChips({ value, onChange }: { value: CalendarFilter; onChange: (f: CalendarFilter) => void }) {
  return (
    <div role="group" aria-label="Filtrar o calendário" className="-mx-4 px-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CALENDAR_FILTERS.map(f => {
        const on = value === f.id;
        return (
          <button key={f.id} type="button" aria-pressed={on} onClick={() => onChange(f.id)} className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${on ? 'bg-ink text-surface' : 'bg-surface text-ink-soft shadow-soft'}`}>
            {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} aria-hidden />}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/** Humor do dia em tracinhos (mãe à esquerda, pai à direita), discretos para não disputar com os compromissos. */
function MoodDots({ list }: { list: Checkin[] }) {
  if (list.length === 0) return null;
  return (
    <span className="flex justify-center gap-0.5" aria-hidden>
      {(['mae', 'pai'] as const).map(r => {
        const c = list.find(x => x.author_role === r);
        return c ? <span key={r} className={`w-2 h-1 rounded-full ${MOOD_COLOR[c.mood].bg}`} /> : null;
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

const ageText = (g: GestationDay) => `${g.weeks} ${g.weeks === 1 ? 'semana' : 'semanas'}${g.days ? ` e ${g.days} ${g.days === 1 ? 'dia' : 'dias'}` : ''}`;

/**
 * O Mês: os meses da gestação um embaixo do outro, rolando sem botões (como
 * virar as páginas de uma agenda). Os dias da semana ficam presos no topo.
 */
function MonthsView({ months, target, footer, ...rest }: { months: Array<{ year: number; month: number }>; target: { key: string; smooth: boolean; n: number }; footer: React.ReactNode } & Omit<MonthProps, 'year' | 'month'>) {
  const box = useFillHeight();
  useLayoutEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`#mes-${target.key}`);
    // 30px: a linha dos dias da semana, presa no alto da caixa.
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - 30, behavior: target.smooth ? 'smooth' : 'auto' });
  }, [target, box]);
  return (
    <div ref={box} className="relative -mx-4 px-4 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Meses da gestação">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-1.5 bg-canvas/95 backdrop-blur grid grid-cols-7 text-center text-[11px] font-extrabold text-ink-mute" aria-hidden>
        {WEEK_LETTERS.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className="space-y-7 pt-1 pb-4">
        {months.map(m => (
          <MonthBlock key={keyOf(m.year, m.month)} year={m.year} month={m.month} {...rest} />
        ))}
        {footer}
      </div>
    </div>
  );
}

/**
 * A caixa que rola ocupa o resto da tela (entre a barra do calendário e o menu
 * de baixo). Assim a página não se move: o cabeçalho e as abas da Agenda ficam.
 */
function useFillHeight() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const bottom = window.innerWidth >= 768 ? 24 : 100;
      el.style.height = `${Math.max(320, window.innerHeight - top - bottom)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return ref;
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 rounded-[24px] bg-surface shadow-soft px-5 py-4 text-left hover:bg-surface-2 transition">
      <CalendarPlus className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-ink">Levar para a agenda do celular</span>
        <span className="block text-xs text-ink-mute">Consultas, prazos e marcos no Google Agenda ou no iPhone</span>
      </span>
      <Download className="w-4 h-4 text-ink-mute shrink-0" />
    </button>
  );
}

interface MonthProps {
  year: number;
  month: number;
  dumDate: string;
  todayIso: string;
  openDay: string | null;
  onSelect: (iso: string) => void;
  events: Map<string, CalendarEvent[]>;
  records: Map<string, DayRecords>;
  checkins: Checkin[];
  filter: CalendarFilter;
}

function MonthBlock({ year, month, dumDate, todayIso, openDay, onSelect, events, records, checkins, filter }: MonthProps) {
  const nameOf = useNameOf();
  const name = monthName(year, month);
  const total = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [...Array<null>(new Date(year, month, 1).getDay()).fill(null), ...Array.from({ length: total }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  // O subtítulo: que semanas da gestação o mês cobre (ou o mês do nascimento).
  const gs = cells.filter((d): d is Date => !!d).map(d => gestationDay(dumDate, toISODate(d))).filter(inBand);
  const sub = gs.some(g => g.isDpp) ? 'mês do nascimento' : gs.length ? `semanas ${gs[0].weeks} a ${gs[gs.length - 1].weeks} · ${gs[gs.length - 1].trimester}º trimestre` : '';
  const showHealth = filter === 'tudo' || filter === 'saude';

  return (
    <section id={`mes-${keyOf(year, month)}`} aria-label={`${name} de ${year}`} className="">
      <div className="flex items-baseline justify-between gap-2 px-1 mb-1.5">
        <h3 className="font-display text-[1.35rem] text-ink first-letter:uppercase">
          {name} <span className="text-[0.95rem] text-ink-mute">{year}</span>
        </h3>
        {sub && <span className="text-[12px] font-semibold text-ink-mute">{sub}</span>}
      </div>
      <div role="grid" aria-label={`Calendário de ${name} de ${year}`}>
        {rows.map((row, ri) => (
          <div key={ri} role="row" className="grid grid-cols-7">
            {row.map((d, ci) => {
              if (!d) return <span key={ci} role="presentation" />;
              const iso = toISODate(d);
              const g = gestationDay(dumDate, iso);
              const band = inBand(g);
              const prev = ci > 0 && row[ci - 1] ? inBand(gestationDay(dumDate, toISODate(row[ci - 1]!))) : false;
              const next = ci < 6 && row[ci + 1] ? inBand(gestationDay(dumDate, toISODate(row[ci + 1]!))) : false;
              const list = events.get(iso) ?? [];
              const shown = list.filter(e => matchesFilter(e, filter));
              const { dots, more } = dayDots(list, filter);
              const rec = showHealth ? records.get(iso) : undefined;
              const moods = showHealth ? checkins.filter(c => c.day === iso) : [];
              const isToday = iso === todayIso;
              const isOpen = iso === openDay;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  aria-selected={isOpen}
                  aria-label={`${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${isToday ? ', hoje' : ''}${band ? `, ${ageText(g)}` : ''}${g?.isDpp ? ', data provável do parto' : ''}${shown.length ? `, ${shown.length} ${shown.length === 1 ? 'evento' : 'eventos'}` : ''}${rec ? ', com registro de saúde' : ''}${moodsText(moods, nameOf)}`}
                  onClick={() => onSelect(iso)}
                  className="relative h-[3.9rem] flex flex-col items-center pt-1 outline-none group"
                >
                  {band && <span aria-hidden className={`absolute top-[43px] h-[2px] opacity-35 ${TRI_DOT[g.trimester]} ${prev ? 'left-0' : 'left-2 rounded-l-full'} ${next ? 'right-0' : 'right-2 rounded-r-full'}`} />}
                  <span
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold tabular transition group-focus-visible:ring-2 group-focus-visible:ring-brand ${
                      isToday ? 'bg-brand text-on-accent shadow-soft' : g?.isDpp ? 'bg-rosa text-white shadow-soft' : isOpen ? 'bg-surface text-ink ring-2 ring-brand' : 'text-ink group-hover:bg-surface/70'
                    }`}
                  >
                    {d.getDate()}
                    {g?.isDpp && <Heart className="absolute -top-1 -right-1 w-3.5 h-3.5 fill-rosa text-surface" aria-hidden />}
                  </span>
                  {band && g.weekStart && !isToday && !g.isDpp && <span className={`absolute top-0 left-1 text-[9px] font-bold leading-none opacity-70 ${TRI_TEXT[g.trimester]}`} aria-hidden>{g.weeks}s</span>}
                  <span className="mt-2 flex items-center gap-[3px] h-1.5" aria-hidden>
                    {dots.map(c => (
                      <span key={c} className={`w-1.5 h-1.5 rounded-full ${c}`} />
                    ))}
                    {more > 0 && <span className="w-1 h-1 rounded-full bg-ink-mute/50" />}
                    {rec && <span className={`w-1.5 h-1.5 rounded-full border ${rec.bpHigh ? 'bg-alert border-alert' : 'border-int-3'}`} />}
                  </span>
                  <span className="mt-0.5">
                    <MoodDots list={moods} />
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * O Ano: os doze meses de cada ano da gestação de uma vez, com os dias da
 * gestação na cor do trimestre, o coração na data provável e um pontinho onde
 * há algo marcado. Tocar no mês leva ao Mês; tocar no dia abre a folha dele.
 */
function YearView({ target, months, dumDate, todayIso, events, records, filter, onDay, onMonth, footer }: { target: { key: string; n: number }; months: Array<{ year: number; month: number }>; dumDate: string; todayIso: string; events: Map<string, CalendarEvent[]>; records: Map<string, DayRecords>; filter: CalendarFilter; onDay: (iso: string) => void; onMonth: (key: string) => void; footer: React.ReactNode }) {
  const years = [...new Set(months.map(m => m.year))];
  const showHealth = filter === 'tudo' || filter === 'saude';
  const box = useFillHeight();
  useLayoutEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-mes="${monthKey(todayIso)}"]`);
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 2 + el.offsetHeight / 2 });
  }, [target, box, todayIso]);
  return (
    <div ref={box} className="relative -mx-4 px-4 overflow-y-auto overscroll-contain space-y-8 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Anos da gestação">
      {years.map(year => (
        <section key={year} aria-label={`Ano de ${year}`} className="space-y-4">
          <h3 className="font-display text-[1.8rem] text-center text-ink">{year}</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 md:grid-cols-4 md:gap-x-4">
            {Array.from({ length: 12 }, (_, month) => {
              const total = new Date(year, month + 1, 0).getDate();
              const lead = new Date(year, month, 1).getDay();
              const isThisMonth = monthKey(todayIso) === keyOf(year, month);
              return (
                <div key={month} data-mes={keyOf(year, month)}>
                  <button type="button" onClick={() => onMonth(keyOf(year, month))} className={`w-full text-center text-[13px] mb-1 first-letter:uppercase ${isThisMonth ? 'font-extrabold text-ink' : 'font-bold text-ink-soft'}`}>
                    {monthName(year, month)}
                  </button>
                  <div className="grid grid-cols-7 gap-y-px text-center">
                    {Array.from({ length: lead }, (_, i) => (
                      <span key={`v${i}`} />
                    ))}
                    {Array.from({ length: total }, (_, i) => {
                      const iso = toISODate(new Date(year, month, i + 1));
                      const g = gestationDay(dumDate, iso);
                      const band = inBand(g);
                      const isToday = iso === todayIso;
                      const marked = dayDots(events.get(iso) ?? [], filter).dots.length > 0 || (showHealth && records.has(iso));
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => onDay(iso)}
                          aria-label={`${parseLocalDate(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}${g?.isDpp ? ', data provável do parto' : ''}`}
                          className={`relative mx-auto w-[18px] h-[18px] rounded-full text-[10px] min-[380px]:text-[10.5px] leading-[18px] tabular ${
                            isToday ? 'bg-brand text-on-accent font-extrabold' : g?.isDpp ? 'bg-rosa text-white font-extrabold' : band ? `${TRI_TEXT[g.trimester]} font-medium` : 'text-ink-mute/60'
                          }`}
                        >
                          {i + 1}
                          {marked && !isToday && <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-current" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft" aria-label="Legenda">
        {([1, 2, 3] as const).map(t => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${TRI_DOT[t]}`} /> {t}º trimestre
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <Heart className="w-3 h-3 fill-rosa text-rosa" /> Data provável do parto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-ink-soft" /> Algo marcado
        </span>
      </p>
      {footer}
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

/** O alto da folha do dia: como estava a gestação, na cor do trimestre, com o bebê daquela semana. */
function GestationCard({ dumDate, day }: { dumDate: string; day: string }) {
  const g = gestationDay(dumDate, day);
  if (!g) return <p className="rounded-[22px] bg-surface-2 px-4 py-3 text-[13.5px] text-ink-soft">{daysBetween(parseLocalDate(dumDate), parseLocalDate(day)) < 0 ? 'Antes do começo da gestação.' : 'Depois da gestação.'}</p>;
  const info = weekInfo(Math.min(LAST_WEEK, Math.max(FIRST_WEEK, g.weeks)));
  const toBirth = g.isDpp ? 'Data provável do parto' : g.daysToDpp > 0 ? `${g.daysToDpp} ${g.daysToDpp === 1 ? 'dia' : 'dias'} para o nascimento` : `${-g.daysToDpp} ${g.daysToDpp === -1 ? 'dia' : 'dias'} depois da data provável`;
  return (
    <section aria-label="A gestação neste dia" className={`rounded-[22px] ${TRI_BAND[g.trimester]} px-4 py-3 flex items-center gap-3`}>
      <BabyArt week={Math.min(LAST_WEEK, Math.max(FIRST_WEEK, g.weeks))} className="w-16 h-16 shrink-0" />
      <div className="min-w-0">
        <p className={`text-[11.5px] font-extrabold uppercase tracking-wide ${TRI_TEXT[g.trimester]}`}>
          {g.trimester}º trimestre · {gestationMonth(g.weeks)}º mês
        </p>
        <p className="font-display text-[1.3rem] leading-tight text-ink">{ageText(g)}</p>
        <p className="text-[12.5px] text-ink-soft">
          {g.isDpp && <Heart className="inline w-3.5 h-3.5 mr-1 -mt-0.5 fill-rosa text-rosa" />}
          {toBirth}
          {g.weeks >= FIRST_WEEK && ` · do tamanho de ${info.fruit}`}
        </p>
      </div>
    </section>
  );
}

/** A folha do dia: sobe de baixo ao tocar num dia, com tudo o que tem data nele (todos os tipos, sem filtro). */
function DaySheet(props: {
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
  onClose: () => void;
}) {
  const [adding, setAdding] = useState<'consulta' | 'tarefa' | null>(null);
  const date = parseLocalDate(props.day);
  const gw = gestationalWeekOf(props.dumDate, date);
  const isPast = daysBetween(parseLocalDate(props.todayIso), date) < 0;
  const isToday = props.day === props.todayIso;
  const consultationOf = (e: CalendarEvent) => props.consultations.find(c => c.id === e.sourceId);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });

  return (
    <Sheet title={date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} subtitle={<span className="first-letter:uppercase inline-block">{`${weekday}${isToday ? ' · hoje' : ''}`}</span>} onClose={props.onClose}>
      <div className="space-y-4">
        <GestationCard dumDate={props.dumDate} day={props.day} />

        {props.events.length === 0 && !props.records && props.checkins.length === 0 && <p className="text-sm text-ink-mute px-1">Nada marcado neste dia.</p>}
        <DayMoods list={props.checkins} />

        {props.events.length > 0 && (
          <ul className="space-y-3" aria-label="O que tem neste dia">
            {props.events.map(e => {
              const c = e.kind === 'consulta' ? consultationOf(e) : undefined;
              return (
                <li key={e.id} className="space-y-1.5">
                  <EventLine
                    event={e}
                    onToggleTask={id => {
                      const t = props.tasks.find(x => x.id === id);
                      if (t) props.onToggleTask(t);
                    }}
                    onOpen={props.onOpen}
                    onOpenCelebration={props.onOpenCelebration}
                  />
                  {e.author && (
                    <span className="ml-6">
                      <AuthorBadge role={e.author} prefix={e.kind === 'tarefa' ? 'Resp.:' : 'Por'} />
                    </span>
                  )}
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
                <span className="flex items-center gap-2">
                  <IntensityDots value={s.intensity} />
                  <AuthorBadge role={s.created_by} />
                </span>
              </div>
            ))}
            {props.records.metrics.length > 0 && <RecordLine records={{ ...props.records, symptoms: [] }} />}
          </div>
        )}

        {adding === 'consulta' && <ScheduleForm busy={props.busy} startOpen initialDate={props.day} onCreate={props.onCreateConsultation} onClose={() => setAdding(null)} />}
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
      </div>
    </Sheet>
  );
}
