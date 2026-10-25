import { useContext, useEffect, useState } from 'react';
import { Baby, BellRing, BookOpen, Camera, ChevronLeft, ChevronRight, ClipboardCheck, Flag, Footprints, HandHeart, ListChecks, NotebookPen, PartyPopper, Pencil, Route, Siren, Sparkles, Stethoscope, X } from 'lucide-react';
import { weekInfo } from '../../content/weeks';
import { WEEK_CARDS_SOURCE, weekCards } from '../../content/weekCards';
import { FIRST_WEEK, LAST_WEEK, daysBetween, parseLocalDate, parseTimestamp, toISODate, type GestationalAge } from '../../lib/dates';
import type { Checkin, ExamItem, Folder, Hug, JournalEntry, Mood, NameIdea, Reaction } from '../../hooks/useGestationData';
import type { DetailTarget } from '../../lib/details';
import { phaseOf } from '../../lib/journey';
import type { PlanItem } from '../../content/prenatalPlan';
import { appointmentTitle } from '../../lib/appointments';
import { buildUpcoming } from '../../lib/upcoming';
import type { Insight } from '../../lib/symptoms';
import type { Author, Consultation, PartnerTask, SymptomItem } from '../../types';
import BabyArt from '../BabyArt';
import BabyGrowth from '../BabyGrowth';
import { stageAt } from '../../content/growth';
import { inDays, nextMilestone } from '../../lib/milestones';
import type { BabyTone } from '../../content/babyTones';
import { bellyShots, bellyWeeks } from '../../lib/folders';
import { coupleNames } from '../../lib/relatives';
import Sheet from '../Sheet';
import CheckIn from '../CheckIn';
import { DumForm } from '../DumForm';
import { PushSteps } from '../PushPrompt';
import { dismissPush, offersPush, pushDismissed } from '../../lib/pushInvite';
import { usePush } from '../../hooks/usePush';
import AlertSigns from '../AlertSigns';
import { photoUrl } from '../../api';
import WeekSummaryCard from '../home/WeekSummaryCard';
import TodayCard, { type TodayRow } from '../home/TodayCard';
import WeekStrip from '../home/WeekStrip';
import FirstDays from '../home/FirstDays';
import { MISSIONS, firstDays as firstDaysState, type MissionId } from '../../lib/firstDays';
import { BOOK_SEEN_KEY } from '../Book';
import { showsWeekSummary, summaryHeadline, weekSummary } from '../../lib/weekSummary';
import { Button, LinkButton } from '../ui';
import { InsightList } from '../InsightList';
import { PeopleContext, RelativesContext, speakerOf } from '../../lib/people';
import { discoveryOf } from '../../content/dailyDiscovery';
import WeekGift from '../home/WeekGift';
import { openWeekGift, weekGiftPending } from '../../lib/weekGift';
import { dismissSince, previousVisit, rememberReactions, resumeVisit, sinceParts } from '../../lib/since';
import { BabyNameContext, rankIdeas } from '../../lib/baby';
import { bookMonths, freshChapter, type Chapter } from '../../lib/chapters';
import { pendingTasks, upcomingCelebration, type Celebration } from '../../lib/celebrations';
import type { UpcomingItem } from '../../lib/upcoming';

/** Para onde o Início leva (abas e partes delas). */
export type HomeTarget = 'diario' | 'mural' | 'livro' | 'humor' | 'barriga' | 'medidas' | 'saude' | 'graficos' | 'jornada' | 'tarefas' | 'exames' | 'agenda';

