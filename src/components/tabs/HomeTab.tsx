import { useContext, useEffect, useRef, useState } from 'react';
import { ArrowRight, Footprints, HandHeart, Pencil, Route, Siren } from 'lucide-react';
import { weekInfo } from '../../content/weeks';
import { WEEK_CARDS_SOURCE, weekCards } from '../../content/weekCards';
import { ALERT_SIGNS } from '../../content/symptomCatalog';
import { FIRST_WEEK, LAST_WEEK, daysBetween, parseLocalDate, parseTimestamp, toISODate, type GestationalAge } from '../../lib/dates';
import type { Checkin, ExamItem, Hug, JournalEntry, Mood, ThreadComment } from '../../hooks/useGestationData';
import type { DetailTarget } from '../../lib/details';
import { phaseOf } from '../../lib/journey';
import type { PlanItem } from '../../content/prenatalPlan';
import { gestationMonth } from '../../lib/ficha';
import { appointmentTitle } from '../../lib/appointments';
import { buildUpcoming } from '../../lib/upcoming';
import type { Insight } from '../../lib/symptoms';
import type { Author, Consultation, HealthMetric, PartnerTask, SymptomItem } from '../../types';
import BrandMark from '../BrandMark';
import CheckIn from '../CheckIn';
import { DumForm } from '../DumForm';
import PushPrompt from '../PushPrompt';
import BellyCard from '../home/BellyCard';
import QuickHealth from '../home/QuickHealth';
import WeekSummaryCard from '../home/WeekSummaryCard';
import { showsWeekSummary, weekSummary } from '../../lib/weekSummary';
import type { NewMetric } from '../forms/RecordForms';
import { Card, LinkButton, SectionTitle } from '../ui';
import { InsightList } from '../InsightList';
import { Row } from './UpcomingTab';
import { MilestoneBar, NextAppointment, SharedTasks } from '../home/CoupleCards';
import { lastSeen, partnerNews } from '../../lib/news';
import { mentionsMe } from '../../lib/mentions';
import { PeopleContext } from '../../lib/people';

/** Para onde o Início leva (abas e partes delas). */
export type HomeTarget = 'diario' | 'mural' | 'humor' | 'barriga' | 'medidas' | 'saude' | 'graficos' | 'jornada' | 'tarefas' | 'exames' | 'agenda';

interface Props {
  age: GestationalAge;
  dumDate: string;
  selectedWeek: number;
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  onSaveDum: (iso: string) => Promise<boolean>;
  insights: Insight[];
  role: Author;
  /** Primeiro nome da outra pessoa do espaço (se já entrou). */
  partnerName: string | null;
  consultations: Consultation[];
  tasks: PartnerTask[];
  journal: JournalEntry[];
  exams: ExamItem[];
  checkins: Checkin[];
  checkinAvailable: boolean;
  hugs: Hug[];
  threads: ThreadComment[];
  /** Quem está logado (as novidades contam desde a última visita dele ao Diário). */
  userId: string;
  busy: boolean;
  onCheckin: (mood: Mood | null) => Promise<boolean>;
  onHug: () => Promise<boolean>;
  /** Contar o humor no Mural (registro do dia a dia). */
  onShareMood?: (text: string) => Promise<boolean>;
  onToggleTask: (t: PartnerTask) => void;
  onOpen: (target: HomeTarget, planItem?: string) => void;
  /** Abre os detalhes de um agendamento, tarefa ou registro do diário. */
  onOpenDetail: (target: DetailTarget) => void;
  /** Guardar o resultado de um exame que já aconteceu. */
  onResult: (c: Consultation) => void;
  /** Escrever no diário (dia sem compromisso). */
  onWrite: () => void;
  /** Itens da jornada com a janela já fechada, sem data e sem marcação (Agenda → Jornada). */
  lateSteps: PlanItem[];
  /** Diário com fotos (migrações 008 e 012): o cartão da barriguinha da semana. */
  bellyAvailable: boolean;
  onBellyPhoto: () => void;
  /** Saúde rápida: peso e pressão de um toque. */
  metrics: HealthMetric[];
  symptoms: SymptomItem[];
  preWeightKg: number | null;
  onSaveMetric: (m: NewMetric) => Promise<boolean>;
}

