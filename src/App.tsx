import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { CloudRain, Plus, Sprout } from 'lucide-react';
import BrandMark from './components/BrandMark';
import QuickRecord, { type QuickMode } from './components/QuickRecord';
import DetailSheet from './components/Details';
import { resolveDetail, type Detail, type DetailTarget } from './lib/details';
import type { Folder, ListItem, Mood, ThreadComment } from './hooks/useGestationData';
import type { OnReact } from './components/Social';
import { takeTabFromUrl, takeViewFromUrl } from './lib/pwa';
import { api, ApiError, type CoupleFamilyState, type FamilyState, type Me } from './api';
import SpaceSheet from './components/auth/SpaceSheet';
import Header from './components/Header';
import FichaBar, { type FichaInput } from './components/FichaBar';
import Nav from './components/Nav';
import Toast, { type ToastMessage } from './components/Toast';
import { DumForm } from './components/DumForm';
import { Card, Segmented, SubTabs } from './components/ui';
import type { BirthPlan } from './lib/birthPlan';
import HomeTab, { type HomeTarget } from './components/tabs/HomeTab';
import DiaryTab from './components/tabs/DiaryTab';
import HealthTab, { type NewSymptom } from './components/tabs/HealthTab';
import UpcomingTab from './components/tabs/UpcomingTab';
import type { NewEntry } from './components/forms/EntryForm';
import type { NewConsultation, ReportRequest } from './components/tabs/ConsultationsTab';
// Exames vêm junto com o botão "+" (que tem o formulário de exame).
import ExamsTab, { type SaveExam } from './components/tabs/ExamsTab';
import TasksTab, { type NewTask } from './components/tabs/TasksTab';

// Abas com gráficos, relatório e calendário carregam só quando abertas: o app abre mais rápido no celular.
const DashboardTab = lazy(() => import('./components/tabs/DashboardTab'));
const ConsultationsTab = lazy(() => import('./components/tabs/ConsultationsTab'));
const CalendarTab = lazy(() => import('./components/tabs/CalendarTab'));
const LaborTab = lazy(() => import('./components/tabs/LaborTab'));
const JourneyTab = lazy(() => import('./components/tabs/JourneyTab'));
import { questionSpecialty, type SpecialtyId } from './data/specialties';
import { useGestationData } from './hooks/useGestationData';
import { FIRST_WEEK, clampWeek, gestationalAge, isOverdue, parseLocalDate, toISODate, weekOfDay } from './lib/dates';
import { pressureInsights } from './lib/health';
import type { NewMetric } from './components/forms/RecordForms';
import { findPatterns, toEntries } from './lib/symptoms';
import type { AgendaView, CareView, Consultation, DashboardView, DeletableKind, DiaryView, HealthView, PartnerTask, Tab } from './types';
import { isConsultation, resultOf } from './lib/appointments';
import { autoDone, planFor, visitsOf } from './lib/journey';
import { doneByAppointments, journeyRows, plannedItems } from './lib/journeyPlan';
import { JourneyContext } from './lib/journeyContext';
import { AttendeesReady, PeopleContext, RelativesContext, TaskRemindersReady, TimedRemindersReady } from './lib/people';
import { markSeen } from './lib/news';
import { PLAN_ITEMS } from './content/prenatalPlan';

const UNDO_WINDOW_MS = 5000;

const TITLE: Record<Tab, string> = { inicio: 'Tumtum', diario: 'Diário', agenda: 'Agenda', cuidados: 'Cuidados', parto: 'Parto' };

/** O que o botão "+" oferece em cada aba (o primeiro abre selecionado). Parto não tem: lá os registros são os cronômetros. */
const RECORD_MODES: Record<Tab, QuickMode[]> = {
  inicio: ['sintoma', 'momento', 'medicao', 'consulta', 'tarefa', 'exame'],
  diario: ['momento'],
  agenda: ['consulta', 'tarefa'],
  cuidados: ['exame', 'sintoma', 'medicao'],
  parto: [],
};