interface Props {
  age: GestationalAge;
  dumDate: string;
  selectedWeek: number;
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  onSaveDum: (iso: string) => Promise<boolean>;
  /** Tom do bebê desenhado (migração 024) e como trocar. */
  babyTone: BabyTone;
  onBabyTone: (tone: BabyTone) => Promise<boolean>;
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
  onCheckin: (mood: Mood | null) => Promise<boolean>;
  onHug: () => Promise<boolean>;
  /** Contar o humor no Mural (registro do dia a dia). */
  onShareMood?: (text: string) => Promise<boolean>;
  onOpen: (target: HomeTarget, planItem?: string) => void;
  /** O livro de vocês (o capítulo sendo escrito aparece no coração do Início). */
  book?: Chapter[];
  /** As ideias de nome (migração 026); null antes da migração. */
  nameIdeas?: NameIdea[] | null;
  /** Abre a escolha do nome. */
  onOpenNames?: () => void;
  /** Abre o calendário (Agenda) já na folha de um dia. */
  onOpenCalendar?: (day: string | null) => void;
  /** "Primeiros 7 dias": o dia em que começou (ou nulo, se o casal escondeu). */
  firstDays?: string | null;
  onHideFirstDays?: () => void;
  onInvite?: () => void;
  onWriteLetter?: () => void;
  /** Celebrações (migração 028): a próxima aparece no Início a partir de 60 dias antes. */
  celebrations?: Celebration[] | null;
  onOpenCelebration?: (id: string) => void;
  /** Abre os detalhes de um agendamento, tarefa ou registro do diário. */
  onOpenDetail: (target: DetailTarget) => void;
  /** Guardar o resultado de um exame que já aconteceu. */
  onResult: (c: Consultation) => void;
  /** Itens da jornada com a janela já fechada, sem data e sem marcação (Cuidados → Jornada). */
  lateSteps: PlanItem[];
  /** Diário com fotos (migrações 008 e 012): o cartão da barriguinha da semana. */
  bellyAvailable: boolean;
  onBellyPhoto: () => void;
  symptoms: SymptomItem[];
  /** Quem está logado (o que fica guardado só neste aparelho: a semana aberta, a última visita). */
  userId: string;
  /** Reações nos registros (para o "Desde a última vez"). */
  reactions: Reaction[];
  /** Abre o registro do diário numa pasta (o convite da descoberta do dia). */
  onWrite: (folder: Folder) => void;
}

