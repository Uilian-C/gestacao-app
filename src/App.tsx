import { Suspense, lazy, useRef, useState } from 'react';
import { CloudRain, Loader2, Sprout } from 'lucide-react';
import PushPrompt from './components/PushPrompt';
import { takeTabFromUrl } from './lib/pwa';
import { api, ApiError, type FamilyState, type Me } from './api';
import SpaceSheet from './components/auth/SpaceSheet';
import Header from './components/Header';
import FichaBar, { type FichaInput } from './components/FichaBar';
import Nav from './components/Nav';
import Toast, { type ToastMessage } from './components/Toast';
import { DumForm } from './components/DumForm';
import { Card, Segmented } from './components/ui';
import type { BirthPlan } from './lib/birthPlan';
import HomeTab from './components/tabs/HomeTab';
import DiaryTab, { type NewEntry, type NewSymptom } from './components/tabs/DiaryTab';
import type { NewConsultation, ReportRequest } from './components/tabs/ConsultationsTab';
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
import type { Consultation, DashboardView, DeletableKind, PartnerTask, Tab } from './types';
import { autoDone, visitsOf } from './lib/journey';

const UNDO_WINDOW_MS = 5000;

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
  const [agendaView, setAgendaView] = useState<'calendario' | 'tarefas'>('calendario');
  const [dashboardView, setDashboardView] = useState<DashboardView>('geral');
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
    if (tab !== 'consultas') setReport(null);
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

  const deleteItem = (kind: DeletableKind, id: string) => (kind === 'entry' ? api.mutate('deleteEntry', { id }) : api.mutate('delete', { kind, id }));

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

  const createEntry = (e: NewEntry) =>
    run(() => api.mutate('createEntry', { ...e }), 'Não foi possível guardar. Se for a primeira vez, rode a migração db/migrations/008_momentos.sql no Neon.');

  const createConsultation = (c: NewConsultation) =>
    run(() =>
      api.mutate('createConsultation', { scheduledAt: c.scheduledAt, specialty: c.specialty, professional: c.professional || null, location: c.location || null }),
    );

  if (loadState !== 'ready' || !data) {
    return (
      <Shell>
        {loadState === 'loading' ? (
          <div className="flex items-center justify-center gap-2 text-brand font-semibold py-24">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando os dados de vocês...
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

  const header = <Header firstName={me.user.name.split(' ')[0]} members={family.members} greeting={greetingFor(now.getHours())} onOpenSpace={() => setSpaceOpen(true)} />;
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
  const overdueTasks = tasks.filter(t => !t.is_completed && isOverdue(t.due_date)).length;
  const questions = visible('question', data.questions);
  const comments = visible('comment', data.comments);
  const consultations = visible('consultation', data.consultations);
  const nextConsultation = consultations.find(c => daysBetween(parseLocalDate(today), localDay(c.scheduled_at)) >= 0) ?? null;
  const prepareReport = (c: Consultation) => {
    setReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id });
    setActiveTab('consultas');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink pb-28 md:pb-12">
      {header}
      <FichaBar profile={profile} metrics={metrics} busy={busy} onSave={saveFicha} />
      <Nav
        active={activeTab}
        onChange={navigate}
        badges={{
          agenda: overdueTasks,
          consultas: questions.filter(q => !q.doctor_answer).length,
        }}
      />

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 text-brand font-semibold py-16">
              <Loader2 className="w-5 h-5 animate-spin" /> Abrindo...
            </div>
          }
        >
        {data.migrationPending && activeTab === 'inicio' && (
          <p className="no-print mb-4 text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">
            Atualização do banco pendente: rodem <code>db/migrations/002_consultas_e_padroes.sql</code> no Neon para liberar a agenda de consultas, o período do dia dos sintomas e a faixa de peso.
          </p>
        )}

        {activeTab === 'inicio' && <PushPrompt />}

        {activeTab === 'inicio' && (
          <HomeTab
            age={age}
            dumDate={dumDate}
            selectedWeek={selectedWeek}
            currentWeek={currentWeek}
            onSelectWeek={setPickedWeek}
            onSaveDum={saveDum}
            nextConsultation={nextConsultation}
            questions={questions}
            symptoms={symptoms}
            metrics={metrics}
            tasks={tasks}
            insights={recentInsights}
            onToggleTask={toggleTask}
            onNavigate={navigate}
            onPrepareReport={prepareReport}
            onOpenTasks={() => {
              setAgendaView('tarefas');
              navigate('agenda');
            }}
            bloodType={data.profile.bloodType}
            doneSteps={doneSteps}
            checksAvailable={data.checksAvailable}
            busy={busy}
            onToggleStep={(id, done) => setCheck('prenatal', id, done)}
            reminders={journal.filter(e => e.remind_on && e.remind_on >= today && daysBetween(parseLocalDate(today), parseLocalDate(e.remind_on)) <= 30)}
            onOpenJourney={() => {
              setDashboardView('jornada');
              navigate('painel');
            }}
          />
        )}
        {activeTab === 'agenda' && (
          <div className="no-print mb-4 flex justify-end">
            <Segmented
              label="Visão da agenda"
              value={agendaView}
              onChange={setAgendaView}
              options={[
                { value: 'calendario', label: 'Calendário' },
                { value: 'tarefas', label: `Tarefas${overdueTasks ? ` (${overdueTasks} atrasada${overdueTasks > 1 ? 's' : ''})` : ''}` },
              ]}
            />
          </div>
        )}
        {activeTab === 'agenda' && agendaView === 'calendario' && (
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
          />
        )}
        {activeTab === 'diario' && (
          <DiaryTab
            author={author}
            age={age}
            symptoms={symptoms}
            comments={comments}
            metrics={metrics}
            selectedWeek={selectedWeek}
            currentWeek={currentWeek}
            busy={busy}
            onCreateSymptom={createSymptom}
            onCreateMetric={createMetric}
            onComment={createComment}
            onDeleteSymptom={s => scheduleDelete('symptom', s.id, s.symptom_name)}
            onDeleteComment={c => scheduleDelete('comment', c.id, 'cuidado')}
            onDeleteMetric={m => scheduleDelete('metric', m.id, `medição da semana ${m.week_number}`)}
            dumDate={dumDate}
            journal={journal}
            journalAvailable={data.journalAvailable}
            onCreateEntry={createEntry}
            onDeleteEntry={e => scheduleDelete('entry', e.id, 'momento')}
          />
        )}
        {activeTab === 'painel' && (
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
            view={dashboardView}
            onViewChange={v => {
              setDashboardView(v);
              window.scrollTo({ top: 0 });
            }}
            consultations={consultations}
            quick={{
              author,
              trimester: age.trimester,
              currentWeek,
              symptoms,
              busy,
              journalAvailable: data.journalAvailable,
              onCreateSymptom: createSymptom,
              onCreateMetric: createMetric,
              onCreateEntry: createEntry,
              onCreateConsultation: createConsultation,
            }}
          />
        )}
        {activeTab === 'consultas' && (
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
            onDeleteConsultation={c => scheduleDelete('consultation', c.id, 'consulta')}
            onCreateQuestion={createQuestion}
            onAnswer={answerQuestion}
            onDeleteQuestion={q => scheduleDelete('question', q.id, 'dúvida')}
            onNotify={text => showToast({ text, tone: 'info' })}
            kickSessions={data.kickSessions}
            contractions={data.contractions}
            birthPlan={data.birthPlan}
          />
        )}
        {activeTab === 'agenda' && agendaView === 'tarefas' && (
          <TasksTab
            tasks={tasks}
            selectedWeek={selectedWeek}
            currentWeek={currentWeek}
            busy={busy}
            onCreate={createTask}
            onToggle={toggleTask}
            onDelete={t => scheduleDelete('task', t.id, `tarefa "${t.task_title}"`)}
          />
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
          />
        )}
        </Suspense>
      </main>

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
