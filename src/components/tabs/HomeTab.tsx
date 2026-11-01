import { useContext, useEffect, useState } from 'react';
import { Baby, BellRing, BookOpen, Camera, ChevronRight, ClipboardCheck, Flag, Footprints, HandHeart, Heart, Hourglass, ListChecks, Moon, NotebookPen, PartyPopper, Pencil, Share2, Siren, Sparkles, Stethoscope, X } from 'lucide-react';
import { weekInfo } from '../../content/weeks';
import { WEEK_CARDS_SOURCE, weekCards } from '../../content/weekCards';
import { daysBetween, parseLocalDate, parseTimestamp, toISODate, type GestationalAge } from '../../lib/dates';
import type { Checkin, ExamItem, Folder, Hug, JournalEntry, Mood, NameIdea, Reaction } from '../../hooks/useGestationData';
import type { DetailTarget } from '../../lib/details';
import { appointmentTitle } from '../../lib/appointments';
import { buildUpcoming } from '../../lib/upcoming';
import type { Insight } from '../../lib/symptoms';
import type { Author, Consultation, PartnerTask, SymptomItem } from '../../types';
import BabyArt from '../BabyArt';
import BabyGrowth from '../BabyGrowth';
import { stageAt } from '../../content/growth';
import { inDays, nextMilestone } from '../../lib/milestones';
import type { BabyTone } from '../../content/babyTones';
import { bellyShots, bellyWeeks, shortDate } from '../../lib/folders';
import { coupleNames } from '../../lib/relatives';
import Sheet from '../Sheet';
import CheckIn from '../CheckIn';
import { DumForm } from '../DumForm';
import { PushSteps } from '../PushPrompt';
import { dismissPush, offersPush, pushDismissed } from '../../lib/pushInvite';
import { usePush } from '../../hooks/usePush';
import AlertSigns from '../AlertSigns';
import { stillUrl } from '../../api';
import WeekSummaryCard from '../home/WeekSummaryCard';
import TodayCard, { type TodayRow } from '../home/TodayCard';
import FirstDays from '../home/FirstDays';
import { MISSIONS, firstDays as firstDaysState, type MissionId } from '../../lib/firstDays';
import { BOOK_SEEN_KEY } from '../Book';
import { showsWeekSummary, summaryHeadline, weekSummary } from '../../lib/weekSummary';
import { Button, LinkButton } from '../ui';
import { InsightList } from '../InsightList';
import { PeopleContext, RelativesContext, speakerOf } from '../../lib/people';
import { discoveryOf } from '../../content/dailyDiscovery';
import WeekGift from '../home/WeekGift';
import VisitFeedback, { type VisitStatus } from '../home/VisitFeedback';
import { countdownTitle, nextCountdown, type Countdown } from '../../lib/countdown';
import { openWeekGift, weekGiftPending } from '../../lib/weekGift';
import { dismissSince, previousVisit, rememberReactions, resumeVisit, sinceParts } from '../../lib/since';
import { BabyNameContext } from '../../lib/baby';
import { bookMonths, freshChapter, type Chapter } from '../../lib/chapters';
import type { Celebration } from '../../lib/celebrations';
import type { UpcomingItem } from '../../lib/upcoming';
import { RITUAL_FROM_HOUR } from '../../lib/ritual';
import { isTwins, type Espera } from '../../lib/espera';
import { EsperaCard } from '../espera/Espera';
import { countdownCard, weekCard, type CardContent, type ShareKind } from '../../lib/shareCard';

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
  /** Abrir já numa janela (vindo da Ajuda). */
  start?: 'bebe' | 'missoes' | null;
  /** "Como foi a consulta?" (migração 032): responder; o aviso pode abrir já numa consulta. */
  onVisitFeedback?: (c: Consultation, status: VisitStatus) => void;
  /** O Tumtum de hoje: a partir das 18h, o convite para fechar o dia (se ainda não fechou). */
  /** A espera: menino ou menina (migração 035). */
  espera?: Espera | null;
  onOpenEspera?: () => void;
  onOpenReveal?: () => void;
  /** Compartilhar a semana ou a contagem num cartão com a marca. */
  onShare?: (card: CardContent, kind: ShareKind) => void;
  ritual?: { closed: boolean; partner: { mood: Mood | null; phrase: string | null } | null; onOpen: () => void };
  askVisit?: string | null;
  /** Dúvidas ainda sem resposta (para o "Como foi?"). */
  openQuestions?: number;
}

