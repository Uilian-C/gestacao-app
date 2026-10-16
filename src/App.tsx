import { Suspense, lazy, useRef, useState } from 'react';
import { CloudRain, Loader2, Sprout } from 'lucide-react';
import { sql } from './db';
import Header from './components/Header';
import FichaBar, { type FichaInput } from './components/FichaBar';
import Nav from './components/Nav';
import Toast, { type ToastMessage } from './components/Toast';
import { DumForm } from './components/DumForm';
import { Card, Segmented } from './components/ui';
import type { BirthPlan } from './lib/birthPlan';
import HomeTab from './components/tabs/HomeTab';
import DiaryTab, { type NewSymptom } from './components/tabs/DiaryTab';
import type { NewConsultation, ReportRequest } from './components/tabs/ConsultationsTab';
import TasksTab, { type NewTask } from './components/tabs/TasksTab';

// Abas com gráficos, relatório e calendário carregam só quando abertas: o app abre mais rápido no celular.
const DashboardTab = lazy(() => import('./components/tabs/DashboardTab'));
const ConsultationsTab = lazy(() => import('./components/tabs/ConsultationsTab'));
const CalendarTab = lazy(() => import('./components/tabs/CalendarTab'));
const LaborTab = lazy(() => import('./components/tabs/LaborTab'));
import { questionSpecialty, type SpecialtyId } from './data/specialties';
import { useGestationData } from './hooks/useGestationData';
import { useStoredAuthor } from './hooks/useStoredAuthor';
import { FIRST_WEEK, clampWeek, daysBetween, gestationalAge, isOverdue, localDay, parseLocalDate, toISODate } from './lib/dates';
import { pressureInsights, type ParsedMetric } from './lib/health';
import { findPatterns, toEntries } from './lib/symptoms';
import type { Consultation, DeletableKind, PartnerTask, Tab } from './types';

const UNDO_WINDOW_MS = 5000;
const MIGRATION_HINT = 'Rode a migração db/migrations/002_consultas_e_padroes.sql no Neon para liberar este recurso.';

