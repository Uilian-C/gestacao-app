import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudRain, Sprout } from 'lucide-react';
import type { QuickMode } from './components/QuickRecord';
import Skeleton from './components/Skeleton';
import PrintedBookCard from './components/book/PrintedBookCard';
import type { BookReservation } from './components/book/BookBuilder';
import { BOOK_PREORDER, bookStuff, coverPhotos, estimatePages, DEFAULT_INCLUDE } from './lib/bookProduct';
import TasksTab from './components/tabs/TasksTab';
import UpcomingTab from './components/tabs/UpcomingTab';
import DiaryTab from './components/tabs/DiaryTab';
import SpaceSheet from './components/auth/SpaceSheet';
import DayClose from './components/home/DayClose';
import ShareSheet from './components/ShareSheet';
import DetailSheet from './components/Details';
import QuickRecord from './components/QuickRecord';

import type { NameActions } from './components/BabyNames';
import type { CelebrationActions } from './components/Celebrations';
import type { Celebration, CelebrationItem } from './lib/celebrations';
import { resolveDetail, type Detail, type DetailTarget } from './lib/details';
import type { Folder, JournalEntry, ListItem, Mood, ThreadComment } from './hooks/useGestationData';
import type { OnReact } from './components/Social';
import { takeFlagFromUrl, takeRitualFromUrl, takeTabFromUrl, takeViewFromUrl, takeVisitFromUrl, takeVoiceFromUrl } from './lib/pwa';
import { dayClosed, markClosed, partnerDay } from './lib/ritual';
import { finalistsCard, nameCard, placarCard, revealCard, surpriseCard, teaserCard, type CardContent, type ShareKind } from './lib/shareCard';
import { EsperaSheet, SexReveal } from './components/espera/Espera';
import { bolaoUrl, envelopeUrl, isTwins, percents, questionFor, rightCount, SEX_WORD, tally, teamsOf, type Sex, type SexPlan } from './lib/espera';
import { entryShare } from './lib/shareEntry';
import type { ShareRequest } from './components/ShareSheet';
import { authorOf, firstName } from './lib/people';

import { uploadVideo } from './lib/videos';
import { api, ApiError, photoUrl, type CoupleFamilyState, type FamilyState, type Me } from './api';


import type { VisitStatus } from './components/home/VisitFeedback';
import { firstTimeOf, type FirstTimeId } from './content/firstTimes';
import Header from './components/Header';

import type { HelpTarget } from './content/help';
import type { FichaInput } from './components/FichaBar';
import Nav from './components/Nav';
import Toast, { type ToastMessage } from './components/Toast';
import { DumForm } from './components/DumForm';
import { Card, SubTabs } from './components/ui';
import { SavingContext } from './lib/saving';
import type { BabyTone } from './content/babyTones';
import { FreshEntryContext } from './lib/people';
import type { BirthPlan } from './lib/birthPlan';
import HomeTab, { type HomeTarget } from './components/tabs/HomeTab';

import type { NewSymptom } from './components/forms/RecordForms';

import CareHome from './components/care/CareHome';
import CarePage from './components/care/CarePage';

import type { NewEntry } from './components/forms/EntryForm';
import type { NewConsultation, ReportRequest } from './components/tabs/ConsultationsTab';
// Exames vêm junto com o botão "+" (que tem o formulário de exame).
import type { SaveExam } from './components/tabs/ExamsTab';
import type { NewTask } from './components/tabs/TasksTab';

// Abas com gráficos, relatório e calendário carregam só quando abertas: o app abre mais rápido no celular.
const BookBuilder = lazy(() => import('./components/book/BookBuilder'));
// Carregadas só quando abertas: o que é mais raro e pesado (nomes, celebrações,
// ajuda, modo cuidado, resultados e saúde). O que se usa toda hora (registrar,
// detalhes, compartilhar, Diário, Agenda) vem junto, para abrir na hora.
const NameSpace = lazy(() => import('./components/BabyNames'));
const NameReveal = lazy(() => import('./components/BabyNames').then(m => ({ default: m.NameReveal })));
const CelebrationSpace = lazy(() => import('./components/Celebrations').then(m => ({ default: m.CelebrationSpace })));
const CareModeHome = lazy(() => import('./components/home/CareModeHome'));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const RecordList = lazy(() => import('./components/care/RecordList'));
const ExamsTab = lazy(() => import('./components/tabs/ExamsTab'));
const DashboardTab = lazy(() => import('./components/tabs/DashboardTab'));
const ConsultationsTab = lazy(() => import('./components/tabs/ConsultationsTab'));
const CalendarTab = lazy(() => import('./components/tabs/CalendarTab'));
const LaborTab = lazy(() => import('./components/tabs/LaborTab'));
const JourneyTab = lazy(() => import('./components/tabs/JourneyTab'));
import { questionSpecialty, type SpecialtyId } from './data/specialties';
import { useGestationData } from './hooks/useGestationData';
import { FIRST_WEEK, clampWeek, daysBetween, gestationalAge, isOverdue, parseLocalDate, parseTimestamp, toISODate, weekOfDay } from './lib/dates';
import { FOLDER, bellyShots, weekOn } from './lib/folders';
import { buildBook, chapterOfWeek } from './lib/chapters';
import { BabyNameContext, markNameSeen, nameSeen } from './lib/baby';
import { pressureInsights } from './lib/health';
import type { NewMetric } from './components/forms/RecordForms';
import { findPatterns, inPeriod, toEntries } from './lib/symptoms';
import type { AgendaView, CareView, Consultation, DashboardView, DeletableKind, DiaryView, PartnerTask, Tab } from './types';
import { isConsultation, resultOf } from './lib/appointments';
import { autoDone, planFor, visitsOf } from './lib/journey';
import { doneByAppointments, journeyRows, plannedItems } from './lib/journeyPlan';
import { JourneyContext } from './lib/journeyContext';
import { AttendeesReady, PeopleContext, RelativesContext, TaskRemindersReady, TimedRemindersReady } from './lib/people';
import { lastSeen, markSeen, partnerNews } from './lib/news';
import { tumtum } from './lib/feel';
import BookStamp, { type Stamp } from './components/BookStamp';
import SymptomEchoCard from './components/SymptomEchoCard';
import { symptomEcho, type SymptomEcho } from './lib/echo';
import { PLAN_ITEMS } from './content/prenatalPlan';

const UNDO_WINDOW_MS = 5000;

const TITLE: Record<Tab, string> = { inicio: 'Tumtum', diario: 'Diário', agenda: 'Agenda', cuidados: 'Cuidados', parto: 'Parto' };

/**
 * O que o botão "+" oferece em cada aba (o primeiro abre selecionado). No
 * Início, o primeiro gesto é afetivo: guardar um momento (a saúde vem logo ao
 * lado). Parto não tem: lá os registros são os cronômetros.
 */
const RECORD_MODES: Record<Tab, QuickMode[]> = {
  inicio: ['momento', 'sintoma', 'medicao', 'consulta', 'tarefa', 'exame'],
  diario: ['momento'],
  agenda: ['consulta', 'tarefa'],
  cuidados: ['sintoma', 'medicao', 'exame'],
  parto: [],
};

/** Em Cuidados, o botão "Registrar" muda com a página: na jornada, agenda-se pelos itens. */
const HEALTH_MODES: QuickMode[] = ['sintoma', 'medicao'];
const CARE_MODES: Record<CareView, QuickMode[]> = { inicio: RECORD_MODES.cuidados, sintomas: HEALTH_MODES, medidas: HEALTH_MODES, exames: ['exame'], jornada: [] };

/** O lembrete só vai quando o formulário pergunta (depois da migração 017); sem ele, o servidor mantém o que estava. */
const reminderOf = (t: NewTask) => ({
  ...(t.remindOn === undefined ? {} : { remindOn: t.remindOn || null }),
  ...(t.remindAt === undefined ? {} : { remindAt: t.remindAt }),
});

const appointmentFields = (c: NewConsultation) => ({
  scheduledAt: c.scheduledAt,
  specialty: c.specialty,
  professional: c.professional || null,
  location: c.location || null,
  kind: c.kind,
  title: c.title,
  planItem: c.planItem,
  attendees: c.attendees,
  ...(c.remindBefore === undefined ? {} : { remindBefore: c.remindBefore }),
});
const APPOINTMENT_DONE = { consulta: 'Consulta agendada', exame: 'Exame agendado', ultrassom: 'Ultrassom agendado', vacina: 'Vacina agendada' } as const;
const appointmentDone = (c: NewConsultation) => APPOINTMENT_DONE[c.kind ?? 'consulta'];

/** O que o aviso diz quando o registro do diário foi guardado. */
function entryDone(edited: boolean, visibility: NewEntry['visibility'], folder: NewEntry['folder']) {
  if (edited) return 'Alterações salvas';
  // Diz a pasta: quem posta pelo Mural vê onde o registro foi guardado.
  const where = ` · em ${FOLDER[folder].label}`;
  if (visibility === 'family') return `Postado no Mural, para vocês e a família${where}`;
  if (visibility === 'private') return `Guardado, só você vê${where}`;
  return `Postado no Mural${where}`;
}

const appointmentError = (c: NewConsultation) =>
  c.kind === 'consulta' ? undefined : 'Não foi possível agendar. Se for o primeiro exame agendado, rode a migração db/migrations/013_agendamentos.sql no Neon.';

