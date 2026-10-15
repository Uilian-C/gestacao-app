import React, { useState, useEffect } from 'react';
import { 
  Heart, Stethoscope, FileText, Plus, Activity, Baby, Scale, 
  Loader2, MessageSquare, CheckSquare, Users, Calendar, 
  TrendingUp, HelpCircle, ShieldCheck, Trash2, BarChart2, Filter,
  CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, UserCheck
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

  // Estados das Tarefas
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'todos' | 'mae' | 'pai' | 'casal'>('todos');
  const [taskPeriodFilter, setTaskPeriodFilter] = useState<'semana' | 'tri1' | 'tri2' | 'tri3' | 'todas'>('semana');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'pendentes' | 'concluidas' | 'todas'>('pendentes');

  // Formulário de Criação de Tarefa
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<'mae' | 'pai' | 'casal'>('casal');
  const [newTaskPriority, setNewTaskPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Estados gerais
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
      console.error('Erro ao carregar do Neon:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler de Criação de Tarefa
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setLoading(true);
      await sql`
        INSERT INTO partner_tasks (week_number, task_title, assigned_to, priority, due_date, notes, created_by)
        VALUES (
          ${selectedWeek}, 
          ${newTaskTitle}, 
          ${newTaskAssignee}, 
          ${newTaskPriority}, 
          ${newTaskDueDate ? newTaskDueDate : null}, 
          ${newTaskNotes}, 
          ${activeAuthor}
        )
      `;
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDueDate('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      await sql`
        UPDATE partner_tasks 
        SET is_completed = ${!currentStatus} 
        WHERE id = ${taskId}
      `;
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Deseja excluir esta tarefa?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM partner_tasks WHERE id = ${taskId}`;
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handlers Gerais
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSymptom = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM symptoms_log WHERE id = ${id}`;
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

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Deseja excluir esta dúvida?')) return;
    try {
      setLoading(true);
      await sql`DELETE FROM medical_appointments WHERE id = ${id}`;
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

  // LÓGICA DE FILTRAGEM DAS TAREFAS
  const filteredTasks = partnerTasks.filter(t => {
    // 1. Filtro de Responsável
    if (taskAssigneeFilter !== 'todos' && t.assigned_to !== taskAssigneeFilter) return false;

    // 2. Filtro por Período / Semana
    if (taskPeriodFilter === 'semana' && t.week_number !== selectedWeek) return false;
    if (taskPeriodFilter === 'tri1' && (t.week_number < 4 || t.week_number > 13)) return false;
    if (taskPeriodFilter === 'tri2' && (t.week_number < 14 || t.week_number > 27)) return false;
    if (taskPeriodFilter === 'tri3' && t.week_number < 28) return false;

    // 3. Filtro por Status
    if (taskStatusFilter === 'pendentes' && t.is_completed) return false;
    if (taskStatusFilter === 'concluidas' && !t.is_completed) return false;

    return true;
  });

  // Métricas do Dashboard de Tarefas
  const baseDashboardTasks = partnerTasks.filter(t => {
    if (taskAssigneeFilter === 'todos') return true;
    return t.assigned_to === taskAssigneeFilter;
  });

  const totalTasks = baseDashboardTasks.length;
  const completedTasks = baseDashboardTasks.filter(t => t.is_completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* HEADER EXECUTIVO DO CASAL */}
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
              <span className="text-[10px] uppercase font-bold text-white/70 px-2">Usuário Ativo:</span>
              <button 
                onClick={() => setActiveAuthor('mae')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeAuthor === 'mae' ? 'bg-white text-rose-600 shadow' : 'text-white/80 hover:text-white'}`}
              >
                💖 Mãe
              </button>
              <button 
                onClick={() => setActiveAuthor('pai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeAuthor === 'pai' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'}`}
              >
                💙 Pai
              </button>
            </div>

            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-right border border-white/20">
              <span className="text-[10px] uppercase tracking-wider block font-semibold text-white/80">Idade Gestacional</span>
              <span className="text-lg font-extrabold">{currentGestational.weeks}ª Sem + {currentGestational.days}d</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

        {/* MÉTRICA TEMPORAL & RÉGUA GESTACIONAL */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full">
                  {weekData.trimester}º Trimestre
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> DPP Prevista: <strong>{currentGestational.dppFormatted}</strong> ({currentGestational.daysToDpp} dias restantes)
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Desenvolvimento da Semana {selectedWeek}</h2>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-semibold">Navegar por Semana:</label>
              <select 
                value={selectedWeek} 
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {GESTATION_WEEKS.map(w => (
                  <option key={w.week} value={w.week}>Semana {w.week} {w.week === currentGestational.weeks ? '(Atual)' : ''}</option>
                ))}
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
              <div 
                className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-indigo-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, ((selectedWeek - 4) / 36) * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex bg-slate-200/70 p-1.5 rounded-xl gap-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('tarefas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'tarefas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <CheckSquare className="w-4 h-4" /> Tarefas do Casal
          </button>
          <button 
            onClick={() => setActiveTab('sintomas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'sintomas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Activity className="w-4 h-4" /> Diário & Sintomas
          </button>
          <button 
            onClick={() => setActiveTab('consultas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'consultas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <HelpCircle className="w-4 h-4" /> Q&A do Obstetra
          </button>
          <button 
            onClick={() => setActiveTab('metricas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'metricas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <TrendingUp className="w-4 h-4" /> Métricas OMS & Saúde
          </button>
          <button 
            onClick={() => setActiveTab('resumo')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'resumo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <FileText className="w-4 h-4" /> Resumo Médico
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-rose-600 font-bold py-1">
            <Loader2 className="w-4 h-4 animate-spin" /> Sincronizando no Neon.tech...
          </div>
        )}

        {/* ========================================== */}
        {/* SESSÃO 1: TAREFAS DO CASAL (TOTALMENTE REDESENHADA) */}
        {/* ========================================== */}
        {activeTab === 'tarefas' && (
          <div className="space-y-6">

            {/* 1. DASHBOARD DE PROGRESSO DE TAREFAS NO TOPO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-indigo-600" /> Painel Executivo de Tarefas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Visão consolidada do progresso de compromissos do casal</p>
                </div>

                {/* Filtro por Responsável no Dashboard */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setTaskAssigneeFilter('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                  >
                    👥 Todos
                  </button>
                  <button 
                    onClick={() => setTaskAssigneeFilter('mae')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'mae' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    💖 Mãe
                  </button>
                  <button 
                    onClick={() => setTaskAssigneeFilter('pai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'pai' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    💙 Pai
                  </button>
                  <button 
                    onClick={() => setTaskAssigneeFilter('casal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${taskAssigneeFilter === 'casal' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    🤝 Casal
                  </button>
                </div>
              </div>

              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block">Total de Tarefas</span>
                  <span className="text-2xl font-extrabold text-slate-800">{totalTasks}</span>
                </div>
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                  <span className="text-xs text-amber-700 font-semibold block">Pendentes</span>
                  <span className="text-2xl font-extrabold text-amber-800">{pendingTasks}</span>
                </div>
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                  <span className="text-xs text-emerald-700 font-semibold block">Concluídas</span>
                  <span className="text-2xl font-extrabold text-emerald-800">{completedTasks}</span>
                </div>
                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                  <span className="text-xs text-indigo-700 font-semibold block">Taxa de Conclusão</span>
                  <span className="text-2xl font-extrabold text-indigo-800">{completionRate}%</span>
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Progresso do Ciclo</span>
                  <span>{completedTasks} de {totalTasks} concluídas</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. FORMULÁRIO DE CRIAÇÃO DE TAREFA PROGRAMADA */}
            <form onSubmit={handleCreateTask} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" /> Cadastrar Nova Tarefa com Programação
                </h3>
                <span className="text-xs text-slate-400 font-medium">Vinculada à Semana {selectedWeek}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Título da Tarefa</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Agendar ultrassom morfológico, Comprar vacina DTPa..." 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quem deve executar?</label>
                  <select 
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value as 'mae' | 'pai' | 'casal')}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-semibold"
                  >
                    <option value="mae">💖 Mãe</option>
                    <option value="pai">💙 Pai</option>
                    <option value="casal">🤝 Ambos (Casal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prioridade</label>
                  <select 
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'Baixa' | 'Média' | 'Alta')}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-semibold"
                  >
                    <option value="Baixa">🟢 Baixa</option>
                    <option value="Média">🟡 Média</option>
                    <option value="Alta">🔴 Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data Programada (Opcional)</label>
                  <input 
                    type="date" 
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Observação / Comentário Interno</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Ligar na clínica X até as 17h..." 
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm">
                Criar Tarefa Programada
              </button>
            </form>

            {/* 3. LÓGICA DE AGRUPAMENTO E LISTA DE TAREFAS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" /> Lista de Tarefas por Período
                </h3>

                <div className="flex flex-wrap gap-2">
                  {/* Seletor de Período */}
                  <select 
                    value={taskPeriodFilter}
                    onChange={(e) => setTaskPeriodFilter(e.target.value as any)}
                    className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-700"
                  >
                    <option value="semana">Apenas Semana {selectedWeek}</option>
                    <option value="tri1">1º Trimestre (W4 - W13)</option>
                    <option value="tri2">2º Trimestre (W14 - W27)</option>
                    <option value="tri3">3º Trimestre (W28+)</option>
                    <option value="todas">Todas as Semanas</option>
                  </select>

                  {/* Seletor de Status */}
                  <select 
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                    className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-700"
                  >
                    <option value="pendentes">Pendentes</option>
                    <option value="concluidas">Concluídas</option>
                    <option value="todas">Todas</option>
                  </select>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Nenhuma tarefa encontrada com os filtros selecionados.</p>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((t) => (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-xl border transition-all ${t.is_completed ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <button 
                            onClick={() => handleToggleTask(t.id, t.is_completed)}
                            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition"
                          >
                            {t.is_completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-indigo-500" />
                            )}
                          </button>

                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-sm font-bold ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {t.task_title}
                              </span>

                              {/* Badge do Responsável */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                t.assigned_to === 'mae' ? 'bg-rose-100 text-rose-700' :
                                t.assigned_to === 'pai' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {t.assigned_to === 'mae' ? '💖 Mãe' : t.assigned_to === 'pai' ? '💙 Pai' : '🤝 Casal'}
                              </span>

                              {/* Badge de Prioridade */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                t.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                                t.priority === 'Média' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-200 text-slate-700'
                              }`}>
                                Prioridade {t.priority}
                              </span>

                              <span className="text-[10px] text-slate-400 font-semibold">
                                Semana {t.week_number}
                              </span>
                            </div>

                            {/* Data de Vencimento / Programada */}
                            {t.due_date && (
                              <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1 pt-0.5">
                                <Clock className="w-3.5 h-3.5" /> Programado para: {new Date(t.due_date).toLocaleDateString('pt-BR')}
                              </span>
                            )}

                            {/* Observação Interna */}
                            {t.notes && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                                💬 <strong>Nota:</strong> {t.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-slate-300 hover:text-rose-600 transition"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* DEMAIS ABAS PERMANECEM INTEGRADAS E FUNCIONANDO */}
        {activeTab === 'sintomas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSymptom} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-rose-500" /> Registrar Sintoma na Semana {selectedWeek}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeAuthor === 'mae' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  Autor: {activeAuthor === 'mae' ? '💖 Mãe' : '💙 Pai'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sintoma / Sensação</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Enjoo matinal, Azia, Cansaço..." 
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                  <select 
                    value={newSymptomCategory}
                    onChange={(e) => setNewSymptomCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                  >
                    <option value="Físico">Físico / Corporal</option>
                    <option value="Digestivo">Digestivo / Náusea</option>
                    <option value="Emocional">Emocional / Humor</option>
                    <option value="Sono">Sono / Disposição</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Intensidade (1 a 5)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="5"
                    value={newIntensity}
                    onChange={(e) => setNewIntensity(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm">
                Salvar no Diário da Semana {selectedWeek}
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Histórico de Sintomas do Casal</h3>
              {symptoms.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhum sintoma registrado ainda.</p>
              ) : (
                symptoms.map((s) => (
                  <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800 text-base">{s.symptom_name}</span>
                        <span className="text-xs text-slate-400 block">{s.log_date} • Semana {s.week_number}</span>
                      </div>
                      <button onClick={() => handleDeleteSymptom(s.id)} className="text-slate-400 hover:text-rose-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'consultas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddQuestion} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-rose-500" /> Cadastrar Dúvida para a Próxima Consulta
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-3">
                  <input 
                    type="text" 
                    placeholder="Digite a dúvida exata do casal para o obstetra..." 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <select 
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                  >
                    <option value="Alimentação">Alimentação / Chás</option>
                    <option value="Medicação">Medicação / Vitaminas</option>
                    <option value="Exames">Exames / Ultrassom</option>
                    <option value="Parto">Plano de Parto</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-sm transition">
                Anotar Dúvida para a Consulta
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Mural Estruturado de Perguntas & Conduta Médica</h3>
              {questions.map((q) => (
                <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">{q.category}</span>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-slate-400 hover:text-rose-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">• {q.questions_to_ask}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'metricas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddHealthMetric} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" /> Registrar Medição de Peso Corporal e Pressão Arterial
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" step="0.1" placeholder="Peso (kg)" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                <input type="number" placeholder="Sistólica" value={newSystolic} onChange={(e) => setNewSystolic(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                <input type="number" placeholder="Diastólica" value={newDiastolic} onChange={(e) => setNewDiastolic(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                Registrar Medições de Saúde
              </button>
            </form>
          </div>
        )}

        {activeTab === 'resumo' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Relatório Executivo para Consulta Obstétrica</h3>
                <p className="text-xs text-slate-500 mt-0.5">Relatório consolidado de acompanhamento semanal do casal</p>
              </div>
              <button onClick={() => window.print()} className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold hover:bg-slate-700 transition">
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}