function greetingFor(hour: number): string {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function App() {
  const { data, loadState, refresh, retry } = useGestationData();
  const [author, setAuthor] = useStoredAuthor();
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [report, setReport] = useState<ReportRequest | null>(null);
  const [agendaView, setAgendaView] = useState<'calendario' | 'tarefas'>('calendario');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const deleteTimers = useRef(new Map<string, number>());

  const now = new Date();
  const today = toISODate(now);
  const dumDate = data?.profile.dumDate ?? null;
  const age = dumDate ? gestationalAge(dumDate) : null;
  const currentWeek = age ? clampWeek(age.weeks) : FIRST_WEEK;
  const selectedWeek = pickedWeek ?? currentWeek;

  const showToast = (message: Omit<ToastMessage, 'id'>) => setToast({ ...message, id: Date.now() });
  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== 'consultas') setReport(null);
    window.scrollTo({ top: 0 });
  };

  /** Executa uma alteração no banco, recarrega e avisa se der errado. Retorna se deu certo. */
  const run = async (action: () => Promise<unknown>, errorText = 'Não foi possível salvar. Verifique a conexão e tente de novo.') => {
    setBusy(true);
    try {
      await action();
      await refresh();
      return true;
    } catch (err) {
      console.error(err);
      showToast({ text: errorText, tone: 'error' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const deleteQueries: Record<DeletableKind, (id: string) => Promise<unknown>> = {
    task: id => sql`DELETE FROM partner_tasks WHERE id = ${id}`,
    symptom: async id => {
      await sql`DELETE FROM partner_comments WHERE symptom_id = ${id}`;
      await sql`DELETE FROM symptoms_log WHERE id = ${id}`;
    },
    question: id => sql`DELETE FROM medical_appointments WHERE id = ${id}`,
    comment: id => sql`DELETE FROM partner_comments WHERE id = ${id}`,
    metric: id => sql`DELETE FROM health_metrics_log WHERE id = ${id}`,
    consultation: id => sql`DELETE FROM consultations WHERE id = ${id}`,
    kick: id => sql`DELETE FROM kick_sessions WHERE id = ${id}`,
    contraction: id => sql`DELETE FROM contractions WHERE id = ${id}`,
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
      const ok = await run(() => deleteQueries[kind](id), 'Não foi possível excluir. O item voltou para a lista.');
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
      const updated = await sql`
        UPDATE families SET dum_date = ${iso}
        WHERE id = (SELECT id FROM families ORDER BY id LIMIT 1)
        RETURNING id
      `;
      if (updated.length === 0) await sql`INSERT INTO families (dum_date) VALUES (${iso})`;
      setPickedWeek(null);
    });

  const saveProfile = (preWeightKg: number, heightCm: number) =>
    run(
      () => sql`
        UPDATE families SET pre_pregnancy_weight_kg = ${preWeightKg}, height_cm = ${heightCm}
        WHERE id = (SELECT id FROM families WHERE dum_date IS NOT NULL ORDER BY id LIMIT 1)
      `,
      `Não foi possível salvar. ${MIGRATION_HINT}`,
    );

  const saveFicha = (f: FichaInput) =>
    run(
      () => sql`
        UPDATE families SET
          mother_name = ${f.motherName}, mother_birth_date = ${f.motherBirthDate}, blood_type = ${f.bloodType},
          gestations = ${f.gestations}, births = ${f.births}, abortions = ${f.abortions}, cesareans = ${f.cesareans},
          pre_pregnancy_weight_kg = ${f.preWeightKg}, height_cm = ${f.heightCm},
          allergies = ${f.allergies}, medications = ${f.medications}, conditions = ${f.conditions}
        WHERE id = (SELECT id FROM families WHERE dum_date IS NOT NULL ORDER BY id LIMIT 1)
      `,
      'Não foi possível salvar a ficha. Rode a migração db/migrations/003_ficha_gestante.sql no Neon.',
    );

  const laborError = 'Não foi possível salvar. Rode a migração db/migrations/004_parto.sql no Neon.';

  const saveKicks = (k: { startedAt: string; endedAt: string; kicks: number; target: number }) =>
    run(
      () => sql`
        INSERT INTO kick_sessions (started_at, ended_at, kicks, target, created_by)
        VALUES (${k.startedAt}, ${k.endedAt}, ${k.kicks}, ${k.target}, ${author})
      `,
      laborError,
    );

  const saveContraction = (c: { startedAt: string; endedAt: string }) =>
    run(() => sql`INSERT INTO contractions (started_at, ended_at, created_by) VALUES (${c.startedAt}, ${c.endedAt}, ${author})`, laborError);

  const saveBirthPlan = (plan: BirthPlan) =>
    run(async () => {
      const json = JSON.stringify(plan);
      const updated = await sql`
        UPDATE birth_plan SET data = ${json}::jsonb, updated_by = ${author}, updated_at = NOW()
        WHERE id = (SELECT id FROM birth_plan ORDER BY updated_at DESC LIMIT 1)
        RETURNING id
      `;
      if (updated.length === 0) await sql`INSERT INTO birth_plan (data, updated_by) VALUES (${json}::jsonb, ${author})`;
    }, laborError);

  const createTask = (t: NewTask) =>
    run(
      () => sql`
        INSERT INTO partner_tasks (week_number, task_title, assigned_to, priority, due_date, notes, created_by)
        VALUES (${t.week ?? selectedWeek}, ${t.title}, ${t.assignee}, ${t.priority}, ${t.dueDate || null}, ${t.notes || null}, ${author})
      `,
    );

  const toggleTask = (t: PartnerTask) => run(() => sql`UPDATE partner_tasks SET is_completed = ${!t.is_completed} WHERE id = ${t.id}`);

  const createSymptom = (s: NewSymptom) =>
    run(() =>
      data?.migrationPending
        ? sql`
            INSERT INTO symptoms_log (week_number, log_date, symptom_name, intensity, created_by, category, notes)
            VALUES (${currentWeek}, ${today}, ${s.name}, ${s.intensity}, ${author}, ${s.category}, ${s.notes || null})
          `
        : sql`
            INSERT INTO symptoms_log (week_number, log_date, symptom_name, intensity, created_by, category, notes, time_of_day)
            VALUES (${currentWeek}, ${today}, ${s.name}, ${s.intensity}, ${author}, ${s.category}, ${s.notes || null}, ${s.timeOfDay})
          `,
    );

  const createComment = (symptomId: string, text: string) =>
    run(() => sql`INSERT INTO partner_comments (symptom_id, author_role, comment_text) VALUES (${symptomId}, ${author}, ${text})`);

  const createQuestion = (text: string, category: string, specialty: SpecialtyId) =>
    run(() =>
      data?.migrationPending
        ? sql`
            INSERT INTO medical_appointments (week_number, appointment_date, questions_to_ask, created_by, category, status)
            VALUES (${currentWeek}, NOW(), ${text}, ${author}, ${category}, 'pendente')
          `
        : sql`
            INSERT INTO medical_appointments (week_number, appointment_date, questions_to_ask, created_by, category, status, specialty)
            VALUES (${currentWeek}, NOW(), ${text}, ${author}, ${category}, 'pendente', ${specialty})
          `,
    );

  const answerQuestion = (id: string, answer: string) =>
    run(() => sql`UPDATE medical_appointments SET doctor_answer = ${answer}, answered_at = NOW(), status = 'concluida' WHERE id = ${id}`);

  const createMetric = (m: ParsedMetric) =>
    run(
      () => sql`
        INSERT INTO health_metrics_log (week_number, recorded_at, weight_kg, systolic_bp, diastolic_bp, created_by)
        VALUES (${currentWeek}, ${today}, ${m.weight}, ${m.systolic}, ${m.diastolic}, ${author})
      `,
      'Não foi possível salvar a medição. Se for a primeira vez registrando só peso ou só pressão, rode a migração db/migrations/001_medicoes_opcionais.sql no Neon.',
    );

  const createConsultation = (c: NewConsultation) =>
    run(
      () => sql`
        INSERT INTO consultations (scheduled_at, specialty, professional_name, location, created_by)
        VALUES (${c.scheduledAt}, ${c.specialty}, ${c.professional || null}, ${c.location || null}, ${author})
      `,
      `Não foi possível agendar. ${MIGRATION_HINT}`,
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

  if (!dumDate || !age) {
    return (
      <Shell>
        <Card tone="warm" className="mt-6 space-y-4">
          <Sprout className="w-8 h-8 text-warm" />
          <h2 className="text-xl font-semibold text-ink">{dumDate ? 'A DUM cadastrada está no futuro' : 'Vamos começar pela DUM'}</h2>
          <p className="text-ink-soft">Com a data da última menstruação, o app calcula a semana, o trimestre e a data provável do parto.</p>
          <DumForm initial={dumDate ?? undefined} onSave={saveDum} />
        </Card>
      </Shell>
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
      <Header author={author} onAuthorChange={setAuthor} greeting={greetingFor(now.getHours())} />
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
          />
        )}
        {activeTab === 'painel' && (
          <DashboardTab age={age} profile={profile} symptoms={symptoms} comments={comments} metrics={metrics} migrationPending={data.migrationPending} busy={busy} onSaveProfile={saveProfile} />
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
          />
        )}
        </Suspense>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-ink text-center">Nossa Gestação</h1>
        {children}
      </main>
    </div>
  );
}
