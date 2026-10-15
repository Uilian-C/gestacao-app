import React, { useState, useEffect } from 'react';
import { 
  Heart, Stethoscope, FileText, Plus, Activity, Baby, Scale, 
  Loader2, CheckSquare, Users, Calendar, 
  TrendingUp, HelpCircle, ShieldCheck, Trash2, BarChart2, Filter,
  CheckCircle2, Clock
} from 'lucide-react';
import { sql } from './db';

// Dados de referência por semana
const GESTATION_WEEKS = Array.from({ length: 37 }, (_, i) => {
  const week = i + 4;
  let fruit = "Semente de Papoila";
  let size = "1-2 mm";
  let weight = "< 1g";
  let trimester = 1;
  let omsWeightMin = 0.5;
  let omsWeightMax = 1.5;

  if (week >= 5 && week <= 7) { fruit = "Grão de Arroz"; size = "5-10 mm"; weight = "< 1g"; omsWeightMin = 0.5; omsWeightMax = 2.0; }
  else if (week >= 8 && week <= 10) { fruit = "Azeitona / Uva"; size = "1.6 - 3.1 cm"; weight = "1 - 4g"; omsWeightMin = 1.0; omsWeightMax = 2.5; }
  else if (week >= 11 && week <= 13) { fruit = "Figo / Lima"; size = "4.1 - 7.4 cm"; weight = "7 - 23g"; omsWeightMin = 1.5; omsWeightMax = 3.0; }
  else if (week >= 14 && week <= 17) { fruit = "Maçã / Abacate"; size = "8.7 - 13 cm"; weight = "43 - 140g"; trimester = 2; omsWeightMin = 3.0; omsWeightMax = 5.0; }
  else if (week >= 18 && week <= 22) { fruit = "Manga / Banana"; size = "14.2 - 27.8 cm"; weight = "190 - 430g"; trimester = 2; omsWeightMin = 5.0; omsWeightMax = 7.5; }
  else if (week >= 23 && week <= 27) { fruit = "Berinjela / Couve-Flor"; size = "28.9 - 36.6 cm"; weight = "500 - 875g"; trimester = 2; omsWeightMin = 7.5; omsWeightMax = 10.0; }
  else if (week >= 28 && week <= 32) { fruit = "Melão / Coco"; size = "37.6 - 42.4 cm"; weight = "1g - 1.7kg"; trimester = 3; omsWeightMin = 10.0; omsWeightMax = 12.5; }
  else if (week >= 33) { fruit = "Melancia"; size = "43.7 - 50.7 cm"; weight = "1.9kg - 3.3kg"; trimester = 3; omsWeightMin = 11.5; omsWeightMax = 15.0; }

  return { week, fruit, size, weight, trimester, omsWeightMin, omsWeightMax };
});

interface SymptomItem {
  id: string;
  week_number: number;
  log_date: string;
  symptom_name: string;
  intensity: number;
  created_by: string;
  category: string;
  notes?: string;
}

interface QuestionItem {
  id: string;
  questions_to_ask: string;
  created_by: string;
  category: string;
  doctor_answer?: string;
  created_at: string;
  status: string;
}

interface PartnerTask {
  id: string;
  week_number: number;
  task_title: string;
  assigned_to: 'mae' | 'pai' | 'casal';
  is_completed: boolean;
  due_date?: string;
  priority?: 'Baixa' | 'Média' | 'Alta';
  notes?: string;
  created_by?: string;
}

interface PartnerComment {
  id: string;
  symptom_id: string;
  comment_text: string;
  author_role: string;
}

interface HealthMetric {
  id: string;
  week_number: number;
  recorded_at: string;
  weight_kg: number;
  systolic_bp: number;
  diastolic_bp: number;
  created_by: string;
}

