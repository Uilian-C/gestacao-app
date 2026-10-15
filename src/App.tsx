import React, { useState, useEffect } from 'react';
import { 
  Heart, Stethoscope, FileText, Plus, Activity, Baby, Scale, 
  Loader2, MessageSquare, CheckSquare, Users, Calendar, 
  TrendingUp, HelpCircle, ShieldCheck
} from 'lucide-react';
import { sql } from './db';

// Dados de referência por semana e parâmetros da OMS
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
  assigned_to: string;
  is_completed: boolean;
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
  const [activeTab, setActiveTab] = useState<'sintomas' | 'consultas' | 'metricas' | 'tarefas' | 'resumo'>('sintomas');
  const [loading, setLoading] = useState<boolean>(false);

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
        SELECT id, week_number, task_title, assigned_to, is_completed 
        FROM partner_tasks 
        ORDER BY week_number ASC
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      <header className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 text-white p-6 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="fill-white w-6 h-6" /> Nossa Gestação
            </h1>
            <p className="text-white/90 text-xs mt-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 inline" /> Espaço Colaborativo do Casal & Registro Médico
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border border-white/20">
              <span className="text-[10px] uppercase font-bold text-white/70 px-2">Registrando como:</span>
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
              <label className="text-xs text-slate-500 font-semibold">Visualizar Semana:</label>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-lg shadow-sm">
                <Baby className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Tamanho Estimado</span>
                <span className="font-bold text-slate-800 text-base">{weekData.fruit}</span>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="p-3 bg-blue-500 text-white rounded-lg shadow-sm">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Comprimento Estimado</span>
                <span className="font-bold text-slate-800 text-base">{weekData.size}</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-lg shadow-sm">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Peso Aproximado</span>
                <span className="font-bold text-slate-800 text-base">{weekData.weight}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex bg-slate-200/70 p-1.5 rounded-xl gap-1 overflow-x-auto">
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
            onClick={() => setActiveTab('tarefas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'tarefas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <CheckSquare className="w-4 h-4" /> Tarefas do Casal
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
            <Loader2 className="w-4 h-4 animate-spin" /> Sincronizando dados no Neon.tech...
          </div>
        )}

        {activeTab === 'sintomas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSymptom} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-rose-500" /> Registrar Novo Sintoma ou Sensação
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
                Salvar no Diário do Casal
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Histórico de Sintomas com Transparência de Autoria</h3>
              
              {symptoms.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhum sintoma registrado ainda nesta gestação.</p>
              ) : (
                symptoms.map((s) => {
                  const symptomComments = comments.filter(c => c.symptom_id === s.id);
                  return (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-base">{s.symptom_name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                              {s.category}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.created_by === 'mae' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {s.created_by === 'mae' ? '💖 Anotado pela Mãe' : '💙 Anotado pelo Pai'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">{s.log_date} • Semana {s.week_number}</span>
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.intensity >= 4 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                          Intensidade {s.intensity}/5
                        </span>
                      </div>

                      {symptomComments.length > 0 && (
                        <div className="pl-3 border-l-2 border-indigo-400 space-y-1.5 pt-1">
                          {symptomComments.map(c => (
                            <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 text-slate-700">
                              <span className="font-bold text-indigo-600 uppercase text-[10px] block mb-0.5">
                                {c.author_role === 'pai' ? '💙 Nota do Pai:' : '💖 Nota da Mãe:'}
                              </span>
                              {c.comment_text}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeCommentInput === s.id ? (
                        <div className="flex gap-2 pt-2">
                          <input 
                            type="text" 
                            placeholder="Adicione um cuidado, medicação ministrada ou observação..." 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <button 
                            onClick={() => handleAddComment(s.id)}
                            className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition"
                          >
                            Salvar Nota
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveCommentInput(s.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 pt-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> + Adicionar Comentário de Apoio
                        </button>
                      )}
                    </div>
                  );
                })
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
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeAuthor === 'mae' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  Autor: {activeAuthor === 'mae' ? '💖 Mãe' : '💙 Pai'}
                </span>
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
              
              {questions.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhuma dúvida cadastrada até o momento.</p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                          {q.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${q.created_by === 'mae' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {q.created_by === 'mae' ? '💖 Perguntado pela Mãe' : '💙 Perguntado pelo Pai'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${q.doctor_answer ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                        {q.doctor_answer ? 'Respondido na Consulta' : 'Pendente de Resposta'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800 pt-1">
                      • {q.questions_to_ask}
                    </p>

                    {q.doctor_answer ? (
                      <div className="mt-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                        <span className="font-bold block uppercase text-[10px] text-emerald-700 mb-0.5 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Conduta do Médico / Orientação:
                        </span>
                        {q.doctor_answer}
                      </div>
                    ) : (
                      editingAnswerId === q.id ? (
                        <div className="pt-2 flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Anote a orientação exata passada pelo obstetra..." 
                            value={doctorAnswerText}
                            onChange={(e) => setDoctorAnswerText(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button 
                            onClick={() => handleSaveDoctorAnswer(q.id)}
                            className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition"
                          >
                            Salvar Conduta
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingAnswerId(q.id); setDoctorAnswerText(''); }}
                          className="text-xs text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Anotar Resposta do Médico Pós-Consulta
                        </button>
                      )
                    )}
                  </div>
                ))
              )}
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Peso Atual (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ex: 62.5" 
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pressão Sistólica (Máxima)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 120" 
                    value={newSystolic}
                    onChange={(e) => setNewSystolic(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pressão Diastólica (Mínima)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 80" 
                    value={newDiastolic}
                    onChange={(e) => setNewDiastolic(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                Registrar Medições de Saúde
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Acompanhamento Comparativo OMS (Ganho de Peso Esperado)</h3>
                <p className="text-xs text-slate-500">Faixa de ganho ponderal recomendado para a Semana {selectedWeek}: <strong>{weekData.omsWeightMin} kg a {weekData.omsWeightMax} kg</strong></p>
              </div>

              {healthMetrics.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhuma medição de peso ou pressão cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {healthMetrics.map((m) => (
                    <div key={m.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold text-sm text-slate-800">Semana {m.week_number} • {m.recorded_at}</span>
                        <span className="text-xs text-slate-500 block">Pressão Arterial: {m.systolic_bp}/{m.diastolic_bp} mmHg</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-800 text-base">{m.weight_kg} kg</span>
                        <span className="text-[10px] font-bold block text-emerald-600">Dentro da meta OMS</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tarefas' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <CheckSquare className="w-5 h-5 text-indigo-600" /> Tarefas & Logística do Casal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Checklist de vacinas do pai, enxoval e mala da maternidade</p>
            </div>

            <div className="space-y-2">
              {partnerTasks.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => handleToggleTask(t.id, t.is_completed)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${t.is_completed ? 'bg-emerald-50/50 border-emerald-200 opacity-80' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={t.is_completed}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-400"
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-semibold block ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {t.task_title}
                    </span>
                    <span className="text-xs text-slate-400 block">Semana {t.week_number}</span>
                  </div>
                </div>
              ))}
            </div>
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

            <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><span className="text-slate-500 block text-xs">Idade Gestacional:</span> <strong>{currentGestational.weeks} Semanas + {currentGestational.days}d</strong></div>
              <div><span className="text-slate-500 block text-xs">Trimestre:</span> <strong>{weekData.trimester}º Trimestre</strong></div>
              <div><span className="text-slate-500 block text-xs">DPP Prevista:</span> <strong>{currentGestational.dppFormatted}</strong></div>
            </div>

            <div>
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Sintomas Registrados Recentes</h4>
              <div className="space-y-1">
                {symptoms.map(s => (
                  <div key={s.id} className="text-sm py-1 border-b border-slate-100 flex justify-between">
                    <span>{s.symptom_name} ({s.category})</span>
                    <span className="text-slate-500 font-semibold">Intensidade: {s.intensity}/5</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Dúvidas do Casal e Orientação Médica</h4>
              <div className="space-y-2">
                {questions.map(q => (
                  <div key={q.id} className="text-sm p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-bold text-slate-800">• {q.questions_to_ask}</p>
                    {q.doctor_answer && (
                      <p className="text-xs text-emerald-800 mt-1 pl-3 border-l-2 border-emerald-500">
                        Orientação: {q.doctor_answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}