function greetingFor(hour: number): string {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface AppProps {
  me: Me;
  family: CoupleFamilyState;
  onFamilyChange: (family: FamilyState | null) => void;
  /** Sessão vencida ou pessoa removida do espaço: volta para a porta de entrada. */
  onAccessLost: () => void;
  onSignOut: () => void;
}

const FIRST_DAYS_KEY = 'tumtum-primeiros-dias';

export default function App({ me, family, onFamilyChange, onAccessLost, onSignOut }: AppProps) {
  const { data, loadState, refresh, replace, patch, retry } = useGestationData(onAccessLost, me.data);
  const author = family.role;
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [tabState, setActiveTab] = useState<Tab>(() => takeTabFromUrl() ?? 'inicio');
  // Modo cuidado (migração 029): sem Parto, sem semana no cabeçalho; o Início vira acolhimento.
  const care = !!data?.careSince;
  const activeTab: Tab = care && tabState === 'parto' ? 'inicio' : tabState;
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [report, setReport] = useState<ReportRequest | null>(null);
  const [diaryView, setDiaryView] = useState<DiaryView>(() => (takeViewFromUrl() === 'mural' ? 'mural' : 'livro'));
  const [laborReset, setLaborReset] = useState(0);
  // O dia que o atalho do Início pediu para abrir no calendário.
  const [calendarFocus, setCalendarFocus] = useState<string | null>(null);
  const [agendaView, setAgendaView] = useState<AgendaView>(() => {
    const v = takeViewFromUrl();
    return v === 'calendario' || v === 'tarefas' ? v : 'proximos';
  });
  const [careView, setCareView] = useState<CareView>(() => {
    const v = takeViewFromUrl();
    return v === 'exames' || v === 'jornada' || v === 'sintomas' || v === 'medidas' ? v : 'inicio';
  });
  const [examPreset, setExamPreset] = useState<string | null>(null);
  /** Resultados: abrir o formulário a partir de um agendamento, ou levar até um resultado. */
  const [resultFrom, setResultFrom] = useState<Consultation | null>(null);
  const [focusExam, setFocusExam] = useState<string | null>(null);
  const [journeyFocus, setJourneyFocus] = useState<string | null>(null);
  const [recording, setRecording] = useState<QuickMode[] | null>(null);
  const [recordStart, setRecordStart] = useState<QuickMode | null>(null);
  /** Pasta (e ideia) com que o diário abre no registro. */
  // "Como foi a consulta?" pelo aviso: o Início abre já na pergunta.
  const [askVisit] = useState(takeVisitFromUrl);
  // O Tumtum de hoje: o aviso das 21h abre direto em fechar o dia.
  const [ritualOpen, setRitualOpen] = useState(takeRitualFromUrl);
  /** Compartilhar: a prévia do cartão aberta (stories ou post). */
  const [shareReq, setShareReq] = useState<ShareRequest | null>(null);
  // A espera (menino ou menina): a folha e a revelação, também pelos avisos.
  const [esperaOpen, setEsperaOpen] = useState(() => takeFlagFromUrl('espera'));
  const [revealSexOpen, setRevealSexOpen] = useState(() => takeFlagFromUrl('revelar'));
  // Fechar o dia grava no aparelho; a troca de estado só refaz a tela.
  const [, setClosedNow] = useState(0);
  // O Início aberto numa janela (a Jornada do bebê ou os Primeiros 7 dias): a chave remonta o Início.
  const [homeStart, setHomeStart] = useState<{ start: 'bebe' | 'missoes'; n: number } | null>(null);
  const [entryStart, setEntryStart] = useState<{ folder?: Folder; idea?: string; firstTime?: FirstTimeId }>({});
  const [namesOpen, setNamesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  // "Primeiros 7 dias": quando começou (neste aparelho) e se o casal pediu para esconder.
  const [firstDaysPrefs, setFirstDaysPrefs] = useState<{ start: string; hidden: boolean }>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FIRST_DAYS_KEY) ?? 'null') as { start?: string; hidden?: boolean } | null;
      if (saved?.start) return { start: saved.start, hidden: !!saved.hidden };
    } catch {
      /* sem armazenamento: começa hoje */
    }
    return { start: toISODate(new Date()), hidden: false };
  });
  const saveFirstDays = (next: { start: string; hidden: boolean }) => {
    setFirstDaysPrefs(next);
    try {
      localStorage.setItem(FIRST_DAYS_KEY, JSON.stringify(next));
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };
  /** A celebração aberta (Diário → Celebrações, Início ou Agenda). */
  const [celebrationOpen, setCelebrationOpen] = useState<string | null>(null);
  // A revelação do nome: para quem escolhe, na hora; para quem não estava (o parceiro, a família), na próxima vez que abre o app.
  const [revealSeen, setRevealSeen] = useState(nameSeen);
  const [revealAgain, setReveal] = useState<string | null>(null);
  // Gêmeos: "Helena e Theo" em todo o app, e só quando os dois nomes já foram
  // escolhidos (até lá, o app não chama os dois de "Helena", e a revelação espera).
  const fullName = !data?.babyName ? null : data.baby2Name ? `${data.babyName} e ${data.baby2Name}` : isTwins(data.espera) ? null : data.babyName;
  const babyNameNow = fullName;
  const reveal = revealAgain ?? (babyNameNow && revealSeen !== babyNameNow ? babyNameNow : null);
  // O aviso das duas vozes abre o registro direto no convite para completar.
  const [detail, setDetail] = useState<DetailTarget | null>(() => {
    const id = takeVoiceFromUrl();
    return id ? { kind: 'entry', id } : null;
  });

  // A cor principal segue a aba (index.css, data-aba); para o pai, o rosa vira azul (data-papel).
  useEffect(() => {
    document.documentElement.dataset.aba = activeTab;
    // Abrir o Diário conta como ver as novidades do Mural (o Início deixa de mostrá-las).
    if (activeTab === 'diario') markSeen(me.user.id);
  }, [activeTab, me.user.id]);
  useEffect(() => {
    document.documentElement.dataset.papel = author;
    return () => {
      delete document.documentElement.dataset.papel;
    };
  }, [author]);
  const [busy, setBusy] = useState(false);
  /** O passo da gravação em andamento ("Enviando foto 1 de 3"), no botão do formulário. */
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  /** O post que acabou de entrar no Mural, em destaque por alguns segundos. */
  const [freshEntry, setFreshEntry] = useState<string | null>(null);
  useEffect(() => {
    if (!freshEntry) return;
    const timer = window.setTimeout(() => setFreshEntry(null), 5000);
    return () => window.clearTimeout(timer);
  }, [freshEntry]);
  const savingState = useMemo(() => ({ busy, label: savingLabel }), [busy, savingLabel]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  /** "Entrou no livro": o fim bonito de uma lembrança nova. */
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const closeStamp = useCallback(() => setStamp(null), []);
  /** A devolutiva do sintoma recém-registrado. */
  const [echo, setEcho] = useState<SymptomEcho | null>(null);
  const closeEcho = useCallback(() => setEcho(null), []);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const deleteTimers = useRef(new Map<string, number>());
  const toastSeq = useRef(0);

  const now = new Date();
  const today = toISODate(now);
  const dumDate = data?.profile.dumDate ?? null;
  const age = dumDate ? gestationalAge(dumDate) : null;
  const currentWeek = age ? clampWeek(age.weeks) : FIRST_WEEK;
  const selectedWeek = pickedWeek ?? currentWeek;

  const showToast = (message: Omit<ToastMessage, 'id'>) => setToast({ ...message, id: ++toastSeq.current });
  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== 'cuidados') setReport(null);
    setExamPreset(null);
    setResultFrom(null);
    setFocusExam(null);
    setJourneyFocus(null);
    // Depois de fechar uma janela aberta (que trava a tela e devolve a rolagem ao sair).
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  /**
   * Executa uma alteração no banco e avisa se der errado. Retorna se deu certo.
   * O servidor devolve os dados atualizados na mesma resposta; sem eles, recarrega.
   * Com `done`, confirma com um aviso curto ("Sintoma registrado"); no erro, o
   * aviso fica até a pessoa fechar, com "Tentar de novo".
   */
  // Depois que o Início aparece, as partes sob demanda já vêm em segundo plano,
  // para estarem prontas no primeiro toque (sem pesar na abertura).
  useEffect(() => {
    const warm = () => {
      for (const load of [() => import('./components/BabyNames'), () => import('./components/Celebrations'), () => import('./components/tabs/ExamsTab'), () => import('./components/care/RecordList')]) load().catch(() => undefined);
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(warm) : window.setTimeout(warm, 1200);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
  }, []);
  // Depois de toques leves, uma sincronização só, em segundo plano, para vários toques seguidos.
  const syncTimer = useRef<number | null>(null);
  const syncSoon = () => {
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null;
      refresh().catch(() => undefined);
    }, 2500);
  };
  const run = async (action: () => Promise<unknown>, errorText = 'Não foi possível salvar. Verifique a conexão e tente de novo.', done?: string): Promise<boolean> => {
    setBusy(true);
    try {
      const result = (await action()) as { lite?: boolean; data?: unknown } | undefined;
      if (result?.data) replace(result.data);
      // Toque leve: a tela já mostra a mudança; sincroniza depois, sem esperar.
      else if (result?.lite) syncSoon();
      else await refresh();
      if (done) showToast({ text: done, tone: 'success' });
      return true;
    } catch (err) {
      console.error(err);
      // Desfaz o que foi mostrado antes da confirmação.
      refresh().catch(() => undefined);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onAccessLost();
        return false;
      }
      showToast({
        text: errorText,
        tone: 'error',
        actionLabel: 'Tentar de novo',
        onAction: () => {
          setToast(null);
          void run(action, errorText, done);
        },
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = (kind: DeletableKind, id: string) => {
    if (kind === 'entry') return api.mutate('deleteEntry', { id });
    if (kind === 'exam') return api.exams('delete', { id });
    if (kind === 'examFile') return api.exams('deleteFile', { id });
    if (kind === 'item') return api.mutate('deleteItem', { id });
    if (kind === 'thread') return api.mutate('deleteComment', { id });
    return api.mutate('delete', { kind, id });
  };

  /** Esconde o item na hora e só apaga no banco depois do prazo para desfazer. */
  const scheduleDelete = (kind: DeletableKind, id: string, label: string) => {
    const key = `${kind}:${id}`;
    const unhide = () =>
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

    const text = `Excluído: ${label}`;
    setPendingDeletes(prev => new Set(prev).add(key));
    const timer = window.setTimeout(async () => {
      deleteTimers.current.delete(key);
      const ok = await run(() => deleteItem(kind, id), 'Não foi possível excluir. O item voltou para a lista.');
      unhide();
      if (ok) setToast(t => (t?.text === text ? null : t));
    }, UNDO_WINDOW_MS);
    deleteTimers.current.set(key, timer);

    showToast({
      text,
      tone: 'info',
      actionLabel: 'Desfazer',
      onAction: () => {
        window.clearTimeout(deleteTimers.current.get(key));
        deleteTimers.current.delete(key);
        unhide();
        setToast(null);
      },
    });
  };

  const visible = <T extends { id: string }>(kind: DeletableKind, items: T[]) => items.filter(i => !pendingDeletes.has(`${kind}:${i.id}`));

  const saveDum = (iso: string) =>
    run(async () => {
      const result = await api.mutate('saveDum', { date: iso });
      setPickedWeek(null);
      return result;
    }, undefined, 'Data da gestação salva');

  const saveProfile = (preWeightKg: number, heightCm: number) => run(() => api.mutate('saveProfile', { preWeightKg, heightCm }), undefined, 'Dados salvos');

  const saveFicha = (f: FichaInput) => run(() => api.mutate('saveFicha', { ...f }), 'Não foi possível salvar os dados. Confira os campos e tente de novo.', 'Dados salvos');

  const saveKicks = (k: { startedAt: string; endedAt: string; kicks: number; target: number }) => run(() => api.mutate('saveKicks', k), undefined, 'Contagem de chutes salva');

  const saveContraction = (c: { startedAt: string; endedAt: string }) => run(() => api.mutate('saveContraction', c));

  const saveBirthPlan = (plan: BirthPlan) => run(() => api.mutate('saveBirthPlan', { plan }), undefined, 'Plano de parto salvo');

  // A tarefa nova aparece na hora (com um id provisório); o servidor confirma em seguida.
  const createTask = (t: NewTask) => {
    const week = t.week ?? (t.dueDate ? weekOfDay(dumDate!, t.dueDate) : currentWeek);
    patch(d => ({ ...d, tasks: [...d.tasks, { id: `nova-${Date.now()}`, week_number: week, task_title: t.title, assigned_to: t.assignee, is_completed: false, due_date: t.dueDate || null, priority: t.priority, notes: t.notes || null, created_by: author }] }));
    return run(() =>
      api.mutate('createTask', { week: t.week ?? (t.dueDate ? weekOfDay(dumDate!, t.dueDate) : currentWeek), title: t.title, assignee: t.assignee, priority: t.priority, dueDate: t.dueDate || null, notes: t.notes || null, ...reminderOf(t) }),
      undefined,
      'Tarefa criada',
    );
  };

  // Marcar e desmarcar aparece na hora; o servidor confirma em seguida.
  const toggleTask = (t: PartnerTask) => {
    patch(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, is_completed: !t.is_completed } : x)) }));
    return run(() => api.mutate('toggleTask', { id: t.id, done: !t.is_completed }));
  };

  // O sintoma salvo devolve na hora o que costuma ajudar e o padrão da semana (no lugar de "registrado").
  const createSymptom = async (s: NewSymptom) => {
    const before = symptoms;
    const ok = await run(() => api.mutate('createSymptom', { week: weekOfDay(dumDate!, s.date), date: s.date, name: s.name, intensity: s.intensity, category: s.category, notes: s.notes || null, timeOfDay: s.timeOfDay }));
    if (ok) setEcho(symptomEcho(s, before));
    return ok;
  };

  const createComment = (symptomId: string, text: string) => run(() => api.mutate('createComment', { symptomId, text }), undefined, 'Comentário enviado');

  const createQuestion = (text: string, category: string, specialty: SpecialtyId) =>
    run(() => api.mutate('createQuestion', { week: currentWeek, text, category, specialty }), undefined, 'Dúvida anotada para a consulta');

  const answerQuestion = (id: string, answer: string) => run(() => api.mutate('answerQuestion', { id, answer }), undefined, 'Resposta guardada');

  const createMetric = ({ date, ...m }: NewMetric) => run(() => api.mutate('createMetric', { week: weekOfDay(dumDate!, date), date, ...m }), 'Não foi possível salvar a medição.', 'Medição registrada');

  const setCheck = (list: 'prenatal' | 'mala', itemId: string, done: boolean, doneOn?: string) => {
    patch(d => ({
      ...d,
      checks: done ? [...d.checks.filter(c => !(c.list === list && c.item_id === itemId)), { list, item_id: itemId, done_at: doneOn ?? today }] : d.checks.filter(c => !(c.list === list && c.item_id === itemId)),
    }));
    return run(() => api.mutate('setCheck', { list, itemId, done, ...(doneOn ? { doneOn } : {}) }), 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/007_checklists.sql no Neon.');
  };

  /**
   * Registro do diário (novo ou editado): grava o texto e depois as fotos, uma
   * por vez. Se o registro foi guardado e uma foto falhou, avisa o que faltou.
   */
  const saveEntry = async (id: string | null, e: NewEntry, firstTime?: FirstTimeId) => {
    setBusy(true);
    setSavingLabel(id ? 'Salvando...' : 'Postando...');
    let entryId = id;
    try {
      const fields = { body: e.body, visibility: e.visibility, remindOn: e.remindOn, folder: e.folder, ...(e.remindAt === undefined ? {} : { remindAt: e.remindAt }) };
      if (id) await api.mutate('updateEntry', { id, ...fields });
      else entryId = ((await api.mutate('createEntry', { date: e.date, ...fields, ...(firstTime ? { firstTime } : {}) })) as { id?: string }).id ?? null;
      if (entryId) {
        for (const photoId of e.removePhotos) await api.photos('delete', { id: photoId });
        for (let i = 0; i < e.photos.length; i++) {
          const p = e.photos[i];
          const what = p.video ? 'o vídeo' : 'a foto';
          const label = e.photos.length > 1 ? `Enviando ${i + 1} de ${e.photos.length}` : `Enviando ${what}...`;
          setSavingLabel(label);
          if (p.video) await uploadVideo('entry', entryId, p.video, pct => setSavingLabel(`${label.replace(/\.\.\.$/, '')} · ${pct}%`));
          else await api.photos('add', { entryId, data: p.data, thumb: p.thumb });
        }
      }
      await refresh();
      if (!id) tumtum();
      // Lembrança nova (que vai para o livro): em vez de "Salvo", a folha do livro recebendo a lembrança.
      if (!id && e.visibility !== 'private') {
        setToast(null);
        const first = firstTimeOf(firstTime);
        setStamp({ text: e.body.trim().split('\n')[0].slice(0, 120) || (e.folder === 'barriga' ? 'A foto da barriga desta semana' : 'Uma foto para guardar'), week: weekOn(dumDate!, e.date), chapter: null, also: first ? `Primeira vez: ${first.title.toLowerCase()} · uma página especial no livro` : entryDone(false, e.visibility, e.folder) });
      } else showToast({ text: entryDone(!!id, e.visibility, e.folder), tone: 'success' });
      if (entryId && !id) setFreshEntry(entryId);
      // Guardou estando na capa do livro: vai ao Mural, onde o post novo aparece em destaque.
      // (Pelo álbum das primeiras vezes, fica no álbum, que mostra o cartão cheio.)
      if (entryId && !id && !firstTime && activeTab === 'diario' && (diaryView === 'livro' || diaryView === 'tudo')) setDiaryView('mural');
      return true;
    } catch (err) {
      console.error(err);
      refresh().catch(() => undefined);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onAccessLost();
        return false;
      }
      const reason = err instanceof ApiError ? err.message : 'Verifique a conexão e tente de novo.';
      // O registro novo já existe: o formulário fecha e o aviso diz o que faltou.
      if (entryId && !id) {
        showToast({ text: `Guardado, mas uma foto ou vídeo não foi enviado. ${reason}`, tone: 'error' });
        return true;
      }
      showToast({ text: `Não foi possível guardar. ${reason}`, tone: 'error' });
      return false;
    } finally {
      setBusy(false);
      setSavingLabel(null);
    }
  };
  const createEntry = (e: NewEntry) => saveEntry(null, e, entryStart.firstTime);

  /**
   * Exame novo (ou arquivos a mais num exame que já existe): grava o exame, envia os
   * arquivos um por vez e, se for da jornada, marca o item como feito.
   */
  const saveExam: SaveExam = async (exam, examId, files, onProgress) => {
    setBusy(true);
    setSavingLabel('Guardando...');
    let id = examId;
    try {
      if (!id && exam) id = (await api.exams<{ ok: true; id: string }>('create', { ...exam })).id;
      for (let i = 0; i < files.length; i++) {
        const label = files.length > 1 ? `Enviando ${i + 1} de ${files.length}` : files[i].video ? 'Enviando o vídeo' : 'Enviando o arquivo';
        setSavingLabel(`${label}...`);
        const video = files[i].video;
        if (video) await uploadVideo('exam', id!, video, pct => setSavingLabel(`${label} · ${pct}%`));
        else await api.exams('addFile', { examId: id, contentType: files[i].contentType, data: files[i].data });
        onProgress(i + 1);
      }
      if (exam?.planItem && !data?.checks.some(c => c.list === 'prenatal' && c.item_id === exam.planItem)) await api.mutate('setCheck', { list: 'prenatal', itemId: exam.planItem, done: true }).catch(() => undefined);
      await refresh();
      showToast({ text: examId ? (files.length > 1 ? 'Arquivos enviados' : 'Arquivo enviado') : 'Exame guardado', tone: 'success' });
      return null;
    } catch (err) {
      console.error(err);
      refresh().catch(() => undefined);
      if (err instanceof ApiError && err.status === 401) {
        onAccessLost();
        return 'Sua sessão terminou. Entre de novo.';
      }
      const reason = err instanceof ApiError ? err.message : 'Verifique a conexão e tente de novo.';
      // O exame já existe: o formulário fecha e o aviso diz o que faltou (dá para juntar o arquivo depois).
      if (id && !examId) {
        showToast({ text: `O exame foi guardado, mas um arquivo não foi enviado. ${reason}`, tone: 'error' });
        return null;
      }
      return examId ? `Não foi possível enviar. ${reason}` : `Não foi possível guardar. ${reason}`;
    } finally {
      setBusy(false);
      setSavingLabel(null);
    }
  };

  // Listas editáveis (mala e jornada).
  const addItem = (list: 'prenatal' | 'mala', title: string, bagGroup: string | null, week: number | null) =>
    run(() => api.mutate('addItem', { list, title, bagGroup, week }), 'Não foi possível adicionar. Se for a primeira vez, rode a migração 011 no Neon.', 'Item adicionado');
  const renameItem = (item: ListItem, title: string) => run(() => api.mutate('updateItem', { id: item.id, title, bagGroup: item.bag_group, week: item.week }), undefined, 'Item atualizado');
  const deleteListItem = (item: ListItem) => scheduleDelete('item', item.id, `"${item.title}"`);
  /** Planejado de um item: semanas (null volta à referência) e, com a migração 020, o combinado com a equipe. */
  const setPlan = (itemId: string, from: number | null, to: number | null, note?: string | null) => {
    patch(d => {
      const old = (d.planWeeks ?? []).find(w => w.item_id === itemId);
      const keepNote = note === undefined ? (old?.note ?? null) : note;
      const row = from !== null || keepNote ? [{ item_id: itemId, from, to, note: keepNote }] : [];
      return { ...d, planWeeks: [...(d.planWeeks ?? []).filter(w => w.item_id !== itemId), ...row] };
    });
    return run(() => api.mutate('setPlanWeeks', { itemId, from, to, ...(note === undefined ? {} : { note }) }), 'Não foi possível salvar o planejado. Se for a primeira vez, rode as migrações 019 e 020 no Neon.', 'Planejado salvo');
  };
  const hideItem = (list: 'prenatal' | 'mala', itemId: string, hidden: boolean) => {
    patch(d => ({ ...d, hiddenItems: hidden ? [...d.hiddenItems, { list, item_id: itemId }] : d.hiddenItems.filter(h => !(h.list === list && h.item_id === itemId)) }));
    if (hidden) showToast({ text: 'Item oculto. Ele fica em "Itens ocultos", no fim da lista.', tone: 'info' });
    return run(() => api.mutate('hideItem', { list, itemId, hidden }));
  };

  // Curtir e comentar. A reação aparece na hora; o servidor confirma em seguida.
  const react: OnReact = (targetType, targetId, kind, on) => {
    patch(d => ({
      ...d,
      reactions: on
        ? [...d.reactions, { target_type: targetType, target_id: targetId, kind, author_role: author, mine: true }]
        : d.reactions.filter(r => !(r.target_type === targetType && r.target_id === targetId && r.kind === kind && r.mine)),
    }));
    run(() => api.mutate('react', { targetType, targetId, kind, on }), 'Não foi possível reagir. Se for a primeira vez, rode a migração 011 no Neon.');
  };
  const sendThread = (targetType: 'entry' | 'exam', targetId: string, body: string) => run(() => api.mutate('comment', { targetType, targetId, body }), 'Não foi possível enviar o comentário.');
  const deleteThread = (c: ThreadComment) => scheduleDelete('thread', c.id, 'comentário');
  // A segunda voz num momento da outra pessoa (migração 030).
  // "Como foi a consulta?" (migração 032): guarda a resposta e leva ao próximo passo.
  const visitFeedback = (c: Consultation, status: VisitStatus) => {
    patch(d => ({ ...d, consultations: d.consultations.map(x => (x.id === c.id ? { ...x, after_status: status } : x)) }));
    void run(() => api.mutate('visitFeedback', { id: c.id, status }), 'Não foi possível guardar. Se for a primeira vez, rode a migração db/migrations/032_como_foi_a_consulta.sql no Neon.', status === 'bem' ? 'Que bom! Fica guardado na jornada de vocês' : undefined);
    if (status === 'duvida') {
      const next = consultations.filter(x => (x.kind ?? 'consulta') === 'consulta' && parseTimestamp(x.scheduled_at).getTime() > Date.now()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
      return next ? prepareReport(next) : openCare('inicio');
    }
    if (status === 'novidade') {
      const ultra = c.kind === 'ultrassom';
      writeEntry('momento', ultra ? 'No ultrassom de hoje, ' : 'Na consulta de hoje, ', ultra && !journal.some(e => e.first_time === 'ultrassom') ? 'ultrassom' : undefined);
    }
  };
  const setVoice = (id: string, body: string) => {
    patch(d => ({ ...d, journal: d.journal.map(e => (e.id !== id ? e : { ...e, voice_body: body || null, voice_role: body ? author : null, voice_mine: !!body, voice_at: body ? new Date().toISOString() : null })) }));
    return run(() => api.mutate('setVoice', { id, body }), 'Não foi possível guardar. Se for a primeira vez, rode a migração db/migrations/030_duas_vozes_e_horario.sql no Neon.', body ? 'A sua voz entrou no livro' : undefined);
  };

  // Edições feitas na janela de detalhes.
  const updateSymptom = (id: string, s: NewSymptom) =>
    run(() => api.mutate('updateSymptom', { id, week: weekOfDay(dumDate!, s.date), date: s.date, name: s.name, intensity: s.intensity, category: s.category, notes: s.notes || null, timeOfDay: s.timeOfDay }), undefined, 'Alterações salvas');
  const updateMetric = (id: string, { date, ...m }: NewMetric) => run(() => api.mutate('updateMetric', { id, week: weekOfDay(dumDate!, date), date, ...m }), 'Não foi possível salvar a medição.', 'Alterações salvas');
  const updateEntry = (id: string, e: NewEntry) => saveEntry(id, e);
  const updateTask = (id: string, t: NewTask) =>
    run(() => api.mutate('updateTask', { id, title: t.title, assignee: t.assignee, priority: t.priority, dueDate: t.dueDate || null, notes: t.notes || null, ...reminderOf(t) }), undefined, 'Alterações salvas');
  const updateConsultation = (id: string, c: NewConsultation) =>
    run(() => api.mutate('updateConsultation', { id, ...appointmentFields(c) }), appointmentError(c), 'Alterações salvas');
  const deleteDetail = (d: Detail) => {
    if (d.kind === 'symptom') scheduleDelete('symptom', d.item.id, d.item.symptom_name);
    else if (d.kind === 'metric') scheduleDelete('metric', d.item.id, `medição da semana ${d.item.week_number}`);
    else if (d.kind === 'entry') scheduleDelete('entry', d.item.id, 'momento');
    else if (d.kind === 'task') scheduleDelete('task', d.item.id, `tarefa "${d.item.task_title}"`);
    else scheduleDelete('consultation', d.item.id, 'consulta');
  };

  const createConsultation = (c: NewConsultation) =>
    run(() => api.mutate('createConsultation', appointmentFields(c)), appointmentError(c), appointmentDone(c));

  if (loadState !== 'ready' || !data) {
    return (
      <Shell>
        {loadState === 'loading' ? (
          <Skeleton label="Carregando os dados de vocês" />
        ) : (
          <Card className="text-center space-y-3 mt-8">
            <CloudRain className="w-8 h-8 mx-auto text-ink-mute" />
            <p className="font-semibold text-ink">Não foi possível carregar os dados.</p>
            <p className="text-sm text-ink-soft">Confiram a conexão e tentem de novo. Nada é exibido até a conexão voltar, para não mostrar informação errada.</p>
            <button onClick={retry} className="bg-brand text-on-accent font-semibold px-5 py-2.5 rounded-2xl text-sm">Tentar de novo</button>
          </Card>
        )}
      </Shell>
    );
  }

  const header = (
    <Header
      firstName={(family.members.find(m => m.me)?.name ?? me.user.name).split(' ')[0]}
      members={family.members}
      greeting={greetingFor(now.getHours())}
      onOpenSpace={() => setSpaceOpen(true)}
      // O "?" no topo acompanha as duas primeiras semanas; depois, a ajuda mora no "Nosso espaço".
      onHelp={daysBetween(parseLocalDate(firstDaysPrefs.start), now) < 14 ? () => setHelpOpen(true) : undefined}
      title={activeTab === 'inicio' || !age ? undefined : TITLE[activeTab]}
      week={age && !care ? currentWeek : null}
    />
  );
  const setCareMode = (on: boolean) => {
    patch(d => ({ ...d, careSince: on ? (d.careSince ?? today) : null }));
    return run(() => api.mutate('setCareMode', { on }), 'Não foi possível mudar o modo cuidado. Se for a primeira vez, rode a migração db/migrations/029_modo_cuidado.sql no Neon.');
  };
  const spaceSheet = (
    <Suspense fallback={null}>
      {spaceOpen && (
        <SpaceSheet
          me={me}
          family={family}
          onClose={() => setSpaceOpen(false)}
          onFamilyChange={onFamilyChange}
          onSignOut={onSignOut}
          onAccountDeleted={onSignOut}
          careSince={data.careSince ?? null}
          onCareMode={setCareMode}
          onHelp={() => (setSpaceOpen(false), setHelpOpen(true))}
        />
      )}
    </Suspense>
  );

  if (!dumDate || !age) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        {header}
        <main className="max-w-xl mx-auto px-4 py-6">
          <Card tone="warm" className="space-y-4">
            <Sprout className="w-8 h-8 text-warm" />
            <h2 className="text-xl font-semibold text-ink">{dumDate ? 'A DUM cadastrada está no futuro' : 'Vamos começar pela DUM'}</h2>
            <p className="text-ink-soft">Com a data da última menstruação, o app calcula a semana, o trimestre e a data provável do parto.</p>
            <DumForm initial={dumDate ?? undefined} onSave={saveDum} />
          </Card>
        </main>
        {spaceSheet}
      </div>
    );
  }

  const profile = { ...data.profile, dumDate };
  const symptoms = visible('symptom', data.symptoms);
  const metrics = visible('metric', data.metrics);
  const end = parseLocalDate(today);
  const recentInsights = [
    ...pressureInsights(metrics, { from: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 13), to: end }),
    ...findPatterns(toEntries(symptoms), { from: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 27), to: end }),
  ];
  const tasks = visible('task', data.tasks);
  const journal = visible('entry', data.journal);
  // Feito = marcado pelo casal ou comprovado pelo uso (consulta de obstetra realizada, agendamento da jornada que já passou).
  const autoSteps = new Set([...autoDone(visitsOf(data.consultations.filter(isConsultation), dumDate, now)), ...doneByAppointments(data.consultations, now)]);
  const doneSteps = new Set([...data.checks.filter(c => c.list === 'prenatal').map(c => c.item_id), ...autoSteps, ...(data.exams ?? []).flatMap(e => (e.plan_item ? [e.plan_item] : []))]);
  const packed = new Set(data.checks.filter(c => c.list === 'mala').map(c => c.item_id));
  const listItems = visible('item', data.listItems ?? []);
  const reactions = data.reactions ?? [];
  const threads = visible('thread', data.threads ?? []);
  const socialAvailable = data.socialAvailable ?? false;
  const hiddenOf = (list: 'prenatal' | 'mala') => new Set((data.hiddenItems ?? []).filter(h => h.list === list).map(h => h.item_id));
  const hiddenSteps = hiddenOf('prenatal');
  // Jornada: o planejado (com as semanas ajustadas e os itens do casal) × o realizado.
  const journeyItems = plannedItems(planFor(data.profile.bloodType, hiddenSteps), data.planWeeks ?? [], listItems.filter(i => i.list === 'prenatal'));
  const journey = journeyRows(journeyItems, { week: currentWeek, dumDate, now, checks: data.checks, consultations: visible('consultation', data.consultations), exams: data.exams ?? [], autoDone: autoSteps });
  const exams = visible('exam', data.exams ?? []).map(e => ({ ...e, files: e.files.filter(f => !pendingDeletes.has(`examFile:${f.id}`)) }));
  const overdueTasks = tasks.filter(t => !t.is_completed && isOverdue(t.due_date)).length;
  const questions = visible('question', data.questions);
  const comments = visible('comment', data.comments);
  const consultations = visible('consultation', data.consultations);
  // O livro de vocês: no Diário → Livro, no Mural (a página nova) e no Início (o capítulo sendo escrito).
  // Algo novo do outro no Mural (post ou comentário) desde a última visita ao Diário: o coração do menu bate.
  const diaryNews = activeTab !== 'diario' && (() => {
    const n = partnerNews(journal, threads, family.members, lastSeen(me.user.id));
    return n.entries.length + n.comments.length > 0;
  })();
  const book = buildBook({ dumDate, today: new Date(), journal, reactions: socialAvailable ? reactions : [], threads, hugs: data.hugs ?? [], consultations, exams, checkins: data.checkins ?? [], babyName: data.babyName, babyNameAt: data.babyNameAt, nameIdeas: data.nameIdeas, roles: family.members.flatMap(m => (m.role === 'mae' || m.role === 'pai' ? [m.role] : [])) });
  // O livro impresso (pré-venda): o que ele já tem, quantas páginas teria e a reserva.
  const printedStuff = bookStuff({ book, journal, dumDate, espera: data.espera, finalists: (data.nameIdeas ?? []).filter(i => i.finalist).length, babyName: data.babyName ?? null, threads, checkins: data.checkins ?? [] });
  const printedPages = estimatePages(printedStuff, 'tudo', DEFAULT_INCLUDE);
  const reserveBook = (r: BookReservation) => run(() => api.mutate('reserveBook', { ...r }), 'Não foi possível reservar agora. Se for a primeira vez, rode a migração db/migrations/038_livro_impresso.sql no Neon.');
  const cancelBook = () => run(() => api.mutate('cancelBook', {}), 'Não foi possível cancelar agora. Verifique a conexão.', 'Reserva cancelada');
  const prepareReport = (c: Consultation) => {
    setReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id });
    setActiveTab('cuidados');
    setCareView('inicio');
    window.scrollTo({ top: 0 });
  };
  /** Cuidados: a página única ou uma das que abrem dela (sempre do topo). */
  const openCare = (view: CareView) => {
    navigate('cuidados');
    setReport(null);
    setCareView(view);
    window.scrollTo({ top: 0 });
  };
  /** Cuidados → Jornada; com um item, já abre o pop-up dele (vindo de um agendamento ou resultado). */
  const openJourney = (itemId?: string) => {
    openCare('jornada');
    setJourneyFocus(itemId ?? null);
  };
  const openDashboardView = (v: DashboardView) => openCare(v === 'corpo' ? 'medidas' : 'sintomas');
  /** Abre o registro do diário já numa pasta (sem pasta, ela acompanha o texto). */
  const writeEntry = (folder?: Folder, idea?: string, firstTime?: FirstTimeId) => {
    setEntryStart({ folder, idea, firstTime });
    setRecording(RECORD_MODES.diario);
  };
  /** Exame ou ultrassom agendado: abre o resultado guardado, ou o formulário já preenchido. */
  const openResult = (c: Consultation) => {
    const done = resultOf(c, data.exams ?? []);
    openCare('exames');
    if (done) setFocusExam(done.id);
    else setResultFrom(c);
  };
  const openExam = (id: string) => {
    openCare('exames');
    setFocusExam(id);
  };
  // Primeiro nome da outra pessoa do espaço, para o Início ("Caio hoje: bem").
  const partner = family.members.find(m => !m.me);
  const partnerName = partner ? partner.name.split(' ')[0] || null : null;
  /** Check-in do dia: aparece na hora; o servidor confirma em seguida. */
  const checkin = (mood: Mood | null) => {
    patch(d => ({
      ...d,
      checkins: [...(mood ? [{ day: today, mood, author_role: author, mine: true }] : []), ...(d.checkins ?? []).filter(c => !(c.mine && c.day === today))],
    }));
    return run(() => api.mutate('checkin', { day: today, mood }), 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/014_checkin.sql no Neon.');
  };
  /** Fechar o dia: o humor e a frase viram a página do dia no livro; a outra pessoa recebe um aviso. */
  const closeDay = async (mood: Mood | null, body: string) => {
    const ok = await run(() => api.mutate('closeDay', { day: today, mood, body }), 'Não foi possível fechar o dia. Verifique a conexão e tente de novo.');
    if (!ok) return false;
    tumtum();
    markClosed(me.user.id, today);
    setClosedNow(n => n + 1);
    if (body && dumDate) setStamp({ text: body.split('\n')[0].slice(0, 120), week: weekOn(dumDate, today), chapter: null, also: partnerName ? `No Dia a dia, para você e ${partnerName}` : 'No Dia a dia' });
    else showToast({ text: 'Dia fechado. Boa noite 💛', tone: 'success' });
    return true;
  };
  /** Conta (sem conteúdo) o que mostra valor: compartilhar e pedir o livro impresso. Falhar não incomoda ninguém. */
  const track = (kind: ShareKind | 'livro_impresso') => void api.mutate('track', { kind }).catch(() => undefined);
  const share = (card: CardContent, kind: ShareKind) => setShareReq({ card, kind, fileName: kind === 'cartao_semana' ? `tumtum-semana-${currentWeek}` : kind === 'cartao_contagem' ? 'tumtum-contagem' : `tumtum-${kind.replace('cartao_', '')}` });
  const shareEntry = (e: JournalEntry) => {
    if (!dumDate) return;
    const firstBelly = [...bellyShots(journal, dumDate)].sort((a, b) => a.week - b.week)[0];
    const who = authorOf(family.members, e.mine, e.author_role);
    setShareReq(
      entryShare(e, {
        author: (who && firstName(who.name)) || (e.author_role === 'pai' ? 'Pai' : 'Mãe'),
        week: weekOn(dumDate, e.entry_date),
        date: parseLocalDate(e.entry_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', ''),
        photo: p => photoUrl(p.id, !!p.video && p.thumb),
        firstBelly: firstBelly ? { week: firstBelly.week, photo: photoUrl(firstBelly.photo.id) } : null,
        babyName: data.babyName ?? null,
      }),
    );
  };
  const ESPERA_MISSING = 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/035_a_espera.sql no Neon.';
  const longDate = (iso: string) => parseLocalDate(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const esperaActions = {
    onPlan: (plan: SexPlan | null, testDate: string | null) => run(() => api.mutate('setSexPlan', { plan, testDate }), ESPERA_MISSING),
    onGuess: (guess: Sex | null) => {
      return run(() => api.mutate('guessSex', { guess }), ESPERA_MISSING);
    },
    onRegister: async (sex: Sex | null, secret: boolean) => {
      const ok = await run(() => api.mutate('setSex', { sex, secret }), ESPERA_MISSING, secret && sex ? `Guardado no envelope para ${partnerName ?? 'a outra pessoa'} 💌` : undefined);
      if (ok && sex && !secret) {
        tumtum();
        setEsperaOpen(false);
        setRevealSexOpen(true);
      }
      return ok;
    },
    onShare: (kind: 'teaser' | 'surpresa' | 'revelacao') => shareEspera(kind),
    onNames: () => {
      setEsperaOpen(false);
      setNamesOpen(true);
    },
    onReveal: () => {
      setEsperaOpen(false);
      setRevealSexOpen(true);
    },
    onInvite: () => void inviteToBolao(),
    onBabies: (babies: 1 | 2) => run(() => api.mutate('setBabies', { babies }), 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/037_gemeos.sql no Neon.', babies === 2 ? 'Gêmeos! 👶👶' : undefined),
    onEnvelopeLink: () => void sendLink('envelopeLink', envelopeUrl, 'Você foi escolhida(o) para guardar o nosso segredo 💌 Quando souber se é menino ou menina, registre aqui (a gente só vai ver na hora do chá):', 'Link do envelope copiado. Mande só para quem vai guardar o segredo 💌'),
  };
  /** Cria o link (bolão ou envelope) e abre o compartilhar do celular; sem ele, copia. */
  const sendLink = async (op: 'bolaoLink' | 'envelopeLink', url: (t: string) => string, text: string, copied: string) => {
    let token: string | undefined;
    const ok = await run(async () => {
      const res = (await api.mutate(op, {})) as { data?: { espera?: { bolaoToken?: string | null; envelopeToken?: string | null } } };
      token = (op === 'bolaoLink' ? res.data?.espera?.bolaoToken : res.data?.espera?.envelopeToken) ?? undefined;
      return res;
    }, ESPERA_MISSING);
    if (!ok || !token) return;
    const link = url(token);
    try {
      if (navigator.share) {
        await navigator.share({ text: `${text} ${link}` });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${link}`);
      showToast({ text: copied, tone: 'success' });
    } catch {
      showToast({ text: link, tone: 'success' });
    }
  };
  /** Chamar mais gente: garante o link do bolão aberto e abre o cartão do placar, com o link junto. */
  const inviteToBolao = async () => {
    let token = data.espera?.bolaoToken ?? undefined;
    let fresh = data.espera;
    if (!token) {
      const ok = await run(async () => {
        const res = (await api.mutate('bolaoLink', {})) as { data?: { espera?: typeof data.espera } };
        fresh = res.data?.espera ?? fresh;
        token = fresh?.bolaoToken ?? undefined;
        return res;
      }, ESPERA_MISSING);
      if (!ok || !token) return;
    }
    if (!fresh) return;
    const link = bolaoUrl(token);
    const t = tally(fresh);
    const couple = family.members.map(m => firstName(m.name)).filter(Boolean).join(' e ');
    setShareReq({
      card: placarCard({ options: t.options, counts: t.counts, teams: teamsOf(fresh, firstName(family.members.find(m => m.me)?.name ?? '') || 'Eu'), testDate: fresh.testDate ? longDate(fresh.testDate) : null, surprise: fresh.plan === 'surpresa' }),
      kind: 'cartao_espera',
      fileName: 'tumtum-bolao',
      text: `${questionFor(isTwins(fresh))} 💌 Entra no bolão${couple ? ` de ${couple}` : ''} e escolhe o seu time: ${link}`,
      link,
    });
  };
  const shareEspera = (kind: 'teaser' | 'surpresa' | 'revelacao') => {
    const e = data.espera;
    if (!e) return;
    if (kind === 'revelacao' && e.sex) {
      const day = e.knownAt ? toISODate(parseTimestamp(e.knownAt)) : today;
      const t = tally(e);
      const winners = teamsOf(e, firstName(family.members.find(m => m.me)?.name ?? '') || 'Eu')[e.sex];
      return share(revealCard({ sex: e.sex, week: dumDate ? weekOn(dumDate, day) : currentWeek, date: longDate(day), right: rightCount(e), winners, share: percents(t.options.map(o => t.counts[o] ?? 0))[t.options.indexOf(e.sex)] }), 'cartao_revelacao');
    }
    if (kind === 'surpresa') return share(surpriseCard({ daysToDpp: age?.daysToDpp ?? 0 }), 'cartao_espera');
    const t = tally(e);
    share(teaserCard({ testDate: e.testDate ? longDate(e.testDate) : null, menina: t.menina, menino: t.menino }), 'cartao_espera');
  };
  const shareFinalists = (names: string[]) => share(finalistsCard({ names, sex: data.espera?.sex ?? null }), 'cartao_finalistas');
  const shareName = () => {
    if (!data.babyName || !dumDate) return;
    const at = data.babyNameAt ? parseTimestamp(data.babyNameAt) : null;
    share(nameCard({ name: data.babyName, date: at ? at.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : null, week: at ? weekOn(dumDate, toISODate(at)) : currentWeek }), 'cartao_nome');
  };
  // O tom do bebê aparece na hora; o servidor confirma em seguida.
  // O nome do bebê aparece na hora em todo o app; o servidor confirma em seguida.
  /** Gêmeos: o nome do segundo bebê. */
  const setBaby2Name = (name: string | null) => {
    patch(d => ({ ...d, baby2Name: name }));
    return run(() => api.mutate('setBabyName', { name, which: 2 }), 'Não foi possível salvar o nome. Se for a primeira vez, rode a migração db/migrations/037_gemeos.sql no Neon.', name ? 'Nome guardado' : undefined);
  };
  const setBabyName = (name: string | null) => {
    patch(d => ({ ...d, babyName: name }));
    return run(() => api.mutate('setBabyName', { name }), 'Não foi possível salvar o nome. Se for a primeira vez, rode a migração db/migrations/025_nome_do_bebe.sql no Neon.', name ? 'Nome guardado' : undefined);
  };
  // A escolha do nome: ideias, curtidas (aparecem na hora) e a escolha, que vira festa e pode ir para o Mural.
  const NAMES_MISSING = 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/026_nomes_do_bebe.sql no Neon.';
  const CADERNO_MISSING = 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/027_caderno_do_nome.sql no Neon.';
  const nameActions: NameActions = {
    onAdd: (name, note, forSex) => run(() => api.mutate('addNameIdea', { name, ...(note ? { note } : {}), ...(forSex && forSex !== 'ambos' ? { forSex } : {}) }), NAMES_MISSING, 'Anotado no caderno de nomes'),
    onTag: data.espera
      ? (id, f) => {
          patch(d => ({ ...d, nameIdeas: (d.nameIdeas ?? []).map(i => (i.id !== id ? i : { ...i, ...(f.forSex ? { for_sex: f.forSex } : {}), ...(f.finalist !== undefined ? { finalist: f.finalist } : {}) })) }));
          return run(() => api.mutate('tagNameIdea', { id, ...f }), 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/035_a_espera.sql no Neon.');
        }
      : undefined,
    onNote: (id, note) => run(() => api.mutate('noteNameIdea', { id, note }), CADERNO_MISSING),
    onComment: (id, body) => run(() => api.mutate('commentNameIdea', { id, body }), CADERNO_MISSING),
    onDeleteComment: id => run(() => api.mutate('deleteNameComment', { id }), CADERNO_MISSING),
    onLike: (id, on) => {
      patch(d => ({
        ...d,
        nameIdeas: (d.nameIdeas ?? []).map(i => (i.id !== id ? i : { ...i, likes: on ? [...i.likes.filter(l => !l.mine), { user_id: 'eu', author_role: author, mine: true }] : i.likes.filter(l => !l.mine) })),
      }));
      return run(() => api.mutate('likeNameIdea', { id, on }), NAMES_MISSING);
    },
    onDelete: id => run(() => api.mutate('deleteNameIdea', { id }), NAMES_MISSING),
    // Gêmeos: o primeiro nome escolhido é o do primeiro bebê; o segundo, do segundo.
    onChoose: name => (isTwins(data.espera) && data.babyName && !data.baby2Name ? setBaby2Name(name) : setBabyName(name)),
    onShareChoice: name => run(() => api.mutate('createEntry', { date: today, body: `Escolhemos o nome: ${name} 💛`, visibility: 'shared', remindOn: null, folder: 'momento' }), 'Não foi possível postar no Mural.', 'Guardado no Mural'),
  };
  // Celebrações: o casal planeja (migração 028). Ao criar uma, ela já abre.
  const PARTY_MISSING = 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/028_celebracoes.sql no Neon.';
  const celebrationActions: CelebrationActions = {
    create: async (kind, f) => {
      const before = new Set((data.celebrations ?? []).map(c => c.id));
      const ok = await run(() => api.mutate('createCelebration', { kind, ...f }), PARTY_MISSING, 'Celebração criada');
      if (ok) {
        const fresh = await api.data<{ celebrations?: Celebration[] | null }>().catch(() => null);
        const created = fresh?.celebrations?.find(c => !before.has(c.id));
        if (created) setCelebrationOpen(created.id);
      }
      return ok;
    },
    update: (id, f) => run(() => api.mutate('updateCelebration', { id, ...f }), PARTY_MISSING, 'Celebração atualizada'),
    remove: id => run(() => api.mutate('deleteCelebration', { id }), PARTY_MISSING, 'Celebração apagada'),
    addItem: (celebrationId, kind, f) => run(() => api.mutate('addCelebrationItem', { celebrationId, kind, ...f }), PARTY_MISSING),
    updateItem: (id, f) => {
      // A ficha muda na hora (as telas mandam sempre a ficha inteira); o servidor confirma em seguida.
      const next = (i: CelebrationItem): CelebrationItem => ({ ...i, title: f.title, due_date: f.dueDate ?? null, due_offset: f.dueOffset ?? null, assigned_to: f.assignedTo ?? null, done: f.done ?? false, contact: f.contact ?? null, amount: f.amount == null ? null : String(f.amount), status: f.status ?? null, people: f.people ?? null, notes: f.notes ?? null });
      patch(d => ({ ...d, celebrations: (d.celebrations ?? []).map(c => ({ ...c, items: c.items.map(i => (i.id !== id ? i : next(i))) })) }));
      return run(() => api.mutate('updateCelebrationItem', { id, ...f }), PARTY_MISSING);
    },
    removeItem: id => run(() => api.mutate('deleteCelebrationItem', { id }), PARTY_MISSING),
  };
  const setBabyTone = (tone: BabyTone) => {
    patch(d => ({ ...d, babyTone: tone }));
    return run(() => api.mutate('setBabyTone', { tone }), 'Não foi possível salvar o tom. Se for a primeira vez, rode a migração db/migrations/024_tom_do_bebe.sql no Neon.');
  };
  const hug = () => {
    tumtum();
    patch(d => ({ ...d, hugs: [...(d.hugs ?? []), { day: today, toMe: false }] }));
    return run(() => api.mutate('hug', { day: today }), 'Não foi possível mandar o abraço. Verifique a conexão.', 'Abraço enviado');
  };
  // "Quer contar no Mural?" depois do check-in: vira um registro do dia a dia, para os dois.
  const shareMood = (body: string) =>
    run(() => api.mutate('createEntry', { date: today, body, visibility: 'shared', remindOn: null, folder: 'dia' }), 'Não foi possível postar no Mural.', 'Postado no Mural');
  // "Ir para lá" da Central de Ajuda: fecha a ajuda e leva à tela certa.
  const openHome = (start: 'bebe' | 'missoes') => {
    setHomeStart(h => ({ start, n: (h?.n ?? 0) + 1 }));
    navigate('inicio');
  };
  const goHelp = (target: HelpTarget) => {
    setHelpOpen(false);
    if (target === 'espaco') return setSpaceOpen(true);
    if (target === 'nomes') return setNamesOpen(true);
    if (target === 'parto') return navigate('parto');
    if (target === 'calendario') {
      setCalendarFocus(null);
      setAgendaView('calendario');
      return navigate('agenda');
    }
    if (target === 'celebracoes' || target === 'fichario') {
      setDiaryView(target === 'fichario' ? 'tudo' : 'celebracoes');
      return navigate('diario');
    }
    if (target === 'bebe') return openHome('bebe');
    openFromHome(target);
  };
  const openFromHome = (target: HomeTarget, planItem?: string) => {
    if (target === 'diario') return navigate('diario');
    if (target === 'mural' || target === 'humor' || target === 'barriga' || target === 'livro') {
      setDiaryView(target);
      return navigate('diario');
    }
    if (target === 'saude') return openCare('inicio');
    if (target === 'graficos') return openDashboardView('sintomas');
    if (target === 'medidas') return openDashboardView('corpo');
    if (target === 'jornada') return openJourney();
    if (target === 'tarefas' || target === 'agenda') {
      navigate('agenda');
      return setAgendaView(target === 'tarefas' ? 'tarefas' : 'proximos');
    }
    openCare('exames');
    setExamPreset(planItem ?? null);
  };
  // Onde a aba não tem tipos próprios (Parto, a jornada, as celebrações), o Registrar oferece todos, como no Início.
  const tabModes = report || (activeTab === 'diario' && diaryView === 'celebracoes') ? [] : activeTab === 'cuidados' ? CARE_MODES[careView] : RECORD_MODES[activeTab];
  const recordModes = tabModes.length ? tabModes : RECORD_MODES.inicio;
  /** O Registrar, no centro do menu: a pergunta do que guardar, com os tipos desta aba. */
  const startRecord = () => {
    if (activeTab === 'diario' && tabModes.length) return writeEntry(diaryView === 'tudo' || diaryView === 'mural' || diaryView === 'livro' || diaryView === 'celebracoes' || diaryView === 'humor' ? undefined : diaryView);
    setEntryStart({});
    // No Início, o Registrar segue o momento: voltando de uma consulta hoje, abre em "Resultado".
    const backFromVisit = activeTab === 'inicio' && consultations.some(c => { const at = parseTimestamp(c.scheduled_at); return toISODate(at) === toISODate(new Date()) && at.getTime() < Date.now(); });
    setRecordStart(backFromVisit ? 'exame' : null);
    setRecording(recordModes);
  };
  // O registro aberto nos detalhes, com os dados atuais (some se foi apagado).
  const openDetail = resolveDetail(detail, {
    symptoms,
    comments,
    metrics,
    journal,
    tasks,
    consultations,
    pendingQuestions: specialty => questions.filter(q => !q.doctor_answer && questionSpecialty(q.specialty) === specialty).length,
  });
  // Os gráficos de Cuidados, com os registros do período embaixo.
  const dashboard = (view: DashboardView) => (
    <DashboardTab
      age={age}
      profile={profile}
      symptoms={symptoms}
      comments={comments}
      metrics={metrics}
      migrationPending={data.migrationPending}
      busy={busy}
      onSaveProfile={saveProfile}
      currentWeek={currentWeek}
      view={view}
      records={period => (
        <RecordList
          symptoms={view === 'sintomas' ? symptoms.filter(s => inPeriod(parseLocalDate(s.log_date.slice(0, 10)), period)) : []}
          metrics={view === 'corpo' ? metrics : []}
          comments={comments}
          reactions={socialAvailable ? reactions : []}
          onOpen={setDetail}
          empty={view === 'sintomas' ? 'Nenhum sintoma neste período.' : 'Nenhuma medição ainda. Toque em Registrar.'}
        />
      )}
    />
  );

  return (
    <SavingContext.Provider value={savingState}>
    <FreshEntryContext.Provider value={freshEntry}>
    <BabyNameContext.Provider value={fullName}>
    <PeopleContext.Provider value={family.members}>
    <RelativesContext.Provider value={family.relatives ?? []}>
    <JourneyContext.Provider value={{ items: journeyItems, done: doneSteps, consultations, dumDate }}>
    <AttendeesReady.Provider value={data.attendeesAvailable ?? false}>
    <TaskRemindersReady.Provider value={data.taskRemindersAvailable ?? false}>
    <TimedRemindersReady.Provider value={data.timedRemindersAvailable ?? false}>
    <div className="min-h-screen bg-canvas text-ink pb-32 md:pb-12">
      {header}
      <Nav
        onRecord={startRecord}
        active={activeTab}
        onChange={tab => {
          // O menu Agenda sempre começa em "Próximos"; o calendário se abre pelo atalho do Início ou pela aba dele.
          if (tab === 'agenda' && activeTab !== 'agenda') setAgendaView('proximos');
          // Cuidados sempre começa na página única (de onde se abre o resto).
          if (tab === 'cuidados') {
            setCareView('inicio');
            setReport(null);
          }
          // O Parto também volta para a página das fases.
          if (tab === 'parto') setLaborReset(n => n + 1);
          // O Diário abre no Mural quando há algo novo para ver ali (do outro, ou o post que a pessoa
          // acabou de guardar, em destaque); no resto do tempo, no Livro.
          if (tab === 'diario' && activeTab !== 'diario') {
            const justPosted = journal.some(e => e.mine && e.created_at && Date.now() - parseTimestamp(e.created_at).getTime() < 30 * 60_000);
            setDiaryView(diaryNews || justPosted || freshEntry ? 'mural' : 'livro');
          }
          navigate(tab);
        }}
        pulse={{ diario: diaryNews }}
        hidden={care ? ['parto'] : []}
        // Selo só para o que pede ação: tarefas atrasadas. (As dúvidas ficam no cartão da consulta, em Cuidados.)
        badges={{ agenda: overdueTasks }}
      />

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <Suspense
          fallback={<Skeleton label="Abrindo" />}
        >
        {/* A aba nova chega deslizando de leve (a chave troca com a aba). */}
        <div key={activeTab} className="tt-aba">
        {data.migrationPending && activeTab === 'inicio' && (
          <p className="no-print mb-4 text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">
            Atualização do banco pendente: rodem <code>db/migrations/002_consultas_e_padroes.sql</code> no Neon para liberar a agenda de consultas, o período do dia dos sintomas e a faixa de peso.
          </p>
        )}

        {activeTab === 'inicio' && care && (
          <CareModeHome
            role={author}
            partnerName={partnerName}
            checkins={data.checkins ?? []}
            hugs={data.hugs ?? []}
            checkinAvailable={data.checkinAvailable ?? false}
            onCheckin={checkin}
            onHug={hug}
            onWrite={writeEntry}
            onBook={() => openFromHome('livro')}
          />
        )}
        {activeTab === 'inicio' && !care && (
          <HomeTab
            key={homeStart?.n ?? 0}
            start={homeStart?.start ?? null}
            firstDays={firstDaysPrefs.hidden ? null : firstDaysPrefs.start}
            onHideFirstDays={() => saveFirstDays({ ...firstDaysPrefs, hidden: true })}
            onInvite={() => setSpaceOpen(true)}
            onWriteLetter={() => writeEntry('carta')}
            babyTone={data.babyTone ?? 'tumtum'}
            onBabyTone={setBabyTone}
            age={age}
            dumDate={dumDate}
            selectedWeek={selectedWeek}
            currentWeek={currentWeek}
            onSelectWeek={setPickedWeek}
            onSaveDum={saveDum}
            insights={recentInsights}
            role={author}
            partnerName={partnerName}
            consultations={consultations}
            tasks={tasks}
            journal={journal}
            exams={exams}
            checkins={data.checkins ?? []}
            checkinAvailable={data.checkinAvailable ?? false}
            hugs={data.hugs ?? []}
            onCheckin={checkin}
            onHug={hug}
            onShareMood={data.journalAvailable ? shareMood : undefined}
            onOpen={openFromHome}
            book={book}
            nameIdeas={data.nameIdeas}
            onOpenNames={() => setNamesOpen(true)}
            celebrations={data.celebrations}
            onOpenCelebration={setCelebrationOpen}
            onOpenDetail={setDetail}
            onResult={openResult}
            bellyAvailable={!!data.journalAvailable && (data.photosAvailable ?? false)}
            onBellyPhoto={() => writeEntry('barriga')}
            symptoms={symptoms}
            userId={me.user.id}
            reactions={data.reactions ?? []}
            onWrite={writeEntry}
            onVisitFeedback={visitFeedback}
            onShare={share}
            espera={data.espera}
            onOpenEspera={data.espera ? () => setEsperaOpen(true) : undefined}
            onOpenReveal={() => setRevealSexOpen(true)}
            ritual={data.journalAvailable ? { closed: dayClosed(me.user.id, today, data.journal ?? [], data.checkins ?? []), partner: partnerDay(data.checkins ?? [], data.journal ?? [], today), onOpen: () => setRitualOpen(true) } : undefined}
            askVisit={askVisit}
            openQuestions={questions.filter(q => !q.doctor_answer).length}
          />
        )}

        {activeTab === 'diario' && (
          <DiaryTab
            view={diaryView}
            onView={v => {
              setDiaryView(v);
              window.scrollTo({ top: 0 });
            }}
            journal={journal}
            journalAvailable={data.journalAvailable}
            photosAvailable={data.photosAvailable ?? false}
            dumDate={dumDate}
            reactions={socialAvailable ? reactions : []}
            threads={threads}
            members={family.members}
            role={author}
            checkins={data.checkins ?? []}
            socialAvailable={socialAvailable}
            onReact={react}
            onComment={(id, body) => sendThread('entry', id, body)}
            onOpen={setDetail}
            onWrite={writeEntry}
            onOpenHealth={() => openCare('inicio')}
            book={book}
            babyTone={data.babyTone ?? 'tumtum'}
            onOpenNames={() => setNamesOpen(true)}
            onWantPrinted={BOOK_PREORDER ? () => track('livro_impresso') : undefined}
            printed={BOOK_PREORDER && data.book ? <PrintedBookCard pages={printedPages} order={data.book.order} gifts={data.book.gifts.map(g => g.name)} onOpen={() => (data.book?.order || track('livro_impresso'), setBookOpen(true))} /> : undefined}
            celebrations={data.celebrations}
            celebrationActions={celebrationActions}
            onOpenCelebration={setCelebrationOpen}
          />
        )}

        {activeTab === 'agenda' && (
          <>
            <SubTabs
              label="Parte da agenda"
              value={agendaView}
              onChange={v => {
                setAgendaView(v);
                setJourneyFocus(null);
                window.scrollTo({ top: 0 });
              }}
              options={[
                { value: 'proximos', label: 'Próximos' },
                { value: 'calendario', label: 'Calendário' },
                { value: 'tarefas', label: 'Tarefas', badge: overdueTasks },
              ]}
            />
            {agendaView === 'proximos' && (
              <UpcomingTab
                celebrations={data.celebrations}
                onOpenCelebration={setCelebrationOpen}
                consultations={consultations}
                tasks={tasks}
                journal={journal}
                exams={exams}
                busy={busy}
                migrationPending={data.migrationPending}
                onCreateConsultation={createConsultation}
                onOpen={setDetail}
                onResult={openResult}
              />
            )}
            {agendaView === 'calendario' && (
              <CalendarTab
                focusDay={calendarFocus}
                onFocusUsed={() => setCalendarFocus(null)}
                celebrations={data.celebrations}
                onOpenCelebration={setCelebrationOpen}
                dumDate={dumDate}
                currentWeek={currentWeek}
                consultations={consultations}
                tasks={tasks}
                symptoms={symptoms}
                metrics={metrics}
                journal={journal}
                results={exams}
                checkins={data.checkins ?? []}
                busy={busy}
                migrationPending={data.migrationPending}
                onCreateConsultation={createConsultation}
                onCreateTask={createTask}
                onToggleTask={toggleTask}
                onNavigate={navigate}
                onNotify={text => showToast({ text, tone: 'info' })}
                onOpen={t => (t.kind === 'exam' ? openExam(t.id) : setDetail(t))}
              />
            )}
            {agendaView === 'tarefas' && (
              <TasksTab
                tasks={tasks}
                selectedWeek={selectedWeek}
                currentWeek={currentWeek}
                busy={busy}
                onCreate={createTask}
                onToggle={toggleTask}
                onOpen={t => setDetail({ kind: 'task', id: t.id })}
              />
            )}
          </>
        )}

        {activeTab === 'cuidados' && report && (
          <ConsultationsTab
            profile={profile}
            consultations={consultations}
            questions={questions}
            symptoms={symptoms}
            comments={comments}
            metrics={metrics}
            busy={busy}
            migrationPending={data.migrationPending}
            report={report}
            onOpenReport={r => {
              setReport(r);
              window.scrollTo({ top: 0 });
            }}
            onOpenConsultation={c => setDetail({ kind: 'consultation', id: c.id })}
            onOpenAgenda={() => {
              navigate('agenda');
              setAgendaView('proximos');
            }}
            onCreateQuestion={createQuestion}
            onAnswer={answerQuestion}
            onDeleteQuestion={q => scheduleDelete('question', q.id, 'dúvida')}
            onNotify={text => showToast({ text, tone: 'info' })}
            kickSessions={data.kickSessions}
            contractions={data.contractions}
            birthPlan={data.birthPlan}
          />
        )}
        {activeTab === 'cuidados' && !report && careView === 'inicio' && (
          <CareHome
            profile={profile}
            consultations={consultations}
            questions={questions}
            symptoms={symptoms}
            metrics={metrics}
            exams={exams}
            journey={journey}
            currentWeek={currentWeek}
            alert={recentInsights.some(i => i.tone === 'alerta')}
            busy={busy}
            onPrepare={prepareReport}
            onReport={specialtyId => {
              setReport({ specialtyId, consultationId: null });
              window.scrollTo({ top: 0 });
            }}
            onSchedule={() => {
              setAgendaView('proximos');
              navigate('agenda');
            }}
            onOpenConsultation={c => setDetail({ kind: 'consultation', id: c.id })}
            onOpen={openCare}
            onOpenJourney={openJourney}
            onOpenExam={openExam}
            onNewExam={() => setRecording(['exame'])}
            onSaveFicha={saveFicha}
          />
        )}
        {activeTab === 'cuidados' && !report && careView === 'sintomas' && (
          <CarePage title="Sintomas" subtitle="O que os registros mostram, a frequência e a evolução." onBack={() => openCare('inicio')}>
            {dashboard('sintomas')}
          </CarePage>
        )}
        {activeTab === 'cuidados' && !report && careView === 'medidas' && (
          <CarePage title="Peso e pressão" subtitle="A evolução semana a semana, com a faixa recomendada." onBack={() => openCare('inicio')}>
            {dashboard('corpo')}
          </CarePage>
        )}
        {activeTab === 'cuidados' && !report && careView === 'jornada' && (
          <CarePage title="Jornada do pré-natal" subtitle="O que fazer em cada fase, quando fazer e o que vocês já fizeram." onBack={() => openCare('inicio')}>
            <JourneyTab
                key={journeyFocus ?? 'jornada'}
                rows={journey}
                dumDate={dumDate}
                currentWeek={currentWeek}
                consultations={consultations}
                hidden={PLAN_ITEMS.filter(i => hiddenSteps.has(i.id)).map(i => ({ id: i.id, label: i.title }))}
                busy={busy}
                checksAvailable={data.checksAvailable}
                listsAvailable={socialAvailable}
                weeksAvailable={data.planWeeksAvailable ?? false}
                notesAvailable={data.planNotesAvailable ?? false}
                focus={journeyFocus}
                onToggle={(id, done, doneOn) => setCheck('prenatal', id, done, doneOn)}
                onSchedule={createConsultation}
                onOpenAppointment={c => setDetail({ kind: 'consultation', id: c.id })}
                onOpenExam={openExam}
                onResult={openResult}
                onSetPlan={setPlan}
                onHide={(id, hidden) => hideItem('prenatal', id, hidden)}
                onAddStep={(title, week) => addItem('prenatal', title, null, week)}
                onRenameItem={renameItem}
                onDeleteItem={deleteListItem}
              />
          </CarePage>
        )}
        {activeTab === 'cuidados' && !report && careView === 'exames' && (
          <CarePage title="Resultados" subtitle="Laudos, fotos e PDFs dos exames e ultrassons." onBack={() => openCare('inicio')}>
            <ExamsTab
            key={resultFrom?.id ?? examPreset ?? focusExam ?? 'exames'}
            exams={exams}
            available={data.examsAvailable ?? false}
            dumDate={dumDate}
            currentWeek={currentWeek}
            bloodType={data.profile.bloodType}
            busy={busy}
            onSave={saveExam}
            onDelete={e => scheduleDelete('exam', e.id, `exame "${e.title}"`)}
            onDeleteFile={(_, f) => scheduleDelete('examFile', f.id, f.content_type === 'application/pdf' ? 'PDF' : 'foto')}
            initialPlanItem={examPreset}
            fromAppointment={resultFrom}
            focusExam={focusExam}
            onOpenJourney={id => openJourney(id)}
            social={{ available: socialAvailable, reactions, threads, onReact: react, onThread: sendThread, onDeleteThread: deleteThread }}
          />
          </CarePage>
        )}

        {activeTab === 'parto' && !care && (
          <LaborTab
            key={laborReset}
            author={author}
            currentWeek={currentWeek}
            motherName={data.profile.motherName}
            kickSessions={visible('kick', data.kickSessions)}
            contractions={visible('contraction', data.contractions)}
            birthPlan={data.birthPlan}
            available={data.laborAvailable}
            busy={busy}
            onSaveKicks={saveKicks}
            onDeleteKicks={k => scheduleDelete('kick', k.id, 'contagem de movimentos')}
            onSaveContraction={saveContraction}
            onDeleteContraction={id => scheduleDelete('contraction', id, 'contração')}
            onSavePlan={saveBirthPlan}
            onRefresh={() => run(async () => undefined)}
            onNotify={text => showToast({ text, tone: 'info' })}
            packed={packed}
            checksAvailable={data.checksAvailable}
            onTogglePacked={(id, done) => setCheck('mala', id, done)}
            bagItems={listItems.filter(i => i.list === 'mala')}
            hiddenBag={hiddenOf('mala')}
            listsAvailable={data.socialAvailable ?? false}
            onAddItem={(title, group) => addItem('mala', title, group, null)}
            onRenameItem={renameItem}
            onDeleteItem={deleteListItem}
            onHideItem={(id, hidden) => hideItem('mala', id, hidden)}
          />
        )}
        </div>
        </Suspense>
      </main>

      {celebrationOpen && data.celebrations?.some(c => c.id === celebrationOpen) && (
        <Suspense fallback={null}><CelebrationSpace celebration={data.celebrations.find(c => c.id === celebrationOpen)!} actions={celebrationActions} onClose={() => setCelebrationOpen(null)} /></Suspense>
      )}
      {namesOpen && <Suspense fallback={null}><NameSpace ideas={data.nameIdeas ?? []} tone={data.babyTone ?? 'tumtum'} week={currentWeek} couple chosenAt={data.babyNameAt} actions={nameActions} onClose={() => setNamesOpen(false)} onReveal={setReveal} onShare={shareName} onShareFinalists={shareFinalists} espera={data.espera ?? null} secondPending={isTwins(data.espera) && data.babyName && !data.baby2Name ? data.babyName : null} /></Suspense>}
      {reveal && (
        <Suspense fallback={null}><NameReveal
          name={reveal}
          tone={data.babyTone ?? 'tumtum'}
          week={currentWeek}
          onShare={data.journal.some(e => e.body.includes(`nome: ${reveal}`)) ? undefined : nameActions.onShareChoice}
          onDone={() => {
            markNameSeen(reveal);
            setRevealSeen(reveal);
            setReveal(null);
          }}
        /></Suspense>
      )}
      {recording && (
        <Suspense fallback={null}><QuickRecord
          modes={recording}
          initial={recordStart && recording.includes(recordStart) ? recordStart : recording[0]}
          direct={!!recordStart && recording.includes(recordStart)}
          onClose={() => setRecording(null)}
          author={author}
          trimester={age.trimester}
          currentWeek={currentWeek}
          selectedWeek={selectedWeek}
          symptoms={symptoms}
          busy={busy}
          journalAvailable={data.journalAvailable}
          photosAvailable={data.photosAvailable ?? false}
          dumDate={dumDate}
          entryFolder={entryStart.folder}
          entryIdea={entryStart.idea}
          lastBelly={(() => {
            const last = [...bellyShots(journal, dumDate)].sort((a, b) => b.week - a.week)[0];
            return last ? { src: photoUrl(last.photo.id, last.photo.thumb), week: last.week } : null;
          })()}
          onCreateSymptom={createSymptom}
          onCreateMetric={createMetric}
          metrics={metrics}
          onCreateEntry={createEntry}
          onCreateConsultation={createConsultation}
          onCreateTask={createTask}
          bloodType={data.profile.bloodType}
          examsAvailable={data.examsAvailable ?? false}
          onSaveExam={saveExam}
        /></Suspense>
      )}

      {openDetail && (
        <Suspense fallback={null}><DetailSheet
          key={`${openDetail.kind}:${openDetail.item.id}`}
          detail={openDetail}
          onClose={() => setDetail(null)}
          author={author}
          trimester={age.trimester}
          currentWeek={currentWeek}
          symptoms={symptoms}
          busy={busy}
          journalAvailable={data.journalAvailable}
          photosAvailable={data.photosAvailable ?? false}
          dumDate={dumDate}
          onUpdateSymptom={updateSymptom}
          onUpdateMetric={updateMetric}
          onUpdateEntry={updateEntry}
          onUpdateTask={updateTask}
          onUpdateConsultation={updateConsultation}
          onDelete={deleteDetail}
          onComment={createComment}
          onDeleteComment={c => scheduleDelete('comment', c.id, 'cuidado')}
          onToggleTask={toggleTask}
          onPrepare={prepareReport}
          onResult={openResult}
          exams={exams}
          onOpenJourney={id => openJourney(id)}
          journeyTitle={id => journeyItems.find(i => i.id === id)?.title ?? null}
          socialAvailable={socialAvailable}
          reactions={reactions}
          threads={threads}
          onReact={react}
          onThread={sendThread}
          onDeleteThread={deleteThread}
          onVoice={setVoice}
          onShareEntry={shareEntry}
        /></Suspense>
      )}

      {esperaOpen && data.espera && !care && (
        <EsperaSheet espera={data.espera} me={firstName(family.members.find(m => m.me)?.name ?? '') || 'Você'} partnerName={partnerName} today={today} busy={busy} actions={esperaActions} onClose={() => setEsperaOpen(false)} />
      )}
      {revealSexOpen && data.espera && !care && (data.espera.secret || data.espera.sex) && (
        <SexReveal
          espera={data.espera}
          partnerName={partnerName}
          me={firstName(family.members.find(m => m.me)?.name ?? '') || 'Você'}
          onOpen={async () => {
            const ok = await run(() => api.mutate('openSex', {}), ESPERA_MISSING);
            if (ok) tumtum();
            return ok;
          }}
          onShare={() => shareEspera('revelacao')}
          onMural={() => {
            const sex = data.espera?.sex;
            if (!sex) return Promise.resolve(false);
            return run(() => api.mutate('createEntry', { date: today, body: `${SEX_WORD[sex].title}! ${SEX_WORD[sex].emoji}`, visibility: 'shared', remindOn: null, folder: 'momento', firstTime: 'sexo' }), 'Não foi possível guardar.', 'Guardado no livro e no Mural');
          }}
          onDone={() => setRevealSexOpen(false)}
        />
      )}
      {/* Por cima de tudo, até das revelações (que ficam em z-60). */}
      {shareReq && (
        <div className="relative z-[70]">
        <Suspense fallback={null}><ShareSheet
          request={shareReq}
          onClose={() => setShareReq(null)}
          onDone={(kind, how) => {
            track(kind);
            setShareReq(null);
            if (how === 'downloaded') showToast({ text: 'Imagem salva. É só postar 💛', tone: 'success' });
          }}
        /></Suspense>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
      {echo && (
        <SymptomEchoCard
          echo={echo}
          onClose={closeEcho}
          onOpen={() => {
            setEcho(null);
            setDetail(null);
            openCare('sintomas');
          }}
        />
      )}
      {ritualOpen && (
        <Suspense fallback={null}><DayClose
          role={author}
          mood={(data.checkins ?? []).find(c => c.mine && c.day === today)?.mood ?? null}
          partnerName={partnerName}
          partner={partnerDay(data.checkins ?? [], data.journal ?? [], today)}
          busy={busy}
          onSave={closeDay}
          onClose={() => setRitualOpen(false)}
        /></Suspense>
      )}
      {stamp && (
        <BookStamp
          stamp={{ ...stamp, chapter: chapterOfWeek(book, stamp.week) }}
          onClose={closeStamp}
          onOpenBook={() => {
            setStamp(null);
            setDetail(null);
            setDiaryView('livro');
            navigate('diario');
          }}
        />
      )}
      {spaceSheet}
      {BOOK_PREORDER && bookOpen && data.book && (
        <Suspense fallback={null}>
          <BookBuilder stuff={printedStuff} photos={coverPhotos(journal)} babyName={data.babyName ?? null} order={data.book.order} gifts={data.book.gifts.map(g => g.name)} onReserve={reserveBook} onCancel={cancelBook} onClose={() => setBookOpen(false)} />
        </Suspense>
      )}
      {helpOpen && (
        <Suspense fallback={null}><HelpCenter
          onClose={() => setHelpOpen(false)}
          onGo={goHelp}
          onFirstDays={() => {
            saveFirstDays({ ...firstDaysPrefs, hidden: false });
            setHelpOpen(false);
            openHome('missoes');
          }}
        /></Suspense>
      )}
    </div>
    </TimedRemindersReady.Provider>
    </TaskRemindersReady.Provider>
    </AttendeesReady.Provider>
    </JourneyContext.Provider>
    </RelativesContext.Provider>
    </PeopleContext.Provider>
    </BabyNameContext.Provider>
    </FreshEntryContext.Provider>
    </SavingContext.Provider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-ink text-center">Tumtum</h1>
        {children}
      </main>
    </div>
  );
}
