import { useRef, useState } from 'react';
import { Activity, CheckSquare, FileText, HelpCircle, Loader2, TrendingUp } from 'lucide-react';
import { sql } from './db';
import Header from './components/Header';
import Toast, { type ToastMessage } from './components/Toast';
import WeekOverview, { DumForm } from './components/WeekOverview';
import TasksTab, { type NewTask } from './components/tabs/TasksTab';
import SymptomsTab, { type NewSymptom } from './components/tabs/SymptomsTab';
import QuestionsTab from './components/tabs/QuestionsTab';
import MetricsTab from './components/tabs/MetricsTab';
import SummaryTab from './components/tabs/SummaryTab';
import { useGestationData } from './hooks/useGestationData';
import { useStoredAuthor } from './hooks/useStoredAuthor';
import { FIRST_WEEK, clampWeek, gestationalAge, toISODate } from './lib/dates';
import type { ParsedMetric } from './lib/health';
import type { DeletableKind, PartnerTask } from './types';

type Tab = 'tarefas' | 'sintomas' | 'consultas' | 'metricas' | 'resumo';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode; active: string }> = [
  { id: 'tarefas', label: 'Tarefas do casal', icon: <CheckSquare className="w-4 h-4" />, active: 'text-indigo-600' },
  { id: 'sintomas', label: 'Diário & sintomas', icon: <Activity className="w-4 h-4" />, active: 'text-rose-600' },
  { id: 'consultas', label: 'Dúvidas p/ obstetra', icon: <HelpCircle className="w-4 h-4" />, active: 'text-rose-600' },
  { id: 'metricas', label: 'Peso & pressão', icon: <TrendingUp className="w-4 h-4" />, active: 'text-emerald-600' },
  { id: 'resumo', label: 'Resumo', icon: <FileText className="w-4 h-4" />, active: 'text-slate-800' },
];

const UNDO_WINDOW_MS = 5000;

export default function App() {
  const { data, loadState, refresh, retry } = useGestationData();
  const [author, setAuthor] = useStoredAuthor();
  const [activeTab, setActiveTab] = useState<Tab>('tarefas');
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const deleteTimers = useRef(new Map<string, number>());

  const age = data?.dumDate ? gestationalAge(data.dumDate) : null;
  const currentWeek = age ? clampWeek(age.weeks) : FIRST_WEEK;
  const selectedWeek = pickedWeek ?? currentWeek;
  const today = toISODate(new Date());

  const showToast = (message: Omit<ToastMessage, 'id'>) => setToast({ ...message, id: Date.now() });

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

  const createTask = (t: NewTask) =>
    run(
      () => sql`
        INSERT INTO partner_tasks (week_number, task_title, assigned_to, priority, due_date, notes, created_by)
        VALUES (${selectedWeek}, ${t.title}, ${t.assignee}, ${t.priority}, ${t.dueDate || null}, ${t.notes || null}, ${author})
      `,
    );

  const toggleTask = (t: PartnerTask) => run(() => sql`UPDATE partner_tasks SET is_completed = ${!t.is_completed} WHERE id = ${t.id}`);

  const createSymptom = (s: NewSymptom) =>
    run(
      () => sql`
        INSERT INTO symptoms_log (week_number, log_date, symptom_name, intensity, created_by, category, notes)
        VALUES (${currentWeek}, ${today}, ${s.name}, ${s.intensity}, ${author}, ${s.category}, ${s.notes || null})
      `,
    );

  const createComment = (symptomId: string, text: string) =>
    run(() => sql`INSERT INTO partner_comments (symptom_id, author_role, comment_text) VALUES (${symptomId}, ${author}, ${text})`);

  const createQuestion = (text: string, category: string) =>
    run(
      () => sql`
        INSERT INTO medical_appointments (week_number, appointment_date, questions_to_ask, created_by, category, status)
        VALUES (${currentWeek}, NOW(), ${text}, ${author}, ${category}, 'pendente')
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      <Header author={author} onAuthorChange={setAuthor} age={age} />

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {loadState === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-sm text-rose-600 font-bold py-16">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando os dados de vocês...
          </div>
        )}

        {loadState === 'error' && (
          <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-3">
            <p className="font-bold text-rose-700">Não foi possível carregar os dados.</p>
            <p className="text-sm text-slate-600">Confira a conexão com a internet e tente de novo. Nenhum dado é exibido até a conexão voltar, para não mostrar informação errada.</p>
            <button onClick={retry} className="bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-sm">Tentar de novo</button>
          </div>
        )}

        {loadState === 'ready' && data && !data.dumDate && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
            <h2 className="text-lg font-bold">Vamos começar pela DUM</h2>
            <p className="text-sm text-slate-600">Com a data da última menstruação, o app calcula a semana atual, o trimestre e a data provável do parto.</p>
            <DumForm onSave={saveDum} />
          </div>
        )}

        {loadState === 'ready' && data?.dumDate && !age && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200 space-y-4">
            <p className="text-sm font-semibold text-amber-800">A DUM cadastrada ({data.dumDate}) está no futuro. Corrija a data:</p>
            <DumForm initial={data.dumDate} onSave={saveDum} />
          </div>
        )}

        {loadState === 'ready' && data?.dumDate && age && (
          <>
            <WeekOverview dumDate={data.dumDate} age={age} selectedWeek={selectedWeek} currentWeek={currentWeek} onSelectWeek={setPickedWeek} onSaveDum={saveDum} />

            <nav className="flex bg-slate-200/70 p-1.5 rounded-xl gap-1 overflow-x-auto" aria-label="Seções">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? `bg-white shadow-sm ${tab.active}` : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'tarefas' && (
              <TasksTab
                tasks={visible('task', data.tasks)}
                selectedWeek={selectedWeek}
                busy={busy}
                onCreate={createTask}
                onToggle={toggleTask}
                onDelete={t => scheduleDelete('task', t.id, `Tarefa "${t.task_title}"`)}
              />
            )}
            {activeTab === 'sintomas' && (
              <SymptomsTab
                symptoms={visible('symptom', data.symptoms)}
                comments={visible('comment', data.comments)}
                selectedWeek={selectedWeek}
                currentWeek={currentWeek}
                busy={busy}
                onCreate={createSymptom}
                onDelete={s => scheduleDelete('symptom', s.id, `Registro "${s.symptom_name}"`)}
                onComment={createComment}
                onDeleteComment={c => scheduleDelete('comment', c.id, 'Comentário')}
              />
            )}
            {activeTab === 'consultas' && (
              <QuestionsTab
                questions={visible('question', data.questions)}
                busy={busy}
                onCreate={createQuestion}
                onAnswer={answerQuestion}
                onDelete={q => scheduleDelete('question', q.id, 'Dúvida')}
              />
            )}
            {activeTab === 'metricas' && (
              <MetricsTab
                metrics={visible('metric', data.metrics)}
                currentWeek={currentWeek}
                busy={busy}
                onCreate={createMetric}
                onDelete={m => scheduleDelete('metric', m.id, `Medição da semana ${m.week_number}`)}
              />
            )}
            {activeTab === 'resumo' && <SummaryTab age={age} />}
          </>
        )}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