/** Anel da gestação (40 semanas) com o coração batendo no centro e ondas saindo dele. */
function WeekHeart({ week }: { week: number }) {
  const r = 92;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, week / 40);
  return (
    <div className="relative w-full max-w-[210px] aspect-square mx-auto">
      <div className="tt-onda absolute inset-0 rounded-full border-2 border-rosa/60" aria-hidden />
      <div className="tt-onda-2 absolute inset-0 rounded-full border-2 border-azul/50" aria-hidden />
      <svg viewBox="0 0 210 210" className="absolute inset-0 w-full h-full -rotate-90" role="img" aria-label={`Semana ${week} de 40`}>
        <defs>
          <linearGradient id="anel-semana" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ff7fa0" />
            <stop offset="1" stopColor="#2f84d6" />
          </linearGradient>
        </defs>
        <circle cx="105" cy="105" r={r} fill="none" strokeWidth="12" style={{ stroke: 'var(--c-surface-2)' }} />
        <circle cx="105" cy="105" r={r} fill="none" strokeWidth="12" strokeLinecap="round" stroke="url(#anel-semana)" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <BrandMark animated className="w-14 h-14" />
        <span className="font-display text-[2.75rem] leading-none text-ink tabular font-semibold">{week}</span>
        <span className="text-[13px] font-semibold text-ink-mute">semanas</span>
      </div>
    </div>
  );
}