export default function HomeTab(props: Props) {
  const { age, selectedWeek, currentWeek, onSelectWeek, insights, onOpen } = props;
  const [editingDum, setEditingDum] = useState(false);
  const [growth, setGrowth] = useState(false);
  const [sheet, setSheet] = useState<'alerta' | 'missoes' | 'lembretes' | 'resumo' | null>(null);
  const openGrowth = () => setGrowth(true);
  const info = weekInfo(selectedWeek);
  const stage = stageAt(selectedWeek);
  const now = new Date();
  const todayIso = toISODate(now);
  const tomorrowIso = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const alerts = insights.filter(i => i.tone === 'alerta');
  const phase = phaseOf(currentWeek);
  const cards = weekCards(selectedWeek);
  const dayOfPregnancy = daysBetween(parseLocalDate(props.dumDate), parseLocalDate(todayIso)) + 1;
  // Na jornada, o próximo marco aparece sempre (não só quando se olha a semana de hoje).
  const upcoming = age.daysToDpp >= 0 ? nextMilestone(props.dumDate, todayIso) : null;
  const gestationPct = Math.min(100, Math.max(0, ((dayOfPregnancy - 1) / 280) * 100));

  const up = buildUpcoming({ consultations: props.consultations, tasks: props.tasks, journal: props.journal, exams: props.exams, today: now, celebrations: props.celebrations });
  const lateSteps = props.lateSteps;
  const members = useContext(PeopleContext);
  const babyName = useContext(BabyNameContext);
  const relatives = useContext(RelativesContext);
  const isToday = selectedWeek === currentWeek;
  // A semana nova embrulhada (uma vez por semana) e, depois de aberta, o bebê aparecendo.
  const [gift, setGift] = useState(() => weekGiftPending(props.userId, currentWeek));
  const [revealed, setRevealed] = useState(false);
  const wrapped = gift && isToday;
  const unwrap = () => {
    openWeekGift(props.userId, currentWeek);
    setGift(false);
    setRevealed(true);
  };
  // Desde a última vez: o que aconteceu enquanto a pessoa esteve fora.
  const [visit, setVisit] = useState(() => previousVisit(props.userId));
  useEffect(() => rememberReactions(props.userId, props.reactions), [props.userId, props.reactions]);
  useEffect(() => {
    // O app ficou horas em segundo plano: ao voltar, conta como uma nova volta.
    const back = () => {
      if (document.visibilityState !== 'visible') return;
      resumeVisit(props.userId);
      setVisit(previousVisit(props.userId));
    };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [props.userId]);
  const since = visit
    ? sinceParts({
        since: visit.at,
        seenReactions: visit.reactions,
        dumDate: props.dumDate,
        partnerName: props.partnerName,
        journal: props.journal,
        checkins: props.checkins,
        hugs: props.hugs,
        reactions: props.reactions,
        reactor: r => speakerOf(members, relatives, r).name,
      })
    : [];
  const closeSince = () => (dismissSince(props.userId), setVisit(null));
  // As missões dos primeiros dias se marcam sozinhas, pelo que já aconteceu de verdade.
  const bookSeen = (() => {
    try {
      return !!localStorage.getItem(BOOK_SEEN_KEY);
    } catch {
      return false;
    }
  })();
  const missionsDone = new Set<MissionId>(
    [
      !!props.partnerName && 'convidar',
      props.checkins.some(c => c.mine) && 'checkin',
      props.consultations.length > 0 && 'consulta',
      bellyShots(props.journal, props.dumDate).length > 0 && 'barriga',
      (!!babyName || (props.nameIdeas?.length ?? 0) > 0) && 'nome',
      props.journal.some(e => e.folder === 'carta') && 'carta',
      bookSeen && 'livro',
    ].filter(Boolean) as MissionId[],
  );
  const doMission = (id: MissionId) => {
    setSheet(null);
    if (id === 'convidar') return props.onInvite?.();
    if (id === 'checkin') return document.getElementById('checkin-titulo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (id === 'consulta') return onOpen('agenda');
    if (id === 'barriga') return props.onBellyPhoto();
    if (id === 'nome') return props.onOpenNames?.();
    if (id === 'carta') return props.onWriteLetter?.();
    onOpen('livro');
  };
  const party = upcomingCelebration(props.celebrations, new Date());
  const summaryRoles = (['mae', 'pai'] as const).filter(r => members.some(m => m.role === r) || props.checkins.some(c => c.author_role === r));
  const partnerToday = props.checkins.some(c => !c.mine && c.day === todayIso) || props.journal.some(e => !e.mine && e.created_at && toISODate(parseTimestamp(e.created_at)) === todayIso);
  const push = usePush();
  const [pushHidden, setPushHidden] = useState(pushDismissed);

  // "Para hoje": tudo o que pede atenção, na ordem do que mais importa. O cartão mostra até três.
  const openItem = (i: UpcomingItem) => (i.celebration ? props.onOpenCelebration?.(i.celebration.id) : props.onOpenDetail(i.consultation ? { kind: 'consultation', id: i.consultation.id } : i.task ? { kind: 'task', id: i.task.id } : { kind: 'entry', id: i.entry!.id }));
  const isEvent = (i: UpcomingItem) => !!i.consultation || (!!i.celebration && !i.celebrationTask);
  const itemRow = (i: UpcomingItem, when: string): TodayRow => ({
    id: i.id,
    tone: i.overdue ? 'alert' : i.tone,
    icon: i.consultation ? <Stethoscope /> : i.celebration ? <PartyPopper /> : i.task ? <ListChecks /> : <NotebookPen />,
    kicker: i.overdue ? i.label : [when, i.time, i.label].filter(Boolean).join(' · '),
    title: i.title,
    sub: i.detail,
    onClick: () => openItem(i),
  });
  const overdue = up.today.filter(i => i.overdue);
  const todayTasks = up.today.filter(i => !isEvent(i) && !i.overdue && (i.task || i.celebrationTask));
  const todayNotes = up.today.filter(i => !isEvent(i) && !i.overdue && !i.task && !i.celebrationTask);
  const mission = props.firstDays && props.onHideFirstDays ? firstDaysState(missionsDone, props.firstDays, todayIso) : null;
  const topIdeas = props.nameIdeas ? rankIdeas(props.nameIdeas).slice(0, 3) : [];
  const rows: TodayRow[] = [
    ...(alerts.length ? [{ id: 'alerta', tone: 'alert' as const, icon: <Siren />, kicker: 'Atenção à saúde', title: alerts[0].title, sub: alerts.length > 1 ? `e mais ${alerts.length - 1} ${alerts.length === 2 ? 'ponto' : 'pontos'} para conversar com a equipe` : alerts[0].detail, onClick: () => setSheet('alerta') }] : []),
    ...up.today.filter(isEvent).map(i => itemRow(i, 'Hoje')),
    ...up.week.filter(i => i.day === tomorrowIso && isEvent(i)).map(i => itemRow(i, 'Amanhã')),
    ...(overdue.length > 1 ? [{ id: 'atrasadas', tone: 'alert' as const, icon: <ListChecks />, kicker: 'Tarefas atrasadas', title: `${overdue.length} tarefas passaram do prazo`, sub: overdue.slice(0, 2).map(i => i.title).join(' · '), onClick: () => onOpen('tarefas') }] : overdue.map(i => itemRow(i, 'Hoje'))),
    // Várias tarefas no mesmo dia viram uma linha só (o detalhe fica na Agenda).
    ...(todayTasks.length > 1
      ? [{ id: 'tarefas-hoje', tone: 'azul' as const, icon: <ListChecks />, kicker: 'Hoje · Tarefas', title: `${todayTasks.length} tarefas para hoje`, sub: todayTasks.slice(0, 3).map(i => i.title).join(' · '), onClick: () => onOpen('tarefas') }]
      : todayTasks.map(i => itemRow(i, 'Hoje'))),
    ...todayNotes.map(i => itemRow(i, 'Hoje')),
    ...(lateSteps.length ? [{ id: 'jornada', tone: 'verde' as const, icon: <Route />, kicker: 'Para não esquecer', title: `${lateSteps.length} ${lateSteps.length === 1 ? 'item da jornada' : 'itens da jornada'} para conferir`, sub: lateSteps.slice(0, 2).map(s => s.short).join(', '), onClick: () => onOpen('jornada') }] : []),
    ...(up.missingResults.length ? [{ id: 'resultados', tone: 'verde' as const, icon: <ClipboardCheck />, kicker: 'Para não esquecer', title: up.missingResults.length === 1 ? 'Falta guardar 1 resultado' : `Faltam guardar ${up.missingResults.length} resultados`, sub: appointmentTitle(up.missingResults[0]), onClick: () => props.onResult(up.missingResults[0]) }] : []),
    // Os lembretes vêm antes das missões: é um convite só, e é ele que faz os outros avisos chegarem.
    ...(!pushHidden && offersPush(push.state.phase)
      ? [{ id: 'lembretes', tone: 'brand' as const, icon: <BellRing />, kicker: 'Lembretes no celular', title: 'Véspera das consultas e semana nova, mesmo com o app fechado', action: 'Ativar', onClick: () => setSheet('lembretes'), onDismiss: () => (dismissPush(), setPushHidden(true)) }]
      : []),
    ...(mission?.next && !mission.complete ? [{ id: 'missao', tone: 'rosa' as const, icon: <Sparkles />, kicker: `Primeiros 7 dias · ${MISSIONS.filter(m => missionsDone.has(m.id)).length} de 7`, title: mission.next.title, sub: mission.next.why, onClick: () => setSheet('missoes'), onDismiss: props.onHideFirstDays }] : []),
    // A celebração de hoje ou amanhã já aparece acima, como compromisso.
    ...(party && party.days > 1 && props.onOpenCelebration ? [{ id: 'celebracao', tone: 'rosa' as const, icon: <PartyPopper />, kicker: `Faltam ${party.days} dias`, title: party.c.title, sub: pendingTasks(party.c)[0] ? `Próximo passo: ${pendingTasks(party.c)[0].item.title}` : 'Tudo pronto. Agora é aproveitar!', onClick: () => props.onOpenCelebration!(party.c.id) }] : []),
    ...(!babyName && props.nameIdeas && props.onOpenNames ? [{ id: 'nome', tone: 'lilas' as const, icon: <Sparkles />, kicker: 'O nome do bebê', title: 'Qual vai ser o nome?', sub: topIdeas.length ? topIdeas.map(i => i.name).join(' · ') : 'Anotem a primeira ideia', onClick: props.onOpenNames }] : []),
  ];

  const summary = showsWeekSummary(now) ? weekSummary({ today: now, roles: summaryRoles, checkins: props.checkins, journal: props.journal, consultations: props.consultations, tasks: props.tasks, symptoms: props.symptoms }) : null;
  const belly = bellyWeeks(props.journal, props.dumDate)
    .map(w => ({ week: w.week, photo: w.items.find(i => i.photos.length > 0)?.photos[0] }))
    .filter(w => !!w.photo);
  const bellyDone = belly.some(w => w.week === currentWeek);
  const chapter = props.book?.length ? bookMonths(props.book)[0] : undefined;
  const freshPage = props.book?.length ? freshChapter(props.book, props.dumDate, now) : null;
  const dadFirst = props.role === 'pai';
  const discovery = discoveryOf(dayOfPregnancy, babyName);
  // A foto da barriga desta semana já foi tirada: o convite vira guardar um momento.
  const invite = discovery.invite.kind === 'barriga' && (bellyDone || !props.bellyAvailable) ? { kind: 'momento' as const, label: 'Guardar um momento' } : discovery.invite;

  return (
    <div className="space-y-8">
      {/* 1. O bebê: o dia, a semana no calendário e o bebê no centro, sem caixa, sobre um halo suave. */}
      <div className="space-y-4">
        {since.length > 0 && (
          <div role="status" className="tt-carimbo flex items-start gap-2 rounded-2xl bg-surface/70 pl-3.5 pr-1 py-1.5 shadow-[0_1px_0_var(--color-line)]">
            <button type="button" onClick={() => (closeSince(), onOpen('mural'))} className="flex-1 py-1 text-left text-[13px] leading-snug text-ink-soft">
              <span className="font-extrabold text-rosa-strong">Desde a última vez</span>
              {since.map(p => (
                <span key={p}>
                  <span aria-hidden className="text-ink-mute"> · </span>
                  {p}
                </span>
              ))}
            </button>
            <button type="button" onClick={closeSince} aria-label="Fechar o que aconteceu desde a última vez" className="w-8 h-8 shrink-0 rounded-full text-ink-mute hover:bg-surface-2 flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {props.onOpenCalendar ? (
          <WeekStrip now={now} dumDate={props.dumDate} consultations={props.consultations} tasks={props.tasks} journal={props.journal} results={props.exams} celebrations={props.celebrations} onOpen={props.onOpenCalendar} />
        ) : (
          <p className="px-1 text-sm text-ink-soft first-letter:uppercase">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        )}

        <section aria-label="Semana da gestação" className="relative text-center">
          <div aria-hidden className="pointer-events-none absolute left-1/2 -top-6 -translate-x-1/2 w-[340px] h-[280px] rounded-full bg-[radial-gradient(closest-side,var(--color-rosa-soft),var(--color-lilas-soft)_60%,transparent)] opacity-80 blur-2xl" />
          <div className="relative flex items-center justify-center gap-1">
            <button type="button" onClick={() => onSelectWeek(selectedWeek - 1)} disabled={selectedWeek <= FIRST_WEEK} aria-label="Semana anterior" className="w-9 h-9 rounded-full text-ink-mute hover:text-ink hover:bg-surface/60 flex items-center justify-center disabled:opacity-30">
              <ChevronLeft className="w-5 h-5" />
            </button>
            {wrapped ? (
              <WeekGift week={currentWeek} onOpen={unwrap} />
            ) : (
              <button type="button" onClick={openGrowth} aria-label={`Semana ${selectedWeek} de 40: abrir a jornada do bebê`} className={`rounded-full ${revealed && isToday ? 'tt-revelar' : ''}`}>
                <BabyArt week={selectedWeek} beat={selectedWeek === currentWeek} tone={props.babyTone} className="w-40 h-40 sm:w-44 sm:h-44" />
              </button>
            )}
            <button type="button" onClick={() => onSelectWeek(selectedWeek + 1)} disabled={selectedWeek >= LAST_WEEK} aria-label="Próxima semana" className="w-9 h-9 rounded-full text-ink-mute hover:text-ink hover:bg-surface/60 flex items-center justify-center disabled:opacity-30">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-1 space-y-1">
            <p className="text-[13px] font-extrabold text-rosa tabular" aria-live="polite">
              {selectedWeek === currentWeek ? `${age.weeks} semanas${age.days ? ` e ${age.days} ${age.days === 1 ? 'dia' : 'dias'}` : ''}` : `Semana ${selectedWeek}`}
            </p>
            {babyName && <p className="font-display text-[1.1rem] leading-none text-rosa-strong">{babyName}</p>}
            {wrapped ? (
              <>
                <h2 className="font-display text-[1.65rem] leading-tight text-ink text-balance">Uma semana nova chegou</h2>
                <p className="text-[14px] text-ink-soft">Toque no presente para ver como {babyName ?? 'o bebê'} está agora</p>
              </>
            ) : (
              <>
                <h2 className="font-display text-[1.65rem] leading-tight text-ink text-balance">{stage.title}</h2>
                <p className="text-[14px] text-ink-soft">
                  Do tamanho de {info.fruit}
                  {selectedWeek !== currentWeek && <span className="text-ink-mute"> · espiando outra semana</span>}
                </p>
              </>
            )}
            {revealed && isToday && (
              <p className="tt-revelar-texto mx-auto max-w-[300px] pt-1.5 text-[14px] leading-snug text-rosa-strong">
                <span className="font-extrabold">Novidade da semana {currentWeek}:</span> {info.milestone}
              </p>
            )}
          </div>

          {/* A gestação inteira numa linha fina, com quanto falta. */}
          <div className="relative mx-auto mt-4 max-w-[280px] space-y-1.5">
            <div className="relative h-1 rounded-full bg-surface-2" role="progressbar" aria-label="Quanto da gestação já passou" aria-valuenow={Math.round(gestationPct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rosa to-lilas" style={{ width: `${gestationPct}%` }} />
              {[13, 28].map(w => (
                <span key={w} className="absolute -top-0.5 h-2 w-0.5 rounded-full bg-canvas" style={{ left: `${(w * 7 * 100) / 280}%` }} aria-hidden />
              ))}
            </div>
            <div className="flex items-center justify-center gap-1 text-[12.5px] text-ink-mute tabular">
              <span>
                {age.daysToDpp >= 0 ? (
                  <>
                    Faltam <strong className="text-ink-soft">{age.daysToDpp} dias</strong> · dia {dayOfPregnancy} de 280
                  </>
                ) : (
                  <>DPP foi em {age.dpp.toLocaleDateString('pt-BR')}</>
                )}
              </span>
              <button onClick={() => setEditingDum(v => !v)} aria-label="Alterar a DUM" className="w-7 h-7 rounded-full hover:bg-surface/60 flex items-center justify-center">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            {selectedWeek !== currentWeek && <LinkButton onClick={() => onSelectWeek(currentWeek)}>Voltar para hoje</LinkButton>}
          </div>
          {props.partnerName && partnerToday && <p className="relative mt-1 text-[12.5px] text-ink-mute">{props.partnerName} já passou por aqui hoje 💛</p>}


          {editingDum && (
            <div className="relative mt-3 text-left">
              <DumForm
                initial={props.dumDate}
                onCancel={() => setEditingDum(false)}
                onSave={async iso => {
                  if (await props.onSaveDum(iso)) setEditingDum(false);
                }}
              />
            </div>
          )}
          {age.isPostTerm && <p className="relative mt-3 text-left text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">Vocês passaram das 40 semanas. Combinem com o obstetra a frequência das avaliações a partir de agora.</p>}
        </section>
        {/* A descoberta do dia: uma frase nova por dia, que termina num convite para registrar. */}
        {isToday && !wrapped && age.daysToDpp >= 0 && (
          <section aria-label="Descoberta de hoje" className="mx-auto w-full max-w-[340px] rounded-[22px] bg-surface/75 px-4 py-3 text-left shadow-[0_1px_0_var(--color-line)]">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lilas-strong">
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              Descoberta de hoje
            </p>
            <p className="mt-1 text-[14.5px] leading-snug text-ink">{discovery.text}</p>
            <button type="button" onClick={() => (invite.kind === 'barriga' ? props.onBellyPhoto() : props.onWrite(invite.kind === 'carta' ? 'carta' : 'momento'))} className="mt-1.5 -ml-1 inline-flex items-center gap-1 rounded-full px-1 py-1 text-[13.5px] font-bold text-rosa-strong hover:underline">
              {invite.label}
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </section>
        )}
      </div>

      {/* 2. Como você está: logo depois de ver o bebê, um toque para contar (e o abraço). */}
      {props.checkinAvailable && <CheckIn role={props.role} checkins={props.checkins} hugs={props.hugs} onCheckin={props.onCheckin} onHug={props.onHug} onShare={props.onShareMood} onMonth={() => onOpen('humor')} />}

      {/* 3. Para hoje: no máximo três linhas, o resto na Agenda. */}
      <TodayCard rows={rows} onAgenda={() => onOpen('agenda')} />

      {/* 4. Nesta semana: um carrossel para quem quer saber mais. */}
      <section aria-labelledby="nesta-semana" className="space-y-2.5">
        <h2 id="nesta-semana" className="px-1 text-[1.3rem] text-ink">
          {selectedWeek === currentWeek ? 'Nesta semana' : `Na semana ${selectedWeek}`}
        </h2>
        <ul className="-mx-4 px-4 flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
          {summary && <WeekCard tone="bg-gradient-to-br from-rosa-soft to-azul-soft" label="Resumo da semana" labelTone="text-rosa-strong" icon={<Sparkles />} title={summaryHeadline(summary)} onClick={() => setSheet('resumo')} />}
          <WeekCard tone="bg-rosa-soft" label="O bebê" labelTone="text-rosa-strong" icon={<Baby />} title={info.milestone} onClick={openGrowth} />
          {upcoming && <WeekCard tone="bg-lilas-soft" label="Próximo marco" labelTone="text-lilas-strong" icon={<Flag />} title={upcoming.milestone.title} meta={inDays(upcoming.days)} ariaLabel={`Próximo marco ${inDays(upcoming.days)}: ${upcoming.milestone.title}. Ver na jornada do bebê`} onClick={openGrowth} />}
          {dadFirst && <WeekCard tone="bg-azul-soft" label="Para o pai" labelTone="text-azul-strong" icon={<HandHeart />} title={cards.partner.title} text={cards.partner.text} />}
          <WeekCard tone="bg-coral-soft" label="Seu corpo" labelTone="text-coral-strong" icon={<Footprints />} title={cards.body.title} text={cards.body.text} />
          {!dadFirst && <WeekCard tone="bg-azul-soft" label="Para o pai" labelTone="text-azul-strong" icon={<HandHeart />} title={cards.partner.title} text={cards.partner.text} />}
          {props.bellyAvailable && (
            <WeekCard
              tone="bg-lilas-soft"
              label="Barriguinha"
              labelTone="text-lilas-strong"
              icon={<Camera />}
              title={bellyDone ? 'A foto desta semana está guardada' : 'Falta a foto desta semana'}
              meta={belly.length ? `${belly.length} ${belly.length === 1 ? 'semana' : 'semanas'} na evolução` : `Semana ${currentWeek}`}
              photo={belly[0]?.photo && photoUrl(belly[0].photo.id, true)}
              ariaLabel={`Barriguinha da semana ${currentWeek}: ${bellyDone ? 'ver a evolução' : 'tirar a foto'}`}
              onClick={bellyDone ? () => onOpen('barriga') : props.onBellyPhoto}
            />
          )}
          {chapter && <WeekCard tone="bg-gradient-to-br from-rosa-soft to-lilas-soft" label="O livro" labelTone="text-rosa-strong" icon={<BookOpen />} title={freshPage ? 'Uma página nova foi escrita' : chapter.title} meta={`Capítulo ${chapter.month}`} ariaLabel={`O livro de ${babyName ?? 'vocês'}: abrir`} onClick={() => onOpen('livro')} />}
          <WeekCard tone="bg-verde-soft" label="Jornada" labelTone="text-verde-strong" icon={<Route />} title={phase.title} meta={phase.visits} onClick={() => onOpen('jornada')} />
        </ul>
        <p className="px-1 text-[11px] text-ink-mute">Referência: {WEEK_CARDS_SOURCE}. Cada gestação é única.</p>
      </section>

      {growth && (
        <Sheet title="Jornada do bebê" subtitle={`Da 4ª à 40ª semana · vocês estão na ${currentWeek}ª`} onClose={() => setGrowth(false)}>
          <BabyGrowth
            currentWeek={currentWeek}
            goal={upcoming ? { week: upcoming.milestone.week, title: upcoming.milestone.title, text: upcoming.milestone.text, when: inDays(upcoming.days) } : undefined}
            tone={props.babyTone}
            onToneChange={props.onBabyTone}
            onNames={props.onOpenNames && (() => (setGrowth(false), props.onOpenNames!()))}
            parents={coupleNames(members.map(m => m.name))}
            belly={bellyShots(props.journal, props.dumDate)}
            onOpenEntry={id => {
              setGrowth(false);
              props.onOpenDetail({ kind: 'entry', id });
            }}
          />
        </Sheet>
      )}
      {sheet === 'alerta' && (
        <Sheet title="Atenção à saúde" subtitle="Pelo que vocês registraram nos últimos dias" onClose={() => setSheet(null)}>
          <div className="space-y-5">
            <InsightList insights={alerts} />
            <AlertSigns open />
            <Button tone="soft" onClick={() => (setSheet(null), onOpen('saude'))}>
              Ver a saúde
            </Button>
          </div>
        </Sheet>
      )}
      {sheet === 'missoes' && props.firstDays && props.onHideFirstDays && (
        <Sheet title="Primeiros 7 dias" subtitle="Uma pequena missão por dia para conhecer o Tumtum" onClose={() => setSheet(null)}>
          <FirstDays done={missionsDone} start={props.firstDays} todayIso={todayIso} onAction={doMission} onHide={() => (setSheet(null), props.onHideFirstDays!())} />
        </Sheet>
      )}
      {sheet === 'lembretes' && offersPush(push.state.phase) && (
        <Sheet title="Lembretes no celular" onClose={() => setSheet(null)}>
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">Véspera das consultas, semana nova, exames chegando e os lembretes dos momentos, mesmo com o app fechado.</p>
            <PushSteps push={push} />
          </div>
        </Sheet>
      )}
      {sheet === 'resumo' && summary && (
        <Sheet title="A semana de vocês" onClose={() => setSheet(null)}>
          <WeekSummaryCard summary={summary} week={currentWeek} onMood={() => (setSheet(null), onOpen('humor'))} onMural={() => (setSheet(null), onOpen('mural'))} />
        </Sheet>
      )}
    </div>
  );
}

// Um cartão pequeno do carrossel: ícone, rótulo, título curto e um detalhe.
// Quem não leva a outro lugar (corpo, pai) abre o texto inteiro numa folha.
function WeekCard({ tone, label, labelTone, icon, title, text, meta, photo, ariaLabel, onClick }: { tone: string; label: string; labelTone: string; icon: React.ReactNode; title: string; text?: string; meta?: string; photo?: string; ariaLabel?: string; onClick?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`snap-start shrink-0 w-[156px] h-[160px] overflow-hidden rounded-[22px] ${tone}`}>
      <button type="button" onClick={onClick ?? (() => setOpen(true))} aria-label={ariaLabel} className="w-full h-full text-left p-3.5 flex flex-col gap-1.5 transition active:scale-[0.98]">
        <span className="flex shrink-0 items-start justify-between gap-2">
          <span className={`w-8 h-8 rounded-full bg-surface/70 flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4 ${labelTone}`}>{icon}</span>
          {photo && <img src={photo} alt="" loading="lazy" className="w-8 h-10 rounded-lg object-cover" />}
        </span>
        <span className={`block shrink-0 text-[11px] font-extrabold uppercase tracking-wide truncate ${labelTone}`}>{label}</span>
        <span className={`font-display text-[15px] leading-snug text-ink ${meta ? 'line-clamp-2' : 'line-clamp-3'}`}>{title}</span>
        {meta && <span className="mt-auto block shrink-0 text-[12px] text-ink-soft truncate">{meta}</span>}
      </button>
      {open && text && (
        <Sheet title={title} subtitle={label} onClose={() => setOpen(false)}>
          <p className="text-[15px] leading-relaxed text-ink">{text}</p>
        </Sheet>
      )}
    </li>
  );
}