export default function HomeTab(props: Props) {
  const { age, selectedWeek, currentWeek, onSelectWeek, insights, onOpen } = props;
  const [editingDum, setEditingDum] = useState(false);
  // A Ajuda pode abrir o Início já na Jornada do bebê ou nos Primeiros 7 dias.
  const [growth, setGrowth] = useState(props.start === 'bebe');
  const [sheet, setSheet] = useState<'alerta' | 'missoes' | 'lembretes' | 'resumo' | 'semana' | null>(props.start === 'missoes' ? 'missoes' : null);
  // "Como foi a consulta?": a que está sendo respondida.
  const [visitId, setVisitId] = useState<string | null>(props.askVisit ?? null);
  const openGrowth = () => setGrowth(true);
  const info = weekInfo(selectedWeek);
  const twins = isTwins(props.espera);
  const stage = stageAt(selectedWeek);
  const now = new Date();
  const todayIso = toISODate(now);
  const alerts = insights.filter(i => i.tone === 'alerta');
  const dayOfPregnancy = daysBetween(parseLocalDate(props.dumDate), parseLocalDate(todayIso)) + 1;
  // Na jornada, o próximo marco aparece sempre (não só quando se olha a semana de hoje).
  const upcoming = age.daysToDpp >= 0 ? nextMilestone(props.dumDate, todayIso) : null;
  const gestationPct = Math.min(100, Math.max(0, ((dayOfPregnancy - 1) / 280) * 100));

  const up = buildUpcoming({ consultations: props.consultations, tasks: props.tasks, journal: props.journal, exams: props.exams, today: now, celebrations: props.celebrations });
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
  const summaryRoles = (['mae', 'pai'] as const).filter(r => members.some(m => m.role === r) || props.checkins.some(c => c.author_role === r));
  const partnerToday = props.checkins.some(c => !c.mine && c.day === todayIso) || props.journal.some(e => !e.mine && e.created_at && toISODate(parseTimestamp(e.created_at)) === todayIso);
  const push = usePush();
  const [pushHidden, setPushHidden] = useState(pushDismissed);

  // "Para hoje": só o que é de hoje (ou pede atenção agora), na ordem do que mais importa. O cartão mostra até três.
  // A jornada, o nome do bebê e as celebrações que vêm têm os lugares deles (Cuidados, Livro, a contagem).
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
  // Consultas e ultrassons que já passaram (há 1 hora ou mais, até 2 dias), ainda sem "como foi".
  const visits = props.onVisitFeedback
    ? props.consultations.filter(c => {
        if ((c.kind ?? 'consulta') !== 'consulta' && c.kind !== 'ultrassom') return false;
        if (c.after_status) return false;
        const ago = now.getTime() - parseTimestamp(c.scheduled_at).getTime();
        return ago >= 3_600_000 && ago <= 2 * 86_400_000;
      })
    : [];
  const askedVisit = visitId ? props.consultations.find(c => c.id === visitId && !c.after_status) : undefined;
  const countdown = nextCountdown({ consultations: props.consultations, celebrations: props.celebrations, dpp: age.daysToDpp >= 0 ? age.dpp : null, babyName });
  const summary = showsWeekSummary(now) ? weekSummary({ today: now, roles: summaryRoles, checkins: props.checkins, journal: props.journal, consultations: props.consultations, tasks: props.tasks, symptoms: props.symptoms }) : null;
  const rows: TodayRow[] = [
    ...visits.slice(0, 1).map(c => ({ id: `comofoi-${c.id}`, tone: 'verde' as const, icon: <Stethoscope />, kicker: 'Depois da consulta', title: c.kind === 'ultrassom' ? 'Como foi o ultrassom?' : 'Como foi a consulta?', sub: `${appointmentTitle(c)} · um toque para contar`, onClick: () => setVisitId(c.id) })),
    ...(alerts.length ? [{ id: 'alerta', tone: 'alert' as const, icon: <Siren />, kicker: 'Atenção à saúde', title: alerts[0].title, sub: alerts.length > 1 ? `e mais ${alerts.length - 1} ${alerts.length === 2 ? 'ponto' : 'pontos'} para conversar com a equipe` : alerts[0].detail, onClick: () => setSheet('alerta') }] : []),
    ...up.today.filter(isEvent).map(i => itemRow(i, 'Hoje')),
    // À noite, o ritual vem logo depois do que é de hoje: é o convite do dia.
    ...(props.ritual && !props.ritual.closed && now.getHours() >= RITUAL_FROM_HOUR
      ? [{ id: 'ritual', tone: 'lilas' as const, icon: <Moon />, kicker: 'O Tumtum de hoje', title: props.ritual.partner ? `${props.partnerName ?? 'A outra pessoa'} fechou o dia. E o seu?` : 'Como foi o dia de vocês?', sub: props.ritual.partner?.phrase ? `“${props.ritual.partner.phrase}”` : 'Um minuto: o humor e uma frase, que viram uma página do livro', action: 'Contar', onClick: props.ritual.onOpen }]
      : []),
    ...(overdue.length > 1 ? [{ id: 'atrasadas', tone: 'alert' as const, icon: <ListChecks />, kicker: 'Tarefas atrasadas', title: `${overdue.length} tarefas passaram do prazo`, sub: overdue.slice(0, 2).map(i => i.title).join(' · '), onClick: () => onOpen('tarefas') }] : overdue.map(i => itemRow(i, 'Hoje'))),
    // Várias tarefas no mesmo dia viram uma linha só (o detalhe fica na Agenda).
    ...(todayTasks.length > 1
      ? [{ id: 'tarefas-hoje', tone: 'azul' as const, icon: <ListChecks />, kicker: 'Hoje · Tarefas', title: `${todayTasks.length} tarefas para hoje`, sub: todayTasks.slice(0, 3).map(i => i.title).join(' · '), onClick: () => onOpen('tarefas') }]
      : todayTasks.map(i => itemRow(i, 'Hoje'))),
    ...todayNotes.map(i => itemRow(i, 'Hoje')),
    ...(up.missingResults.length ? [{ id: 'resultados', tone: 'verde' as const, icon: <ClipboardCheck />, kicker: 'Para não esquecer', title: up.missingResults.length === 1 ? 'Falta guardar 1 resultado' : `Faltam guardar ${up.missingResults.length} resultados`, sub: appointmentTitle(up.missingResults[0]), onClick: () => props.onResult(up.missingResults[0]) }] : []),
    ...(summary ? [{ id: 'resumo', tone: 'rosa' as const, icon: <Sparkles />, kicker: 'A semana de vocês', title: summaryHeadline(summary), onClick: () => setSheet('resumo') }] : []),
    // Os lembretes vêm antes das missões: é um convite só, e é ele que faz os outros avisos chegarem.
    ...(!pushHidden && offersPush(push.state.phase)
      ? [{ id: 'lembretes', tone: 'brand' as const, icon: <BellRing />, kicker: 'Lembretes no celular', title: 'Véspera das consultas e semana nova, mesmo com o app fechado', action: 'Ativar', onClick: () => setSheet('lembretes'), onDismiss: () => (dismissPush(), setPushHidden(true)) }]
      : []),
    ...(mission?.next && !mission.complete && !mission.over ? [{ id: 'missao', tone: 'rosa' as const, icon: <Sparkles />, kicker: `Primeiros 7 dias · ${MISSIONS.filter(m => missionsDone.has(m.id)).length} de 7`, title: mission.next.title, sub: mission.next.why, onClick: () => setSheet('missoes'), onDismiss: props.onHideFirstDays }] : []),
  ];

  const belly = bellyWeeks(props.journal, props.dumDate)
    .map(w => ({ week: w.week, photo: w.items.find(i => i.photos.length > 0)?.photos[0] }))
    .filter(w => !!w.photo);
  const bellyDone = belly.some(w => w.week === currentWeek);
  const chapter = props.book?.length ? bookMonths(props.book)[0] : undefined;
  const freshPage = props.book?.length ? freshChapter(props.book, props.dumDate, now) : null;
  const dadFirst = props.role === 'pai';
  // A última lembrança que os dois veem (o Mural, num cartão).
  const lastMemory = props.journal.find(e => e.visibility !== 'private');
  const discovery = discoveryOf(dayOfPregnancy, babyName);
  // A foto da barriga desta semana já foi tirada: o convite vira guardar um momento.
  const invite = discovery.invite.kind === 'barriga' && (bellyDone || !props.bellyAvailable) ? { kind: 'momento' as const, label: 'Guardar um momento' } : discovery.invite;

  return (
    <div className="space-y-8">
      {/* 1. O bebê: a semana, o tamanho e a descoberta do dia, sem caixa, sobre um halo suave.
          (O calendário mora na Agenda; as outras semanas, na jornada do bebê, um toque no bebê.) */}
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

        <section aria-label="Semana da gestação" className="relative text-center">
          <div aria-hidden className="pointer-events-none absolute left-1/2 -top-6 -translate-x-1/2 w-[340px] h-[280px] rounded-full bg-[radial-gradient(closest-side,var(--color-rosa-soft),var(--color-lilas-soft)_60%,transparent)] opacity-80 blur-2xl" />
          <div className="relative flex items-center justify-center">
            {wrapped ? (
              <WeekGift week={currentWeek} onOpen={unwrap} />
            ) : (
              <button type="button" onClick={openGrowth} aria-label={`Semana ${selectedWeek} de 40: abrir a jornada do bebê`} className={`rounded-full ${revealed && isToday ? 'tt-revelar' : ''}`}>
                {twins ? (
                  <span className="relative flex items-center justify-center w-48 h-40 sm:w-52 sm:h-44" aria-label="Gêmeos">
                    <BabyArt week={selectedWeek} beat={selectedWeek === currentWeek} tone={props.babyTone} className="absolute left-0 top-3 w-32 h-32 sm:w-36 sm:h-36" />
                    <BabyArt week={selectedWeek} tone={props.babyTone} className="absolute right-0 top-0 w-32 h-32 sm:w-36 sm:h-36 -scale-x-100" />
                  </span>
                ) : (
                  <BabyArt week={selectedWeek} beat={selectedWeek === currentWeek} tone={props.babyTone} className="w-40 h-40 sm:w-44 sm:h-44" />
                )}
              </button>
            )}
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
                  {twins ? <>Gêmeos · cada um do tamanho de {info.fruit}</> : <>Do tamanho de {info.fruit}</>}
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
          {props.onShare && selectedWeek === currentWeek && !wrapped && age.daysToDpp >= 0 && (
            <button
              type="button"
              onClick={() => props.onShare!(weekCard({ week: age.weeks, days: age.days, fruit: info.fruit, stage: stage.title, daysToDpp: age.daysToDpp, babyName }), 'cartao_semana')}
              className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-3.5 py-1.5 text-[12.5px] font-extrabold text-rosa-strong transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden /> Compartilhar a semana
            </button>
          )}
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
        {/* A descoberta do dia: uma frase nova por dia, que termina num convite para guardar. */}
        {isToday && !wrapped && age.daysToDpp >= 0 && (
          <section aria-label="Descoberta de hoje" className="mx-auto w-full max-w-[320px] text-center">
            <p className="text-[14.5px] leading-snug text-ink-soft">
              <Sparkles className="inline w-3.5 h-3.5 -mt-0.5 mr-1 text-lilas-strong" aria-hidden />
              {discovery.text}
            </p>
            <button type="button" onClick={() => (invite.kind === 'barriga' ? props.onBellyPhoto() : props.onWrite(invite.kind === 'carta' ? 'carta' : 'momento'))} className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13.5px] font-bold text-rosa-strong hover:underline">
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

      {/* 3. O que vem aí: um cartão só, o próximo marco (a contagem, ou o marco do bebê). */}
      <section aria-labelledby="nesta-semana" className="space-y-2.5">
        <h2 id="nesta-semana" className="px-1 text-[1.3rem] text-ink">
          O que vem aí
        </h2>
        {countdown ? (
          <CountdownCard
            countdown={countdown}
            onShare={props.onShare ? () => props.onShare!(countdownCard({ days: countdown.days, what: countdown.what, why: countdown.why, babyName }), 'cartao_contagem') : undefined}
            onClick={() => (countdown.kind === 'ultrassom' ? props.onOpenDetail({ kind: 'consultation', id: countdown.targetId! }) : countdown.kind === 'celebracao' ? props.onOpenCelebration?.(countdown.targetId!) : openGrowth())}
          />
        ) : (
          upcoming && (
            <button type="button" onClick={openGrowth} aria-label={`Próximo marco ${inDays(upcoming.days)}: ${upcoming.milestone.title}. Ver na jornada do bebê`} className="w-full flex items-center gap-3 rounded-[24px] bg-gradient-to-br from-lilas-soft to-rosa-soft px-4 py-3.5 text-left transition active:scale-[0.99]">
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-surface/70 text-lilas-strong flex items-center justify-center" aria-hidden>
                <Flag className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong">{inDays(upcoming.days)}</span>
                <span className="block font-display text-[1.1rem] leading-snug text-ink">{upcoming.milestone.title}</span>
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-lilas-strong" />
            </button>
          )
        )}
        <button type="button" onClick={() => setSheet('semana')} className="inline-flex items-center gap-1 px-1 text-[13.5px] font-bold text-ink-soft hover:text-ink">
          A semana {currentWeek}: o bebê, seu corpo e o pai <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      </section>

      {/* 4. Vocês: a última lembrança do Mural, a barriguinha da semana e o livro. */}
      <section aria-labelledby="voces-titulo" className="space-y-2.5">
        <h2 id="voces-titulo" className="px-1 text-[1.3rem] text-ink">
          Vocês
        </h2>
        {props.espera && props.onOpenEspera && (
          <EsperaCard
            espera={props.espera}
            today={todayIso}
            babyName={babyName}
            partnerName={props.partnerName}
            finalists={(props.nameIdeas ?? []).filter(i => i.finalist).length}
            ideas={(props.nameIdeas ?? []).length}
            onOpen={props.onOpenEspera}
            onReveal={props.onOpenReveal ?? props.onOpenEspera}
            onNames={props.onOpenNames ?? props.onOpenEspera}
          />
        )}
        {lastMemory ? (
          <button type="button" onClick={() => props.onOpenDetail({ kind: 'entry', id: lastMemory.id })} aria-label={`A última lembrança: ${lastMemory.body.slice(0, 60) || 'uma foto'}. Abrir`} className="w-full flex items-center gap-3 rounded-[24px] bg-surface/80 p-3 text-left shadow-[0_1px_0_var(--color-line)] transition active:scale-[0.99]">
            {lastMemory.photos[0] ? (
              <img src={stillUrl(lastMemory.photos[0], true)} alt="" className="w-16 h-16 shrink-0 rounded-2xl object-cover bg-surface-2" />
            ) : (
              <span className="w-16 h-16 shrink-0 rounded-2xl bg-rosa-soft text-rosa-strong flex items-center justify-center" aria-hidden>
                <Heart className="w-6 h-6" />
              </span>
            )}
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-extrabold text-rosa-strong">
                {speakerOf(members, relatives, lastMemory).name} · {shortDate(lastMemory.entry_date)}
              </span>
              <span className="block font-display text-[1.02rem] leading-snug text-ink line-clamp-2">{lastMemory.body || 'Uma foto para guardar'}</span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-ink-mute" />
          </button>
        ) : (
          <button type="button" onClick={() => props.onWrite('momento')} className="w-full rounded-[24px] bg-surface/80 p-4 text-left shadow-[0_1px_0_var(--color-line)]">
            <span className="block font-display text-[1.05rem] text-ink">A primeira lembrança de vocês</span>
            <span className="block text-[13.5px] text-ink-soft">Uma frase, uma foto: começa o livro do bebê.</span>
          </button>
        )}
        <div className="flex flex-wrap gap-2 px-1">
          {props.bellyAvailable && (
            <button type="button" onClick={bellyDone ? () => onOpen('barriga') : props.onBellyPhoto} aria-label={`Barriguinha da semana ${currentWeek}: ${bellyDone ? 'ver a evolução' : 'tirar a foto'}`} className="inline-flex items-center gap-1.5 rounded-full bg-lilas-soft px-3 py-1.5 text-[13px] font-bold text-lilas-strong">
              <Camera className="w-3.5 h-3.5" aria-hidden /> {bellyDone ? 'A barriga, semana a semana' : 'Falta a foto da barriga desta semana'}
            </button>
          )}
          {chapter && (
            <button type="button" onClick={() => onOpen('livro')} aria-label={`O livro de ${babyName ?? 'vocês'}: abrir`} className="inline-flex items-center gap-1.5 rounded-full bg-rosa-soft px-3 py-1.5 text-[13px] font-bold text-rosa-strong">
              <BookOpen className="w-3.5 h-3.5" aria-hidden /> {freshPage ? 'Uma página nova no livro' : `O livro · capítulo ${chapter.month}`}
            </button>
          )}
        </div>
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
      {askedVisit && props.onVisitFeedback && (
        <Sheet title={askedVisit.kind === 'ultrassom' ? 'Como foi o ultrassom?' : 'Como foi a consulta?'} onClose={() => setVisitId(null)}>
          <VisitFeedback visit={askedVisit} questions={props.openQuestions ?? 0} onAnswer={s => (setVisitId(null), props.onVisitFeedback!(askedVisit, s))} />
        </Sheet>
      )}
      {sheet === 'semana' && (
        <Sheet title={`A semana ${currentWeek}`} subtitle={`Do tamanho de ${weekInfo(currentWeek).fruit}`} onClose={() => setSheet(null)}>
          <div className="space-y-4">
            {[
              { label: 'O bebê', tone: 'text-rosa-strong', Icon: Baby, title: weekInfo(currentWeek).milestone, text: null as string | null },
              ...(dadFirst ? [{ label: 'Para o pai', tone: 'text-azul-strong', Icon: HandHeart, ...weekCards(currentWeek).partner }] : []),
              { label: 'Seu corpo', tone: 'text-coral-strong', Icon: Footprints, ...weekCards(currentWeek).body },
              ...(dadFirst ? [] : [{ label: 'Para o pai', tone: 'text-azul-strong', Icon: HandHeart, ...weekCards(currentWeek).partner }]),
            ].map(c => (
              <section key={c.label} className="space-y-1">
                <p className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide ${c.tone}`}>
                  <c.Icon className="w-3.5 h-3.5" aria-hidden /> {c.label}
                </p>
                <p className="font-display text-[1.1rem] leading-snug text-ink">{c.title}</p>
                {c.text && <p className="text-[14.5px] leading-relaxed text-ink-soft">{c.text}</p>}
              </section>
            ))}
            <p className="text-[11px] text-ink-mute">Referência: {WEEK_CARDS_SOURCE}. Cada gestação é única.</p>
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

/** A contagem para o próximo marco: o número grande ao lado do quê e do porquê, e a barra enchendo. */
function CountdownCard({ countdown, onClick, onShare }: { countdown: Countdown; onClick: () => void; onShare?: () => void }) {
  return (
    <div className="relative">
    <button type="button" onClick={onClick} aria-label={`${countdownTitle(countdown)}: ${countdown.why}`} className="w-full rounded-[24px] bg-gradient-to-br from-lilas-soft to-rosa-soft px-4 pt-3.5 pb-4 text-left transition active:scale-[0.99]">
      <span className="flex items-center gap-4">
        <span className="shrink-0 text-center font-display text-ink leading-none">
          <span className="block text-[40px]">{countdown.days}</span>
          <span className="block text-[13px] text-ink-soft">{countdown.days === 1 ? 'dia' : 'dias'}</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lilas-strong">
            <Hourglass className="w-3.5 h-3.5" aria-hidden /> Contagem
          </span>
          <span className="block font-display text-[1.15rem] leading-snug text-ink">para {countdown.what}</span>
          <span className="block text-[13px] text-ink-soft leading-snug">{countdown.why}</span>
        </span>
        {onShare ? <span className="w-9 shrink-0" aria-hidden /> : <ChevronRight className="w-5 h-5 shrink-0 text-lilas-strong" aria-hidden />}
      </span>
      <span className="mt-3 block h-1.5 rounded-full bg-surface/70 overflow-hidden" aria-hidden>
        <span className="block h-full rounded-full bg-gradient-to-r from-lilas to-rosa" style={{ width: `${Math.round(countdown.progress * 100)}%` }} />
      </span>
    </button>
    {onShare && (
      <button type="button" onClick={onShare} aria-label="Compartilhar a contagem" className="absolute right-3 top-[22px] w-9 h-9 rounded-full bg-surface/70 text-lilas-strong flex items-center justify-center transition active:scale-90">
        <Share2 className="w-4 h-4" />
      </button>
    )}
    </div>
  );
}