/** Em Cuidados → Saúde, o botão "+" registra sintoma e peso/pressão. */
const HEALTH_MODES: QuickMode[] = ['sintoma', 'medicao'];

/** Gráficos de Cuidados → Saúde (o antigo Painel). */
const HEALTH_CHART: Record<Exclude<HealthView, 'registros'>, Exclude<DashboardView, 'jornada'>> = { sintomas: 'sintomas', corpo: 'corpo', resumo: 'geral' };

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

export default function App({ me, family, onFamilyChange, onAccessLost, onSignOut }: AppProps) {
  const { data, loadState, refresh, replace, patch, retry } = useGestationData(onAccessLost, me.data);
  const author = family.role;
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(() => takeTabFromUrl() ?? 'inicio');
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [report, setReport] = useState<ReportRequest | null>(null);
  const [diaryView, setDiaryView] = useState<DiaryView>('mural');
  const [healthView, setHealthView] = useState<HealthView>('registros');
  const [agendaView, setAgendaView] = useState<AgendaView>(() => {
    const v = takeViewFromUrl();
    return v === 'calendario' || v === 'tarefas' || v === 'jornada' ? v : 'proximos';
  });
  const [careView, setCareView] = useState<CareView>(() => {
    const v = takeViewFromUrl();
    return v === 'exames' || v === 'duvidas' ? v : 'saude';
  });
  const [examPreset, setExamPreset] = useState<string | null>(null);
  /** Resultados: abrir o formulário a partir de um agendamento, ou levar até um resultado. */
  const [resultFrom, setResultFrom] = useState<Consultation | null>(null);
  const [focusExam, setFocusExam] = useState<string | null>(null);
  const [journeyFocus, setJourneyFocus] = useState<string | null>(null);
  const [recording, setRecording] = useState<QuickMode[] | null>(null);
  /** Pasta (e ideia) com que o diário abre no registro. */
  const [entryStart, setEntryStart] = useState<{ folder: Folder; idea?: string }>({ folder: 'momento' });
  const [detail, setDetail] = useState<DetailTarget | null>(null);

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
  const [toast, setToast] = useState<ToastMessage | null>(null);
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
   */
  const run = async (action: () => Promise<unknown>, errorText = 'Não foi possível salvar. Verifique a conexão e tente de novo.') => {
    setBusy(true);
    try {
      const result = (await action()) as { data?: unknown } | undefined;
      if (result?.data) replace(result.data);
      else await refresh();
      return true;
    } catch (err) {
      console.error(err);
      // Desfaz o que foi mostrado antes da confirmação.
      refresh().catch(() => undefined);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onAccessLost();
        return false;
      }
      showToast({ text: errorText, tone: 'error' });
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
    });

  const saveProfile = (preWeightKg: number, heightCm: number) => run(() => api.mutate('saveProfile', { preWeightKg, heightCm }));

  const saveFicha = (f: FichaInput) => run(() => api.mutate('saveFicha', { ...f }), 'Não foi possível salvar a ficha. Confira os campos e tente de novo.');

  const saveKicks = (k: { startedAt: string; endedAt: string; kicks: number; target: number }) => run(() => api.mutate('saveKicks', k));

  const saveContraction = (c: { startedAt: string; endedAt: string }) => run(() => api.mutate('saveContraction', c));

  const saveBirthPlan = (plan: BirthPlan) => run(() => api.mutate('saveBirthPlan', { plan }));

  const createTask = (t: NewTask) =>
    run(() =>
      api.mutate('createTask', { week: t.week ?? (t.dueDate ? weekOfDay(dumDate!, t.dueDate) : currentWeek), title: t.title, assignee: t.assignee, priority: t.priority, dueDate: t.dueDate || null, notes: t.notes || null, ...reminderOf(t) }),
    );

  // Marcar e desmarcar aparece na hora; o servidor confirma em seguida.
  const toggleTask = (t: PartnerTask) => {
    patch(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, is_completed: !t.is_completed } : x)) }));
    return run(() => api.mutate('toggleTask', { id: t.id, done: !t.is_completed }));
  };

  const createSymptom = (s: NewSymptom) =>
    run(() =>
      api.mutate('createSymptom', { week: weekOfDay(dumDate!, s.date), date: s.date, name: s.name, intensity: s.intensity, category: s.category, notes: s.notes || null, timeOfDay: s.timeOfDay }),
    );

  const createComment = (symptomId: string, text: string) => run(() => api.mutate('createComment', { symptomId, text }));

  const createQuestion = (text: string, category: string, specialty: SpecialtyId) =>
    run(() => api.mutate('createQuestion', { week: currentWeek, text, category, specialty }));

  const answerQuestion = (id: string, answer: string) => run(() => api.mutate('answerQuestion', { id, answer }));

  const createMetric = ({ date, ...m }: NewMetric) => run(() => api.mutate('createMetric', { week: weekOfDay(dumDate!, date), date, ...m }), 'Não foi possível salvar a medição.');

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
  const saveEntry = async (id: string | null, e: NewEntry) => {
    setBusy(true);
    let entryId = id;
    try {
      const fields = { body: e.body, visibility: e.visibility, remindOn: e.remindOn, folder: e.folder, ...(e.remindAt === undefined ? {} : { remindAt: e.remindAt }) };
      if (id) await api.mutate('updateEntry', { id, ...fields });
      else entryId = ((await api.mutate('createEntry', { date: e.date, ...fields })) as { id?: string }).id ?? null;
      if (entryId) {
        for (const photoId of e.removePhotos) await api.photos('delete', { id: photoId });
        for (const p of e.photos) await api.photos('add', { entryId, data: p.data, thumb: p.thumb });
      }
      await refresh();
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
        showToast({ text: `Guardado, mas uma foto não foi enviada. ${reason}`, tone: 'error' });
        return true;
      }
      showToast({ text: `Não foi possível guardar. ${reason}`, tone: 'error' });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const createEntry = (e: NewEntry) => saveEntry(null, e);

  /**
   * Exame novo (ou arquivos a mais num exame que já existe): grava o exame, envia os
   * arquivos um por vez e, se for da jornada, marca o item como feito.
   */
  const saveExam: SaveExam = async (exam, examId, files, onProgress) => {
    setBusy(true);
    let id = examId;
    try {
      if (!id && exam) id = (await api.exams<{ ok: true; id: string }>('create', { ...exam })).id;
      for (let i = 0; i < files.length; i++) {
        await api.exams('addFile', { examId: id, contentType: files[i].contentType, data: files[i].data });
        onProgress(i + 1);
      }
      if (exam?.planItem && !data?.checks.some(c => c.list === 'prenatal' && c.item_id === exam.planItem)) await api.mutate('setCheck', { list: 'prenatal', itemId: exam.planItem, done: true }).catch(() => undefined);
      await refresh();
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
    }
  };

  // Listas editáveis (mala e jornada).
  const addItem = (list: 'prenatal' | 'mala', title: string, bagGroup: string | null, week: number | null) =>
    run(() => api.mutate('addItem', { list, title, bagGroup, week }), 'Não foi possível adicionar. Se for a primeira vez, rode a migração 011 no Neon.');
  const renameItem = (item: ListItem, title: string) => run(() => api.mutate('updateItem', { id: item.id, title, bagGroup: item.bag_group, week: item.week }));
  const deleteListItem = (item: ListItem) => scheduleDelete('item', item.id, `"${item.title}"`);
  /** Planejado de um item: semanas (null volta à referência) e, com a migração 020, o combinado com a equipe. */
  const setPlan = (itemId: string, from: number | null, to: number | null, note?: string | null) => {
    patch(d => {
      const old = (d.planWeeks ?? []).find(w => w.item_id === itemId);
      const keepNote = note === undefined ? (old?.note ?? null) : note;
      const row = from !== null || keepNote ? [{ item_id: itemId, from, to, note: keepNote }] : [];
      return { ...d, planWeeks: [...(d.planWeeks ?? []).filter(w => w.item_id !== itemId), ...row] };
    });
    return run(() => api.mutate('setPlanWeeks', { itemId, from, to, ...(note === undefined ? {} : { note }) }), 'Não foi possível salvar o planejado. Se for a primeira vez, rode as migrações 019 e 020 no Neon.');
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

  // Edições feitas na janela de detalhes.
  const updateSymptom = (id: string, s: NewSymptom) =>
    run(() => api.mutate('updateSymptom', { id, week: weekOfDay(dumDate!, s.date), date: s.date, name: s.name, intensity: s.intensity, category: s.category, notes: s.notes || null, timeOfDay: s.timeOfDay }));
  const updateMetric = (id: string, { date, ...m }: NewMetric) => run(() => api.mutate('updateMetric', { id, week: weekOfDay(dumDate!, date), date, ...m }), 'Não foi possível salvar a medição.');
  const updateEntry = (id: string, e: NewEntry) => saveEntry(id, e);
  const updateTask = (id: string, t: NewTask) =>
    run(() => api.mutate('updateTask', { id, title: t.title, assignee: t.assignee, priority: t.priority, dueDate: t.dueDate || null, notes: t.notes || null, ...reminderOf(t) }));
  const updateConsultation = (id: string, c: NewConsultation) =>
    run(() => api.mutate('updateConsultation', { id, ...appointmentFields(c) }), appointmentError(c));
  const deleteDetail = (d: Detail) => {
    if (d.kind === 'symptom') scheduleDelete('symptom', d.item.id, d.item.symptom_name);
    else if (d.kind === 'metric') scheduleDelete('metric', d.item.id, `medição da semana ${d.item.week_number}`);
    else if (d.kind === 'entry') scheduleDelete('entry', d.item.id, 'momento');
    else if (d.kind === 'task') scheduleDelete('task', d.item.id, `tarefa "${d.item.task_title}"`);
    else scheduleDelete('consultation', d.item.id, 'consulta');
  };

  const createConsultation = (c: NewConsultation) =>
    run(() => api.mutate('createConsultation', appointmentFields(c)), appointmentError(c));

  if (loadState !== 'ready' || !data) {
    return (
      <Shell>
        {loadState === 'loading' ? (
          <div className="py-24 text-center space-y-3" role="status">
            <BrandMark animated className="w-16 h-16 mx-auto" />
            <p className="text-ink-soft font-semibold">Carregando os dados de vocês...</p>
          </div>
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
      title={activeTab === 'inicio' || !age ? undefined : TITLE[activeTab]}
      week={age ? currentWeek : null}
    />
  );
  const spaceSheet = (
    <>
      {spaceOpen && (
        <SpaceSheet
          me={me}
          family={family}
          onClose={() => setSpaceOpen(false)}
          onFamilyChange={onFamilyChange}
          onSignOut={onSignOut}
          onAccountDeleted={onSignOut}
        />
      )}
    </>
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
  const lateSteps = journey.filter(r => r.status === 'atrasado').map(r => r.item);
  const exams = visible('exam', data.exams ?? []).map(e => ({ ...e, files: e.files.filter(f => !pendingDeletes.has(`examFile:${f.id}`)) }));
  const overdueTasks = tasks.filter(t => !t.is_completed && isOverdue(t.due_date)).length;
  const questions = visible('question', data.questions);
  const comments = visible('comment', data.comments);
  const consultations = visible('consultation', data.consultations);
  // Só as consultas têm resumo e contam como consulta do pré-natal; exames, ultrassons e vacinas são agendamentos à parte.
  const consultsOnly = consultations.filter(isConsultation);
  const prepareReport = (c: Consultation) => {
    setReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id });
    setActiveTab('cuidados');
    setCareView('duvidas');
    window.scrollTo({ top: 0 });
  };
  const openCare = (view: CareView) => {
    navigate('cuidados');
    setCareView(view);
  };
  // Os gráficos e a jornada levam um ao outro, mesmo estando em abas diferentes.
  /** Agenda → Jornada; com um item, já abre o pop-up dele (vindo de um agendamento ou resultado). */
  const openJourney = (itemId?: string) => {
    navigate('agenda');
    setAgendaView('jornada');
    setJourneyFocus(itemId ?? null);
  };
  const openDashboardView = (v: DashboardView) => {
    if (v === 'jornada') return openJourney();
    openCare('saude');
    setHealthView(v === 'geral' ? 'resumo' : v);
  };
  /** Abre o registro do diário já numa pasta. */
  const writeEntry = (folder: Folder, idea?: string) => {
    setEntryStart({ folder, idea });
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
  const hug = () => {
    patch(d => ({ ...d, hugs: [...(d.hugs ?? []), { day: today, toMe: false }] }));
    return run(() => api.mutate('hug', { day: today }), 'Não foi possível mandar o abraço. Verifique a conexão.');
  };
  // "Quer contar no Mural?" depois do check-in: vira um registro do dia a dia, para os dois.
  const shareMood = (body: string) =>
    run(() => api.mutate('createEntry', { date: today, body, visibility: 'shared', remindOn: null, folder: 'dia' }), 'Não foi possível postar no Mural.');
  const openFromHome = (target: HomeTarget, planItem?: string) => {
    if (target === 'diario') return navigate('diario');
    if (target === 'mural' || target === 'humor' || target === 'barriga') {
      setDiaryView(target);
      return navigate('diario');
    }
    if (target === 'saude') {
      openCare('saude');
      return setHealthView('registros');
    }
    if (target === 'graficos') return openDashboardView('sintomas');
    if (target === 'medidas') return openDashboardView('corpo');
    if (target === 'jornada') return openJourney();
    if (target === 'tarefas' || target === 'agenda') {
      navigate('agenda');
      return setAgendaView(target === 'tarefas' ? 'tarefas' : 'proximos');
    }
    openCare(target);
    if (target === 'exames') setExamPreset(planItem ?? null);
  };
  const recordModes = report ? [] : activeTab === 'cuidados' && careView === 'saude' ? HEALTH_MODES : RECORD_MODES[activeTab];
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
  const dashboard = (view: Exclude<DashboardView, 'jornada'>) => (
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
      onViewChange={openDashboardView}
      consultations={consultsOnly}
      planItems={journeyItems.filter(i => !i.own)}
      doneSteps={doneSteps}
    />
  );

  return (
    <PeopleContext.Provider value={family.members}>
    <RelativesContext.Provider value={family.relatives ?? []}>
    <JourneyContext.Provider value={{ items: journeyItems, done: doneSteps, consultations, dumDate }}>
    <AttendeesReady.Provider value={data.attendeesAvailable ?? false}>
    <TaskRemindersReady.Provider value={data.taskRemindersAvailable ?? false}>
    <TimedRemindersReady.Provider value={data.timedRemindersAvailable ?? false}>
    <div className="min-h-screen bg-canvas text-ink pb-32 md:pb-12">
      {header}
      {(activeTab === 'inicio' || activeTab === 'cuidados') && <FichaBar profile={profile} metrics={metrics} busy={busy} onSave={saveFicha} />}
      <Nav
        active={activeTab}
        onChange={navigate}
        badges={{
          agenda: overdueTasks,
          cuidados: questions.filter(q => !q.doctor_answer).length,
        }}
      />

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16" role="status" aria-label="Abrindo">
              <BrandMark animated className="w-12 h-12" />
            </div>
          }
        >
        {data.migrationPending && activeTab === 'inicio' && (
          <p className="no-print mb-4 text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">
            Atualização do banco pendente: rodem <code>db/migrations/002_consultas_e_padroes.sql</code> no Neon para liberar a agenda de consultas, o período do dia dos sintomas e a faixa de peso.
          </p>
        )}

        {activeTab === 'inicio' && (
          <HomeTab
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
            threads={threads}
            userId={me.user.id}
            busy={busy}
            onCheckin={checkin}
            onHug={hug}
            onShareMood={data.journalAvailable ? shareMood : undefined}
            onToggleTask={toggleTask}
            onOpen={openFromHome}
            onOpenDetail={setDetail}
            onResult={openResult}
            onWrite={() => writeEntry('dia')}
            lateSteps={lateSteps}
            bellyAvailable={!!data.journalAvailable && (data.photosAvailable ?? false)}
            onBellyPhoto={() => writeEntry('barriga')}
            metrics={metrics}
            symptoms={symptoms}
            preWeightKg={data.profile.preWeightKg}
            onSaveMetric={createMetric}
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
            onOpenHealth={() => openCare('saude')}
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
                { value: 'jornada', label: 'Jornada', badge: lateSteps.length },
                { value: 'tarefas', label: 'Tarefas', badge: overdueTasks },
              ]}
            />
            {agendaView === 'proximos' && (
              <UpcomingTab
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
            {agendaView === 'jornada' && (
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

        {activeTab === 'cuidados' && !report && (
          <SubTabs
            label="Parte dos cuidados"
            value={careView}
            onChange={v => {
              setCareView(v);
              setExamPreset(null);
              window.scrollTo({ top: 0 });
            }}
            options={[
              { value: 'saude', label: 'Saúde' },
              { value: 'exames', label: 'Resultados' },
              { value: 'duvidas', label: 'Dúvidas', badge: questions.filter(q => !q.doctor_answer).length },
            ]}
          />
        )}
        {activeTab === 'cuidados' && (careView === 'duvidas' || report) && (
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
        {activeTab === 'cuidados' && careView === 'exames' && !report && (
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
        )}
        {activeTab === 'cuidados' && careView === 'saude' && !report && (
          <>
            <div className="mb-4">
              <Segmented
                label="Parte da saúde"
                full
                size="sm"
                value={healthView}
                onChange={v => {
                  setHealthView(v);
                  window.scrollTo({ top: 0 });
                }}
                options={[
                  { value: 'registros', label: 'Registros' },
                  { value: 'sintomas', label: 'Sintomas' },
                  { value: 'corpo', label: 'Medidas' },
                  { value: 'resumo', label: 'Resumo' },
                ]}
              />
            </div>
            {healthView === 'registros' ? (
              <HealthTab
                symptoms={symptoms}
                comments={comments}
                metrics={metrics}
                selectedWeek={selectedWeek}
                onOpen={setDetail}
                onRecord={() => setRecording(HEALTH_MODES)}
                reactions={socialAvailable ? reactions : []}
              />
            ) : (
              dashboard(HEALTH_CHART[healthView])
            )}
          </>
        )}

        {activeTab === 'parto' && (
          <LaborTab
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
        </Suspense>
      </main>

      {recordModes.length > 0 && (
        <button
          type="button"
          onClick={() => (activeTab === 'diario' ? writeEntry(diaryView === 'tudo' || diaryView === 'mural' || diaryView === 'humor' ? 'momento' : diaryView) : (setEntryStart({ folder: 'momento' }), setRecording(recordModes)))}
          className="tt-registrar no-print fixed z-40 right-4 md:right-8 bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] md:bottom-8 h-11 pl-3 pr-4 rounded-full text-white text-[14px] font-extrabold flex items-center gap-1.5 transition active:scale-95 hover:brightness-110"
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={3} />
          Registrar
        </button>
      )}
      {recording && (
        <QuickRecord
          modes={recording}
          initial={recording[0]}
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
          onCreateSymptom={createSymptom}
          onCreateMetric={createMetric}
          metrics={metrics}
          onCreateEntry={createEntry}
          onCreateConsultation={createConsultation}
          onCreateTask={createTask}
          bloodType={data.profile.bloodType}
          examsAvailable={data.examsAvailable ?? false}
          onSaveExam={saveExam}
        />
      )}

      {openDetail && (
        <DetailSheet
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
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
      {spaceSheet}
    </div>
    </TimedRemindersReady.Provider>
    </TaskRemindersReady.Provider>
    </AttendeesReady.Provider>
    </JourneyContext.Provider>
    </RelativesContext.Provider>
    </PeopleContext.Provider>
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
