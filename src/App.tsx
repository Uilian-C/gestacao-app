import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { CloudRain, Plus, Sprout } from 'lucide-react';
import BrandMark from './components/BrandMark';
import QuickRecord, { type QuickMode } from './components/QuickRecord';
import DetailSheet from './components/Details';
import { resolveDetail, type Detail, type DetailTarget } from './lib/details';
import type { Folder, ListItem, ThreadComment } from './hooks/useGestationData';
import type { OnReact } from './components/Social';
import { takeTabFromUrl, takeViewFromUrl } from './lib/pwa';
import { api, ApiError, type FamilyState, type Me } from './api';
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
import { questionSpecialty, type SpecialtyId } from './data/specialties';
import { useGestationData } from './hooks/useGestationData';
import { FIRST_WEEK, clampWeek, daysBetween, gestationalAge, isOverdue, localDay, parseLocalDate, toISODate } from './lib/dates';
import { pressureInsights, type ParsedMetric } from './lib/health';
import { findPatterns, toEntries } from './lib/symptoms';
import type { AgendaView, CareView, Consultation, DashboardView, DeletableKind, DiaryView, HealthView, PartnerTask, Tab } from './types';
import { autoDone, visitsOf } from './lib/journey';

const UNDO_WINDOW_MS = 5000;

const TITLE: Record<Tab, string> = { inicio: 'Tumtum', diario: 'Diário', agenda: 'Agenda', cuidados: 'Cuidados', parto: 'Parto' };

/** O que o botão "+" oferece em cada aba (o primeiro abre selecionado). Parto não tem: lá os registros são os cronômetros. */
const RECORD_MODES: Record<Tab, QuickMode[]> = {
  inicio: ['sintoma', 'momento', 'medicao', 'consulta', 'tarefa', 'exame'],
  diario: ['momento'],
  agenda: ['tarefa', 'consulta'],
  cuidados: ['consulta', 'exame'],
  parto: [],
};

/** Em Cuidados → Saúde, o botão "+" registra sintoma e peso/pressão. */
const HEALTH_MODES: QuickMode[] = ['sintoma', 'medicao'];

/** Gráficos de Cuidados → Saúde (o antigo Painel). */
const HEALTH_CHART: Record<Exclude<HealthView, 'registros'>, DashboardView> = { sintomas: 'sintomas', corpo: 'corpo', resumo: 'geral' };