/** Semanas para deslizar: a escolhida fica no centro, a atual com contorno. */
function WeekStrip({ selected, current, onSelect }: { selected: number; current: number; onSelect: (w: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Centraliza a semana escolhida rolando só a faixa (scrollIntoView rolava a página inteira ao trocar de aba).
  const first = useRef(true);
  useEffect(() => {
    const strip = ref.current;
    const el = strip?.querySelector<HTMLElement>(`[data-semana="${selected}"]`);
    if (!strip || !el) return;
    strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2, behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
  }, [selected]);
  const weeks = Array.from({ length: LAST_WEEK - FIRST_WEEK + 1 }, (_, i) => FIRST_WEEK + i);
  return (
    <div ref={ref} className="relative -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar py-1" role="group" aria-label="Escolher semana">
      {weeks.map(w => {
        const on = w === selected;
        return (
          <button
            key={w}
            type="button"
            data-semana={w}
            onClick={() => onSelect(w)}
            aria-pressed={on}
            aria-label={w === current ? `Semana ${w} (atual)` : `Semana ${w}`}
            className={`shrink-0 w-11 h-11 rounded-full text-[15px] font-extrabold tabular transition ${on ? 'bg-ink text-canvas' : w === current ? 'bg-surface text-ink ring-2 ring-rosa' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
          >
            {w}
          </button>
        );
      })}
    </div>
  );
}

export default function HomeTab(props: Props) {
  const { age, selectedWeek, currentWeek, onSelectWeek, insights, onOpen } = props;
  const [editingDum, setEditingDum] = useState(false);
  const info = weekInfo(selectedWeek);
  const now = new Date();
  const todayIso = toISODate(now);
  const alerts = insights.filter(i => i.tone === 'alerta');
  const phase = phaseOf(currentWeek);
  const cards = weekCards(selectedWeek);
  const dayOfPregnancy = daysBetween(parseLocalDate(props.dumDate), parseLocalDate(todayIso)) + 1;

  const up = buildUpcoming({ consultations: props.consultations, tasks: props.tasks, journal: props.journal, exams: props.exams, today: now });
  const lateSteps = props.lateSteps;
  const members = useContext(PeopleContext);
  const summaryRoles = (['mae', 'pai'] as const).filter(r => members.some(m => m.role === r) || props.checkins.some(c => c.author_role === r));
  // A última visita ao Diário, lida uma vez ao abrir o Início.
  const [since] = useState(() => lastSeen(props.userId));
  const news = partnerNews(props.journal, props.threads, members, since);
  // Os 2 últimos posts do Mural (dos dois, da última semana) entram no "Vocês dois hoje".
  const newIds = new Set(news.entries.map(e => e.id));
  const posts = props.journal
    .filter(e => e.visibility !== 'private' && daysBetween(parseLocalDate(e.entry_date), parseLocalDate(todayIso)) <= 7)
    .slice(0, 2)
    .map(entry => ({ entry, isNew: newIds.has(entry.id), mentionsMe: !entry.mine && mentionsMe(members, entry.body) }));
  // O próximo agendamento já aparece em destaque: não se repete nas listas abaixo.
  const nextId = props.consultations
    .filter(c => parseTimestamp(c.scheduled_at) >= now)
    .sort((a, b) => parseTimestamp(a.scheduled_at).getTime() - parseTimestamp(b.scheduled_at).getTime())[0]?.id;
  const todayItems = up.today.filter(i => i.consultation?.id !== nextId);
  const weekItems = up.week.filter(i => i.consultation?.id !== nextId);
  const partnerToday = props.checkins.some(c => !c.mine && c.day === todayIso) || props.journal.some(e => !e.mine && e.created_at && toISODate(parseTimestamp(e.created_at)) === todayIso);
  const pending = [
    lateSteps.length > 0 && { id: 'jornada', text: `${lateSteps.length} ${lateSteps.length === 1 ? 'item da jornada' : 'itens da jornada'} para conferir: ${lateSteps.slice(0, 2).map(s => s.short).join(', ')}`, go: () => onOpen('jornada') },
    up.missingResults.length > 0 && { id: 'resultados', text: `${up.missingResults.length === 1 ? 'Falta guardar 1 resultado' : `Faltam guardar ${up.missingResults.length} resultados`}: ${appointmentTitle(up.missingResults[0])}`, go: () => props.onResult(up.missingResults[0]) },
  ].filter(Boolean) as Array<{ id: string; text: string; go: () => void }>;

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <Card tone="alert">
          <SectionTitle icon={<Siren className="w-5 h-5 text-alert" />} title="Atenção" />
          <InsightList insights={alerts} />
        </Card>
      )}

      <p className="-mt-2 px-1 text-sm text-ink-soft first-letter:uppercase">
        {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        {props.partnerName && partnerToday && <> · {props.partnerName} já passou por aqui hoje</>}
      </p>

      <section aria-label="Semana da gestação" className="rounded-[32px] bg-surface shadow-soft px-5 pt-6 pb-5 overflow-hidden">
        <WeekHeart week={selectedWeek} />
        <div className="text-center mt-4 space-y-1">
          <p className="text-[13px] font-extrabold tracking-wide uppercase text-rosa">
            {info.trimester}º trimestre · {gestationMonth(selectedWeek)}º mês{selectedWeek !== currentWeek && ' · outra semana'}
          </p>
          <h2 className="text-[1.5rem] leading-snug text-ink text-balance">Do tamanho de {info.fruit}</h2>
          <p className="text-sm text-ink-soft tabular">
            {info.size} · {info.weight}
          </p>
          <p className="text-[15px] text-ink pt-2 text-balance">{info.milestone}</p>
        </div>

        <div className="mt-5">
          <WeekStrip selected={selectedWeek} current={currentWeek} onSelect={onSelectWeek} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <span className="tabular">
            {age.daysToDpp >= 0 ? (
              <>
                Dia <strong className="text-ink">{dayOfPregnancy}</strong> de 280 · faltam <strong className="text-ink">{age.daysToDpp} dias</strong>
              </>
            ) : (
              <>DPP foi em {age.dpp.toLocaleDateString('pt-BR')}</>
            )}
          </span>
          <span className="flex items-center gap-1">
            {selectedWeek !== currentWeek && <LinkButton onClick={() => onSelectWeek(currentWeek)}>Voltar para hoje</LinkButton>}
            <button onClick={() => setEditingDum(v => !v)} aria-label="Alterar a DUM" className="w-9 h-9 rounded-full hover:bg-surface-2 text-ink-mute flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </button>
          </span>
        </div>
        {selectedWeek === currentWeek && age.daysToDpp >= 0 && (
          <div className="mt-4">
            <MilestoneBar dumDate={props.dumDate} todayIso={todayIso} />
          </div>
        )}
        {editingDum && (
          <div className="mt-3">
            <DumForm
              initial={props.dumDate}
              onCancel={() => setEditingDum(false)}
              onSave={async iso => {
                if (await props.onSaveDum(iso)) setEditingDum(false);
              }}
            />
          </div>
        )}
        {age.isPostTerm && <p className="mt-3 text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">Vocês passaram das 40 semanas. Combinem com o obstetra a frequência das avaliações a partir de agora.</p>}
      </section>

      {todayItems.length > 0 && (
        <section aria-labelledby="hoje-titulo" className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 id="hoje-titulo" className="text-[1.3rem] text-ink">Hoje</h2>
            <span className="text-sm text-ink-mute">{todayItems.length === 1 ? '1 item' : `${todayItems.length} itens`}</span>
          </div>
          {todayItems.map(i => (
            <Row key={i.id} item={i} today onOpen={() => props.onOpenDetail(i.consultation ? { kind: 'consultation', id: i.consultation.id } : i.task ? { kind: 'task', id: i.task.id } : { kind: 'entry', id: i.entry!.id })} />
          ))}
        </section>
      )}

      {pending.length > 0 && (
        <section aria-label="Para não esquecer" className="rounded-[24px] bg-surface shadow-soft p-4 space-y-1">
          <h2 className="text-sm font-extrabold text-ink font-sans">Para não esquecer</h2>
          {pending.map(p => (
            <button key={p.id} type="button" onClick={p.go} className="w-full flex items-center justify-between gap-3 py-2 text-left text-sm text-ink-soft hover:text-ink">
              <span className="min-w-0">{p.text}</span>
              <ArrowRight className="w-4 h-4 shrink-0 text-ink-mute" />
            </button>
          ))}
        </section>
      )}

      {showsWeekSummary(now) && (
        <WeekSummaryCard
          summary={weekSummary({ today: now, roles: summaryRoles, checkins: props.checkins, journal: props.journal, consultations: props.consultations, tasks: props.tasks, symptoms: props.symptoms })}
          week={currentWeek}
          onMood={() => onOpen('humor')}
          onMural={() => onOpen('mural')}
        />
      )}

      {props.checkinAvailable && <CheckIn role={props.role} checkins={props.checkins} hugs={props.hugs} onCheckin={props.onCheckin} onHug={props.onHug} onShare={props.onShareMood} onMonth={() => onOpen('humor')} posts={posts} onOpenEntry={id => props.onOpenDetail({ kind: 'entry', id })} onMural={() => onOpen('mural')} />}

      <QuickHealth metrics={props.metrics} preWeightKg={props.preWeightKg} busy={props.busy} onSave={props.onSaveMetric} onMore={() => onOpen('medidas')} />

      {props.bellyAvailable && <BellyCard journal={props.journal} dumDate={props.dumDate} currentWeek={currentWeek} onPhoto={props.onBellyPhoto} onOpenEntry={id => props.onOpenDetail({ kind: 'entry', id })} onAll={() => onOpen('barriga')} />}

      <NextAppointment consultations={props.consultations} onOpen={c => props.onOpenDetail({ kind: 'consultation', id: c.id })} onSchedule={() => onOpen('agenda')} />

      {weekItems.length > 0 && (
        <section aria-labelledby="semana-titulo" className="rounded-[28px] bg-surface shadow-soft p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="semana-titulo" className="text-[1.2rem] text-ink">Nos próximos 7 dias</h2>
            <LinkButton onClick={() => onOpen('agenda')}>Ver a agenda</LinkButton>
          </div>
          <ul className="space-y-2.5">
            {weekItems.slice(0, 4).map(i => {
              const d = parseLocalDate(i.day);
              return (
                <li key={i.id} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 rounded-2xl bg-surface-2 py-1.5 text-center leading-tight">
                    <span className="block text-[11px] font-extrabold uppercase text-ink-mute">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    <span className="block font-display text-[1.1rem] font-semibold text-ink tabular">{d.getDate()}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-ink truncate">{i.title}</span>
                    <span className="block text-xs text-ink-mute truncate">
                      {i.label}
                      {i.time && ` · ${i.time}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {weekItems.length > 4 && <p className="text-xs text-ink-mute">e mais {weekItems.length - 4} na agenda.</p>}
        </section>
      )}

      <SharedTasks tasks={props.tasks} role={props.role} onToggle={props.onToggleTask} onOpenTask={t => props.onOpenDetail({ kind: 'task', id: t.id })} onAll={() => onOpen('tarefas')} />

      <PushPrompt />

      <section aria-labelledby="nesta-semana" className="space-y-2.5">
        <h2 id="nesta-semana" className="px-1 text-[1.3rem] text-ink">
          {selectedWeek === currentWeek ? 'Nesta semana' : `Na semana ${selectedWeek}`}
        </h2>
        <ul className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
          <WeekCard tone="bg-coral-soft" label="Seu corpo" labelTone="text-coral-strong" icon={<Footprints />} title={cards.body.title} text={cards.body.text} />
          <WeekCard tone="bg-azul-soft" label="Para o pai" labelTone="text-azul-strong" icon={<HandHeart />} title={cards.partner.title} text={cards.partner.text} />
          <WeekCard tone="bg-verde-soft" label={`Fase: ${phase.title}`} labelTone="text-verde-strong" icon={<Route />} title={phase.visits} text={phase.focus} onClick={() => onOpen('jornada')} />
        </ul>
        <p className="px-1 text-[11px] text-ink-mute">Referência: {WEEK_CARDS_SOURCE}. Cada gestação é única.</p>
      </section>

      <details className="rounded-[28px] bg-surface shadow-soft p-5 md:p-6 group">
        <summary className="cursor-pointer font-semibold text-ink flex items-center gap-2 list-none">
          <Siren className="w-5 h-5 text-alert" /> Quando procurar a maternidade
          <span className="ml-auto text-sm font-bold text-brand-strong group-open:hidden">Ver</span>
        </summary>
        <p className="text-sm text-ink-soft mt-3">Procurem atendimento sem esperar a próxima consulta se aparecer:</p>
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-ink">
          {ALERT_SIGNS.map(s => <li key={s} className="flex gap-2"><span className="text-alert">•</span>{s}</li>)}
        </ul>
      </details>
    </div>
  );
}

function WeekCard({ tone, label, labelTone, icon, title, text, onClick }: { tone: string; label: string; labelTone: string; icon: React.ReactNode; title: string; text: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide [&_svg]:w-4 [&_svg]:h-4 ${labelTone}`}>
        {icon} {label}
      </span>
      <span className="block font-display text-[1.1rem] leading-snug text-ink">{title}</span>
      <span className="block text-sm text-ink-soft">{text}</span>
    </>
  );
  return (
    <li className={`snap-start shrink-0 w-[72%] max-w-[250px] rounded-[24px] ${tone}`}>
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full h-full text-left p-4 flex flex-col gap-2">
          {inner}
        </button>
      ) : (
        <div className="p-4 flex flex-col gap-2 h-full">{inner}</div>
      )}
    </li>
  );
}