export default function App() {
  const [dumDate, setDumDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return d.toISOString().split('T')[0];
  });

  const [activeAuthor, setActiveAuthor] = useState<'mae' | 'pai'>('mae');
  const [selectedWeek, setSelectedWeek] = useState<number>(4);
  const [activeTab, setActiveTab] = useState<'sintomas' | 'consultas' | 'metricas' | 'tarefas' | 'resumo'>('tarefas');
  const [diaryFilterMode, setDiaryFilterMode] = useState<'semana' | 'todas'>('semana');
  const [loading, setLoading] = useState<boolean>(false);

  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'todos' | 'mae' | 'pai' | 'casal'>('todos');
  const [taskPeriodFilter, setTaskPeriodFilter] = useState<'semana' | 'tri1' | 'tri2' | 'tri3' | 'todas'>('semana');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'pendentes' | 'concluidas' | 'todas'>('pendentes');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<'mae' | 'pai' | 'casal'>('casal');
  const [newTaskPriority, setNewTaskPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [newIntensity, setNewIntensity] = useState(2);
  const [newSymptomCategory, setNewSymptomCategory] = useState('Físico');

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState('Alimentação');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [doctorAnswerText, setDoctorAnswerText] = useState('');

  const [partnerTasks, setPartnerTasks] = useState<PartnerTask[]>([]);
  const [comments, setComments] = useState<PartnerComment[]>([]);
  const [activeCommentInput, setActiveCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [newWeight, setNewWeight] = useState<string>('');
  const [newSystolic, setNewSystolic] = useState<string>('120');
  const [newDiastolic, setNewDiastolic] = useState<string>('80');

  const calculateGestationalAge = () => {
    const start = new Date(dumDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const calculatedWeeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;

    const dpp = new Date(start);
    dpp.setDate(dpp.getDate() + 280);

    const daysToDpp = Math.ceil((dpp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { 
      weeks: Math.max(4, Math.min(40, calculatedWeeks)), 
      days: remainingDays, 
      dppFormatted: dpp.toLocaleDateString('pt-BR'),
      daysToDpp
    };
  };

  const currentGestational = calculateGestationalAge();
  const weekData = GESTATION_WEEKS.find(w => w.week === selectedWeek) || GESTATION_WEEKS[0];

  const loadData = async () => {
    try {
      setLoading(true);

      const familyRes = await sql`SELECT dum_date::text FROM families LIMIT 1`;
      if (familyRes && familyRes.length > 0 && familyRes[0].dum_date) {
        setDumDate(familyRes[0].dum_date);
      }

      const symptomsData = await sql`
        SELECT id, week_number, log_date::text, symptom_name, intensity, COALESCE(created_by, 'mae') as created_by, COALESCE(category, 'Geral') as category, notes 
        FROM symptoms_log 
        ORDER BY created_at DESC
      `;
      setSymptoms(symptomsData as SymptomItem[]);

      const questionsData = await sql`
        SELECT id, questions_to_ask, COALESCE(created_by, 'mae') as created_by, COALESCE(category, 'Geral') as category, doctor_answer, created_at::text, status 
        FROM medical_appointments 
        WHERE questions_to_ask IS NOT NULL 
        ORDER BY created_at DESC
      `;
      setQuestions(questionsData as QuestionItem[]);

      const tasksData = await sql`
        SELECT id, week_number, task_title, COALESCE(assigned_to, 'casal') as assigned_to, is_completed, due_date::text, COALESCE(priority, 'Média') as priority, notes, COALESCE(created_by, 'mae') as created_by
        FROM partner_tasks 
        ORDER BY created_at DESC
      `;
      setPartnerTasks(tasksData as PartnerTask[]);

      const commentsData = await sql`
        SELECT id, symptom_id, comment_text, author_role 
        FROM partner_comments 
        ORDER BY created_at ASC
      `;
      setComments(commentsData as PartnerComment[]);

      const metricsData = await sql`
        SELECT id, week_number, recorded_at::text, weight_kg, systolic_bp, diastolic_bp, COALESCE(created_by, 'mae') as created_by
        FROM health_metrics_log
        ORDER BY week_number ASC
      `;
      setHealthMetrics(metricsData as HealthMetric[]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      setLoading(true);
      await sql`
        INSERT INTO partner_tasks (week_number, task_title, assigned_to, priority, due_date, notes, created_by)
        VALUES (${selectedWeek}, ${newTaskTitle}, ${newTaskAssignee}, ${newTaskPriority}, ${newTaskDueDate ? newTaskDueDate : null}, ${newTaskNotes}, ${activeAuthor})
      `;
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDueDate('');
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      await sql`UPDATE partner_tasks SET is_completed = ${!currentStatus} WHERE id = ${taskId}`;
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Deseja excluir esta tarefa?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM partner_tasks WHERE id = ${taskId}`;
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymptom.trim()) return;
    try {
      setLoading(true);
      await sql`
        INSERT INTO symptoms_log (week_number, symptom_name, intensity, created_by, category) 
        VALUES (${selectedWeek}, ${newSymptom}, ${newIntensity}, ${activeAuthor}, ${newSymptomCategory})
      `;
      setNewSymptom('');
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteSymptom = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM symptoms_log WHERE id = ${id}`;
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    try {
      setLoading(true);
      await sql`
        INSERT INTO medical_appointments (week_number, appointment_date, questions_to_ask, created_by, category) 
        VALUES (${selectedWeek}, NOW(), ${newQuestion}, ${activeAuthor}, ${newQuestionCategory})
      `;
      setNewQuestion('');
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Deseja excluir esta dúvida?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM medical_appointments WHERE id = ${id}`;
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSaveDoctorAnswer = async (questionId: string) => {
    if (!doctorAnswerText.trim()) return;
    try {
      setLoading(true);
      await sql`
        UPDATE medical_appointments 
        SET doctor_answer = ${doctorAnswerText}, answered_at = NOW(), status = 'concluida'
        WHERE id = ${questionId}
      `;
      setEditingAnswerId(null);
      setDoctorAnswerText('');
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddComment = async (symptomId: string) => {
    if (!commentText.trim()) return;
    try {
      setLoading(true);
      await sql`
        INSERT INTO partner_comments (symptom_id, author_role, comment_text)
        VALUES (${symptomId}, ${activeAuthor}, ${commentText})
      `;
      setCommentText('');
      setActiveCommentInput(null);
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Deseja excluir este comentário?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM partner_comments WHERE id = ${id}`;
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddHealthMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    try {
      setLoading(true);
      await sql`
        INSERT INTO health_metrics_log (week_number, weight_kg, systolic_bp, diastolic_bp, created_by)
        VALUES (${selectedWeek}, ${parseFloat(newWeight)}, ${parseInt(newSystolic)}, ${parseInt(newDiastolic)}, ${activeAuthor})
      `;
      setNewWeight('');
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteMetric = async (id: string) => {
    if (!confirm('Deseja excluir esta medição?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM health_metrics_log WHERE id = ${id}`;
      await loadData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredTasks = partnerTasks.filter(t => {
    if (taskAssigneeFilter !== 'todos' && t.assigned_to !== taskAssigneeFilter) return false;
    if (taskPeriodFilter === 'semana' && t.week_number !== selectedWeek) return false;
    if (taskPeriodFilter === 'tri1' && (t.week_number < 4 || t.week_number > 13)) return false;
    if (taskPeriodFilter === 'tri2' && (t.week_number < 14 || t.week_number > 27)) return false;
    if (taskPeriodFilter === 'tri3' && t.week_number < 28) return false;
    if (taskStatusFilter === 'pendentes' && t.is_completed) return false;
    if (taskStatusFilter === 'concluidas' && !t.is_completed) return false;
    return true;
  });

  const baseDashboardTasks = partnerTasks.filter(t => {
    if (taskAssigneeFilter === 'todos') return true;
    return t.assigned_to === taskAssigneeFilter;
  });

  const totalTasks = baseDashboardTasks.length;
  const completedTasks = baseDashboardTasks.filter(t => t.is_completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredSymptoms = diaryFilterMode === 'semana' 
    ? symptoms.filter(s => s.week_number === selectedWeek)
    : symptoms;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      <header className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 text-white p-6 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="fill-white w-6 h-6" /> Nossa Gestação
            </h1>
            <p className="text-white/90 text-xs mt-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 inline" /> Espaço Colaborativo do Casal & Gestão Gestacional
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border border-white/20">
              <span className="text-[10px] uppercase font-bold text-white/70 px-2">Usuário:</span>
              <button onClick={() => setActiveAuthor('mae')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeAuthor === 'mae' ? 'bg-white text-rose-600 shadow' : 'text-white/80 hover:text-white'}`}>💖 Mãe</button>
              <button onClick={() => setActiveAuthor('pai')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeAuthor === 'pai' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'}`}>💙 Pai</button>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-right border border-white/20">
              <span className="text-[10px] uppercase tracking-wider block font-semibold text-white/80">Idade Gestacional</span>
              <span className="text-lg font-extrabold">{currentGestational.weeks}ª Sem + {currentGestational.days}d</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full">{weekData.trimester}º Trimestre</span>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> DPP: <strong>{currentGestational.dppFormatted}</strong> ({currentGestational.daysToDpp} dias)</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Desenvolvimento da Semana {selectedWeek}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-semibold">Semana Visível:</label>
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400">
                {GESTATION_WEEKS.map(w => (<option key={w.week} value={w.week}>Semana {w.week} {w.week === currentGestational.weeks ? '(Atual)' : ''}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
              <span>Semana 4 (Início)</span>
              <span>13w (Fim 1º Tri)</span>
              <span>27w (Fim 2º Tri)</span>
              <span>40w (Parto)</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex relative border border-slate-200">
              <div className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, ((selectedWeek - 4) / 36) * 100)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-lg shadow-sm"><Baby className="w-6 h-6" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Tamanho Estimado</span>
                <span className="font-bold text-slate-800 text-base">{weekData.fruit}</span>
              </div>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="p-3 bg-blue-500 text-white rounded-lg shadow-sm"><Activity className="w-6 h-6" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Comprimento Estimado</span>
                <span className="font-bold text-slate-800 text-base">{weekData.size}</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-lg shadow-sm"><Scale className="w-6 h-6" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Peso Aproximado</span>
                <span className="font-bold text-slate-800 text-base">{weekData.weight}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex bg-slate-200/70 p-1.5 rounded-xl gap-1 overflow-x-auto">
          <button onClick={() => setActiveTab('tarefas')} className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'tarefas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><CheckSquare className="w-4 h-4" /> Tarefas do Casal</button>
          <button onClick={() => setActiveTab('sintomas')} className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'sintomas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Activity className="w-4 h-4" /> Diário & Sintomas</button>
          <button onClick={() => setActiveTab('consultas')} className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'consultas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><HelpCircle className="w-4 h-4" /> Q&A do Obstetra</button>
          <button onClick={() => setActiveTab('metricas')} className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'metricas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><TrendingUp className="w-4 h-4" /> Métricas OMS</button>
          <button onClick={() => setActiveTab('resumo')} className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'resumo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><FileText className="w-4 h-4" /> Resumo</button>
        </div>

        {loading && (<div className="flex items-center justify-center gap-2 text-xs text-rose-600 font-bold py-1"><Loader2 className="w-4 h-4 animate-spin" /> Atualizando...</div>)}

        {/* TAREFAS */}
        {activeTab === 'tarefas' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-600" /> Painel Executivo de Tarefas</h3>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setTaskAssigneeFilter('todos')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>👥 Todos</button>
                  <button onClick={() => setTaskAssigneeFilter('mae')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'mae' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>💖 Mãe</button>
                  <button onClick={() => setTaskAssigneeFilter('pai')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'pai' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>💙 Pai</button>
                  <button onClick={() => setTaskAssigneeFilter('casal')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'casal' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>🤝 Casal</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-xs text-slate-500 font-semibold block">Total</span><span className="text-2xl font-extrabold text-slate-800">{totalTasks}</span></div>
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100"><span className="text-xs text-amber-700 font-semibold block">Pendentes</span><span className="text-2xl font-extrabold text-amber-800">{pendingTasks}</span></div>
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100"><span className="text-xs text-emerald-700 font-semibold block">Concluídas</span><span className="text-2xl font-extrabold text-emerald-800">{completedTasks}</span></div>
                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100"><span className="text-xs text-indigo-700 font-semibold block">Progresso</span><span className="text-2xl font-extrabold text-indigo-800">{completionRate}%</span></div>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-600" /> Cadastrar Tarefa</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><input type="text" placeholder="Título da tarefa..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-400" /></div>
                <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value as 'mae' | 'pai' | 'casal')} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-400 font-semibold"><option value="mae">💖 Mãe</option><option value="pai">💙 Pai</option><option value="casal">🤝 Casal</option></select>
                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as 'Baixa' | 'Média' | 'Alta')} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-400 font-semibold"><option value="Baixa">🟢 Baixa</option><option value="Média">🟡 Média</option><option value="Alta">🔴 Alta</option></select>
                <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-400" />
                <input type="text" placeholder="Observação interna..." value={newTaskNotes} onChange={(e) => setNewTaskNotes(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-400" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition">Criar Tarefa</button>
            </form>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500" /> Lista de Tarefas</h3>
                <div className="flex gap-2">
                  <select value={taskPeriodFilter} onChange={(e) => setTaskPeriodFilter(e.target.value as any)} className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-700"><option value="semana">Apenas Semana {selectedWeek}</option><option value="tri1">1º Trimestre</option><option value="tri2">2º Trimestre</option><option value="tri3">3º Trimestre</option><option value="todas">Todas</option></select>
                  <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value as any)} className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-700"><option value="pendentes">Pendentes</option><option value="concluidas">Concluídas</option><option value="todas">Todas</option></select>
                </div>
              </div>
              <div className="space-y-3">
                {filteredTasks.map((t) => (
                  <div key={t.id} className={`p-4 rounded-xl border transition-all ${t.is_completed ? 'bg-slate-50 opacity-75' : 'bg-white hover:border-indigo-300 shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <button onClick={() => handleToggleTask(t.id, t.is_completed)} className="mt-0.5 text-slate-400 hover:text-indigo-600">{t.is_completed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <div className="w-5 h-5 rounded-full border-2 hover:border-indigo-500" />}</button>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-bold ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.task_title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${t.assigned_to === 'mae' ? 'bg-rose-100 text-rose-700' : t.assigned_to === 'pai' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-800'}`}>{t.assigned_to === 'mae' ? '💖 Mãe' : t.assigned_to === 'pai' ? '💙 Pai' : '🤝 Casal'}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">Semana {t.week_number}</span>
                          </div>
                          {t.due_date && <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1 pt-0.5"><Clock className="w-3.5 h-3.5" /> Prazo: {new Date(t.due_date).toLocaleDateString('pt-BR')}</span>}
                          {t.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border mt-2">💬 {t.notes}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(t.id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DIÁRIO */}
        {activeTab === 'sintomas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSymptom} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5"><Plus className="w-4 h-4 text-rose-500" /> Registrar Sintoma</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Sintoma..." value={newSymptom} onChange={(e) => setNewSymptom(e.target.value)} className="border rounded-xl px-3.5 py-2 text-sm" />
                <select value={newSymptomCategory} onChange={(e) => setNewSymptomCategory(e.target.value)} className="border rounded-xl px-3.5 py-2 text-sm bg-white"><option>Físico</option><option>Digestivo</option><option>Emocional</option><option>Sono</option></select>
                <input type="number" min="1" max="5" value={newIntensity} onChange={(e) => setNewIntensity(Number(e.target.value))} className="border rounded-xl px-3.5 py-2 text-sm" />
              </div>
              <button type="submit" className="w-full bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm">Salvar no Diário</button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-800 text-sm uppercase">Diário do Casal</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border">
                  <button onClick={() => setDiaryFilterMode('semana')} className={`px-3 py-1 rounded-md text-xs font-bold ${diaryFilterMode === 'semana' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}>Apenas Sem {selectedWeek}</button>
                  <button onClick={() => setDiaryFilterMode('todas')} className={`px-3 py-1 rounded-md text-xs font-bold ${diaryFilterMode === 'todas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}>Tudo</button>
                </div>
              </div>
              {filteredSymptoms.map((s) => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-xl border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-2"><span className="font-bold text-base">{s.symptom_name}</span><span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200">{s.category}</span></div>
                      <span className="text-xs text-slate-400">{s.log_date} • Semana {s.week_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700">Nível {s.intensity}/5</span>
                      <button onClick={() => handleDeleteSymptom(s.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {comments.filter(c => c.symptom_id === s.id).map(c => (
                    <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border flex justify-between"><span className="text-slate-700"><strong>Nota:</strong> {c.comment_text}</span><button onClick={() => handleDeleteComment(c.id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  ))}
                  <div className="flex gap-2 pt-1"><input type="text" placeholder="Adicionar apoio..." value={activeCommentInput === s.id ? commentText : ''} onChange={(e) => setCommentText(e.target.value)} onClick={() => setActiveCommentInput(s.id)} className="flex-1 border rounded-lg px-3 py-1.5 text-xs" /><button onClick={() => handleAddComment(s.id)} className="bg-indigo-600 text-white text-xs px-3 rounded-lg font-bold">Salvar</button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSULTAS */}
        {activeTab === 'consultas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddQuestion} className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
              <h3 className="font-bold text-sm uppercase flex items-center gap-2"><Stethoscope className="w-4 h-4 text-rose-500" /> Cadastrar Dúvida</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" placeholder="Dúvida..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} className="md:col-span-3 border rounded-xl px-4 py-2 text-sm" />
                <select value={newQuestionCategory} onChange={(e) => setNewQuestionCategory(e.target.value)} className="border rounded-xl px-3.5 py-2 text-sm"><option>Alimentação</option><option>Medicação</option><option>Exames</option><option>Geral</option></select>
              </div>
              <button type="submit" className="w-full bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm">Anotar Dúvida</button>
            </form>
            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
              <h3 className="font-bold text-sm uppercase">Mural de Perguntas</h3>
              {questions.map((q) => (
                <div key={q.id} className="p-4 bg-slate-50 rounded-xl border space-y-2">
                  <div className="flex justify-between items-start"><span className="text-xs font-bold px-2 py-0.5 bg-slate-200 rounded-md">{q.category}</span><button onClick={() => handleDeleteQuestion(q.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div>
                  <p className="text-sm font-semibold">• {q.questions_to_ask}</p>
                  {q.doctor_answer ? <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs"><span className="font-bold uppercase text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Conduta:</span>{q.doctor_answer}</div> : <div className="pt-2 flex gap-2"><input type="text" placeholder="Conduta..." value={editingAnswerId === q.id ? doctorAnswerText : ''} onChange={(e) => setDoctorAnswerText(e.target.value)} onClick={() => setEditingAnswerId(q.id)} className="flex-1 border rounded-lg px-3 py-1.5 text-xs" /><button onClick={() => handleSaveDoctorAnswer(q.id)} className="bg-emerald-600 text-white text-xs px-3 rounded-lg font-bold">Salvar Conduta</button></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MÉTRICAS & GRÁFICOS */}
        {activeTab === 'metricas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddHealthMetric} className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
              <h3 className="font-bold text-sm uppercase flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> Registrar Medição</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" step="0.1" placeholder="Peso (kg)" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
                <input type="number" placeholder="Sistólica" value={newSystolic} onChange={(e) => setNewSystolic(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
                <input type="number" placeholder="Diastólica" value={newDiastolic} onChange={(e) => setNewDiastolic(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm">Registrar</button>
            </form>
            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-6">
              <h3 className="font-bold text-sm uppercase flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-600" /> Dashboard de Evolução</h3>
              <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
                <span className="font-bold text-xs uppercase">Curva de Peso vs OMS</span>
                <div className="h-40 flex items-end gap-2 pt-4 px-2 border-b border-l relative">
                  {healthMetrics.map((m, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded">{m.weight_kg}kg</div>
                      <div className="w-full bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all" style={{ height: `${Math.min(100, Math.max(15, (m.weight_kg / 80) * 100))}%` }} />
                      <span className="text-[10px] font-bold text-slate-500">{m.week_number}w</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 space-y-2">
                {healthMetrics.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                    <div><span className="font-bold text-xs">Semana {m.week_number}</span><span className="text-[11px] block text-slate-500">PA: {m.systolic_bp}/{m.diastolic_bp}</span></div>
                    <div className="flex items-center gap-3"><span className="font-extrabold text-sm">{m.weight_kg} kg</span><button onClick={() => handleDeleteMetric(m.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESUMO */}
        {activeTab === 'resumo' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
            <div className="border-b pb-4 flex justify-between items-start">
              <div><h3 className="text-xl font-bold">Relatório Executivo</h3></div>
              <button onClick={() => window.print()} className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold">Salvar PDF</button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl border">
              <div><span className="text-slate-500 block text-xs">Idade:</span> <strong>{currentGestational.weeks} Sem + {currentGestational.days}d</strong></div>
              <div><span className="text-slate-500 block text-xs">Trimestre:</span> <strong>{weekData.trimester}º</strong></div>
              <div><span className="text-slate-500 block text-xs">DPP:</span> <strong>{currentGestational.dppFormatted}</strong></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}