function greetingFor(hour: number): string {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface AppProps {
  me: Me;
  family: FamilyState;
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
  const [diaryView, setDiaryView] = useState<DiaryView>('tudo');
  const [healthView, setHealthView] = useState<HealthView>('registros');
  const [agendaView, setAgendaView] = useState<AgendaView>('calendario');
  const [careView, setCareView] = useState<CareView>(() => {
    const v = takeViewFromUrl();
    return v === 'exames' || v === 'jornada' || v === 'saude' ? v : 'consultas';
  });
  const [examPreset, setExamPreset] = useState<string | null>(null);
  const [recording, setRecording] = useState<QuickMode[] | null>(null);
  /** Pasta (e ideia) com que o diário abre no registro. */
  const [entryStart, setEntryStart] = useState<{ folder: Folder; idea?: string }>({ folder: 'momento' });
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  // A cor principal segue a aba (index.css, data-aba).
  useEffect(() => {
    document.documentElement.dataset.aba = activeTab;
  }, [activeTab]);
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
    window.scrollTo({ top: 0 });
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
      api.mutate('createTask', { week: t.week ?? selectedWeek, title: t.title, assignee: t.assignee, priority: t.priority, dueDate: t.dueDate || null, notes: t.notes || null }),
    );

  // Marcar e desmarcar aparece na hora; o servidor confirma em seguida.
  const toggleTask = (t: PartnerTask) => {
    patch(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, is_completed: !t.is_completed } : x)) }));
    return run(() => api.mutate('toggleTask', { id: t.id, done: !t.is_completed }));
  };

  const createSymptom = (s: NewSymptom) =>
    run(() =>
      api.mutate('createSymptom', { week: currentWeek, date: today, name: s.name, intensity: s.intensity, category: s.category, notes: s.notes || null, timeOfDay: s.timeOfDay }),
    );

  const createComment = (symptomId: string, text: string) => run(() => api.mutate('createComment', { symptomId, text }));

  const createQuestion = (text: string, category: string, specialty: SpecialtyId) =>
    run(() => api.mutate('createQuestion', { week: currentWeek, text, category, specialty }));

  const answerQuestion = (id: string, answer: string) => run(() => api.mutate('answerQuestion', { id, answer }));

  const createMetric = (m: ParsedMetric) => run(() => api.mutate('createMetric', { week: currentWeek, date: today, ...m }), 'Não foi possível salvar a medição.');

  const setCheck = (list: 'prenatal' | 'mala', itemId: string, done: boolean) => {
    patch(d => ({
      ...d,
      checks: done ? [...d.checks.filter(c => !(c.list === list && c.item_id === itemId)), { list, item_id: itemId, done_at: today }] : d.checks.filter(c => !(c.list === list && c.item_id === itemId)),
    }));
    return run(() => api.mutate('setCheck', { list, itemId, done }), 'Não foi possível salvar. Se for a primeira vez, rode a migração db/migrations/007_checklists.sql no Neon.');
  };

  /**
   * Registro do diário (novo ou editado): grava o texto e depois as fotos, uma
   * por vez. Se o registro foi guardado e uma foto falhou, avisa o que faltou.
   */
  const saveEntry = async (id: string | null, e: NewEntry) => {
    setBusy(true);
    let entryId = id;
    try {
      const fields = { body: e.body, visibility: e.visibility, remindOn: e.remindOn, folder: e.folder };
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
    run(() => api.mutate('updateSymptom', { id, name: s.name, intensity: s.intensity, category: s.category, notes: s.notes || null, timeOfDay: s.timeOfDay }));
  const updateMetric = (id: string, m: ParsedMetric) => run(() => api.mutate('updateMetric', { id, ...m }), 'Não foi possível salvar a medição.');
  const updateEntry = (id: string, e: NewEntry) => saveEntry(id, e);
  const updateTask = (id: string, t: NewTask) =>
    run(() => api.mutate('updateTask', { id, title: t.title, assignee: t.assignee, priority: t.priority, dueDate: t.dueDate || null, notes: t.notes || null }));
  const updateConsultation = (id: string, c: NewConsultation) =>
    run(() => api.mutate('updateConsultation', { id, scheduledAt: c.scheduledAt, specialty: c.specialty, professional: c.professional || null, location: c.location || null }));
  const deleteDetail = (d: Detail) => {
    if (d.kind === 'symptom') scheduleDelete('symptom', d.item.id, d.item.symptom_name);
    else if (d.kind === 'metric') scheduleDelete('metric', d.item.id, `medição da semana ${d.item.week_number}`);
    else if (d.kind === 'entry') scheduleDelete('entry', d.item.id, 'momento');
    else if (d.kind === 'task') scheduleDelete('task', d.item.id, `tarefa "${d.item.task_title}"`);
    else scheduleDelete('consultation', d.item.id, 'consulta');
  };

  const createConsultation = (c: NewConsultation) =>
    run(() =>
      api.mutate('createConsultation', { scheduledAt: c.scheduledAt, specialty: c.specialty, professional: c.professional || null, location: c.location || null }),
    );

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
      firstName={me.user.name.split(' ')[0]}
      members={family.members}
      greeting={greetingFor(now.getHours())}
      onOpenSpace={() => setSpaceOpen(true)}
      title={activeTab === 'inicio' || !age ? undefined : TITLE[activeTab]}
      week={age ? currentWeek : null}
    />
  );
  const spaceSheet = spaceOpen && <SpaceSheet me={me} family={family} onClose={() => setSpaceOpen(false)} onFamilyChange={onFamilyChange} onSignOut={onSignOut} onAccountDeleted={onSignOut} />;

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
  // Feito = marcado pelo casal ou comprovado pelo uso (ex.: consulta de obstetra realizada).
  const doneSteps = new Set([...data.checks.filter(c => c.list === 'prenatal').map(c => c.item_id), ...autoDone(visitsOf(data.consultations, dumDate, now))]);
  const packed = new Set(data.checks.filter(c => c.list === 'mala').map(c => c.item_id));
  const listItems = visible('item', data.listItems ?? []);
  const reactions = data.reactions ?? [];
  const threads = visible('thread', data.threads ?? []);
  const socialAvailable = data.socialAvailable ?? false;
  const hiddenOf = (list: 'prenatal' | 'mala') => new Set((data.hiddenItems ?? []).filter(h => h.list === list).map(h => h.item_id));
  const hiddenSteps = hiddenOf('prenatal');
  const exams = visible('exam', data.exams ?? []).map(e => ({ ...e, files: e.files.filter(f => !pendingDeletes.has(`examFile:${f.id}`)) }));
  const overdueTasks = tasks.filter(t => !t.is_completed && isOverdue(t.due_date)).length;
  const questions = visible('question', data.questions);
  const comments = visible('comment', data.comments);
  const consultations = visible('consultation', data.consultations);
  const nextConsultation = consultations.find(c => daysBetween(parseLocalDate(today), localDay(c.scheduled_at)) >= 0) ?? null;
  const prepareReport = (c: Consultation) => {
    setReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id });
    setActiveTab('cuidados');
    setCareView('consultas');
    window.scrollTo({ top: 0 });
  };
  const openCare = (view: CareView) => {
    navigate('cuidados');
    setCareView(view);
  };
  // Os gráficos e a jornada levam um ao outro, mesmo estando em abas diferentes.
  const openDashboardView = (v: DashboardView) => {
    if (v === 'jornada') return openCare('jornada');
    openCare('saude');
    setHealthView(v === 'geral' ? 'resumo' : v);
  };
  /** Abre o registro do diário já numa pasta. */
  const writeEntry = (folder: Folder, idea?: string) => {
    setEntryStart({ folder, idea });
    setRecording(RECORD_MODES.diario);
  };
  const openFromHome = (target: HomeTarget, planItem?: string) => {
    if (target === 'diario') return navigate('diario');
    if (target === 'saude') {
      openCare('saude');
      return setHealthView('registros');
    }
    if (target === 'graficos') return openDashboardView('sintomas');
    if (target === 'tarefas') {
      navigate('agenda');
      return setAgendaView('tarefas');
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
      checks={data.checks}
      checksAvailable={data.checksAvailable}
      onToggleStep={(id, done) => setCheck('prenatal', id, done)}
      view={view}
      onViewChange={openDashboardView}
      consultations={consultations}
      ownSteps={listItems.filter(i => i.list === 'prenatal')}
      hiddenSteps={hiddenSteps}
      listsAvailable={data.socialAvailable ?? false}
      onAddStep={(title, week) => addItem('prenatal', title, null, week)}
      onRenameItem={renameItem}
      onDeleteItem={deleteListItem}
      onHideStep={(id, hidden) => hideItem('prenatal', id, hidden)}
    />
  );

  return (
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
            nextConsultation={nextConsultation}
            symptoms={symptoms}
            metrics={metrics}
            tasks={tasks}
            insights={recentInsights}
            journal={journal}
            exams={exams}
            onToggleTask={toggleTask}
            onPrepareReport={prepareReport}
            onOpen={openFromHome}
            bloodType={data.profile.bloodType}
            doneSteps={doneSteps}
            hiddenSteps={hiddenSteps}
            checksAvailable={data.checksAvailable}
            onToggleStep={(id, done) => setCheck('prenatal', id, done)}
            reminders={journal.filter(e => e.remind_on && e.remind_on >= today && daysBetween(parseLocalDate(today), parseLocalDate(e.remind_on)) <= 30)}
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
              onChange={setAgendaView}
              options={[
                { value: 'calendario', label: 'Calendário' },
                { value: 'tarefas', label: 'Tarefas', badge: overdueTasks },
              ]}
            />
            {agendaView === 'calendario' ? (
              <CalendarTab
                dumDate={dumDate}
                currentWeek={currentWeek}
                consultations={consultations}
                tasks={tasks}
                symptoms={symptoms}
                metrics={metrics}
                journal={journal}
                busy={busy}
                migrationPending={data.migrationPending}
                onCreateConsultation={createConsultation}
                onCreateTask={createTask}
                onToggleTask={toggleTask}
                onNavigate={navigate}
                onNotify={text => showToast({ text, tone: 'info' })}
                onOpen={setDetail}
              />
            ) : (
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
              { value: 'consultas', label: 'Consultas', badge: questions.filter(q => !q.doctor_answer).length },
              { value: 'exames', label: 'Exames' },
              { value: 'saude', label: 'Saúde' },
              { value: 'jornada', label: 'Jornada' },
            ]}
          />
        )}
        {activeTab === 'cuidados' && (careView === 'consultas' || report) && (
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
            onCreateConsultation={createConsultation}
            onOpenConsultation={c => setDetail({ kind: 'consultation', id: c.id })}
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
            key={examPreset ?? 'exames'}
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
            social={{ available: socialAvailable, reactions, threads, onReact: react, onThread: sendThread, onDeleteThread: deleteThread }}
          />
        )}
        {activeTab === 'cuidados' && careView === 'saude' && !report && (
          <>
            <Segmented
              label="Parte da saúde"
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
        {activeTab === 'cuidados' && careView === 'jornada' && !report && dashboard('jornada')}

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
          onClick={() => (activeTab === 'diario' ? writeEntry(diaryView === 'tudo' ? 'momento' : diaryView) : (setEntryStart({ folder: 'momento' }), setRecording(recordModes)))}
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
