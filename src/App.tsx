import React, { useState, useEffect } from 'react';
import { 
  Heart, Stethoscope, FileText, CheckCircle, 
  Plus, Activity, Baby, Scale, Loader2, MessageSquare, CheckSquare, Users
} from 'lucide-react';
import { sql } from './db';

const GESTATION_WEEKS = Array.from({ length: 37 }, (_, i) => {
  const week = i + 4;
  let fruit = "Semente de Papoila";
  let size = "1-2 mm";
  let weight = "< 1g";
  let trimester = 1;

  if (week >= 5 && week <= 7) { fruit = "Grão de Arroz"; size = "5-10 mm"; weight = "< 1g"; }
  else if (week >= 8 && week <= 10) { fruit = "Azeitona / Uva"; size = "1.6 - 3.1 cm"; weight = "1 - 4g"; }
  else if (week >= 11 && week <= 13) { fruit = "Figo / Lima"; size = "4.1 - 7.4 cm"; weight = "7 - 23g"; }
  else if (week >= 14 && week <= 17) { fruit = "Maçã / Abacate"; size = "8.7 - 13 cm"; weight = "43 - 140g"; trimester = 2; }
  else if (week >= 18 && week <= 22) { fruit = "Manga / Banana"; size = "14.2 - 27.8 cm"; weight = "190 - 430g"; trimester = 2; }
  else if (week >= 23 && week <= 27) { fruit = "Berinjela / Couve-Flor"; size = "28.9 - 36.6 cm"; weight = "500 - 875g"; trimester = 2; }
  else if (week >= 28 && week <= 32) { fruit = "Melão / Coco"; size = "37.6 - 42.4 cm"; weight = "1g - 1.7kg"; trimester = 3; }
  else if (week >= 33) { fruit = "Melancia"; size = "43.7 - 50.7 cm"; weight = "1.9kg - 3.3kg"; trimester = 3; }

  return { week, fruit, size, weight, trimester };
});

interface SymptomItem {
  id: string;
  week_number: number;
  log_date: string;
  symptom_name: string;
  intensity: number;
  notes?: string;
}

interface QuestionItem {
  id: string;
  questions_to_ask: string;
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

export default function App() {
  const [currentWeek, setCurrentWeek] = useState(4);
  const [activeTab, setActiveTab] = useState<'sintomas' | 'consultas' | 'exames' | 'tarefas' | 'resumo'>('sintomas');
  const [loading, setLoading] = useState(false);

  // Estados locais
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [newIntensity, setNewIntensity] = useState(2);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [newQuestion, setNewQuestion] = useState('');

  const [partnerTasks, setPartnerTasks] = useState<PartnerTask[]>([]);
  const [comments, setComments] = useState<PartnerComment[]>([]);
  const [activeCommentInput, setActiveCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const weekData = GESTATION_WEEKS.find(w => w.week === currentWeek) || GESTATION_WEEKS[0];

  const loadData = async () => {
    try {
      setLoading(true);
      const symptomsData = await sql`
        SELECT id, week_number, log_date::text, symptom_name, intensity, notes 
        FROM symptoms_log 
        ORDER BY created_at DESC
      `;
      setSymptoms(symptomsData as SymptomItem[]);

      const questionsData = await sql`
        SELECT id, questions_to_ask, status 
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
        INSERT INTO symptoms_log (week_number, symptom_name, intensity) 
        VALUES (${currentWeek}, ${newSymptom}, ${newIntensity})
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
        INSERT INTO medical_appointments (week_number, appointment_date, questions_to_ask) 
        VALUES (${currentWeek}, NOW(), ${newQuestion})
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
        VALUES (${symptomId}, 'casal', ${commentText})
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* Header Unificado do Casal */}
      <header className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 text-white p-6 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="fill-white w-6 h-6" /> Nossa Gestação
            </h1>
            <p className="text-white/90 text-sm mt-1 flex items-center gap-1">
              <Users className="w-4 h-4 inline" /> Espaço Compartilhado do Casal
            </p>
          </div>

          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-right border border-white/20">
            <span className="text-[10px] uppercase tracking-wider block font-medium text-white/80">Semana Atual</span>
            <span className="text-2xl font-extrabold">{currentWeek}ª Semana</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Card do Bebé */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full">
                {weekData.trimester}º Trimestre
              </span>
              <h2 className="text-xl font-bold mt-2">Desenvolvimento da Semana {currentWeek}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 font-medium">Mudar Semana:</label>
              <select 
                value={currentWeek} 
                onChange={(e) => setCurrentWeek(Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {GESTATION_WEEKS.map(w => (
                  <option key={w.week} value={w.week}>Semana {w.week}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-lg">
                <Baby className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Tamanho Estimado</span>
                <span className="font-bold text-slate-800">{weekData.fruit}</span>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="p-3 bg-blue-500 text-white rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Comprimento</span>
                <span className="font-bold text-slate-800">{weekData.size}</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-lg">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Peso Aproximado</span>
                <span className="font-bold text-slate-800">{weekData.weight}</span>
              </div>
            </div>
          </div>
        </section>

        {/* NAVEGAÇÃO DE ABAS UNIFICADAS */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-xl gap-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('sintomas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'sintomas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Activity className="w-4 h-4" /> Diário & Sintomas
          </button>
          <button 
            onClick={() => setActiveTab('consultas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'consultas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Stethoscope className="w-4 h-4" /> Dúvidas do Casal
          </button>
          <button 
            onClick={() => setActiveTab('exames')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'exames' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <CheckCircle className="w-4 h-4" /> Exames & Vacinas
          </button>
          <button 
            onClick={() => setActiveTab('tarefas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'tarefas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <CheckSquare className="w-4 h-4" /> Tarefas do Casal
          </button>
          <button 
            onClick={() => setActiveTab('resumo')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'resumo' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <FileText className="w-4 h-4" /> Resumo Médico
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-rose-600 font-semibold py-1">
            <Loader2 className="w-4 h-4 animate-spin" /> Atualizando dados no Neon.tech...
          </div>
        )}

        {/* ABA DIÁRIO & SINTOMAS COM NOTAS COMPARTILHADAS */}
        {activeTab === 'sintomas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSymptom} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registrar Sintoma / Sensação do Dia</label>
                <input 
                  type="text" 
                  placeholder="Ex: Enjoo matinal, Sensibilidade, Sonolência..." 
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div className="w-full md:w-36">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Intensidade (1 a 5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5"
                  value={newIntensity}
                  onChange={(e) => setNewIntensity(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full md:w-auto bg-rose-500 hover:bg-rose-600 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Registrar
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Histórico do Diário Compartilhado</h3>
              {symptoms.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhum registro no diário ainda.</p>
              ) : (
                symptoms.map((s) => {
                  const symptomComments = comments.filter(c => c.symptom_id === s.id);
                  return (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800 text-sm">{s.symptom_name}</span>
                          <span className="text-xs text-slate-400 block">{s.log_date} • Semana {s.week_number}</span>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">
                          Nível {s.intensity}/5
                        </span>
                      </div>

                      {/* Lista de Notas de Suporte e Ações do Casal */}
                      {symptomComments.length > 0 && (
                        <div className="pl-3 border-l-2 border-indigo-400 space-y-1.5 pt-1">
                          {symptomComments.map(c => (
                            <div key={c.id} className="text-xs bg-white p-2 rounded-lg border border-slate-100 text-slate-700">
                              <span className="font-semibold text-indigo-600 uppercase text-[10px] block mb-0.5">
                                💬 Nota do Casal:
                              </span>
                              {c.comment_text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botão de Adicionar Nota de Apoio */}
                      {activeCommentInput === s.id ? (
                        <div className="flex gap-2 pt-2">
                          <input 
                            type="text" 
                            placeholder="Adicione um cuidado, chá preparado ou observação..." 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <button 
                            onClick={() => handleAddComment(s.id)}
                            className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg font-medium hover:bg-indigo-700 transition"
                          >
                            Salvar
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveCommentInput(s.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 pt-1"
                        >
                          <MessageSquare className="w-3 h-3" /> + Adicionar Nota / Ação de Cuidado
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ABA DÚVIDAS DO CASAL PARA A CONSULTA */}
        {activeTab === 'consultas' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-rose-500" /> Dúvidas do Casal para a Próxima Consulta
              </h3>
              <form onSubmit={handleAddQuestion} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Digite uma dúvida de vocês para o obstetra..." 
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <button type="submit" disabled={loading} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                  Anotar Dúvida
                </button>
              </form>

              <div className="space-y-2 pt-2">
                {questions.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm text-slate-700">• {q.questions_to_ask}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA EXAMES */}
        {activeTab === 'exames' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800">Checklist de Exames Recomendados</h3>
            <div className="space-y-2">
              {[
                { name: 'Beta HCG Quantitativo (Sangue)', week: '4ª - 6ª Semana', done: true },
                { name: 'Ultrassom Transvaginal Inicial', week: '7ª - 8ª Semana', done: false },
                { name: 'Sexagem Fetal (Opcional)', week: '8ª Semana+', done: false },
                { name: 'Ultrassom Morfológico do 1º Trimestre', week: '11ª - 13ª Semana', done: false }
              ].map((exam, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="font-semibold text-sm text-slate-800">{exam.name}</span>
                    <span className="text-xs text-slate-500 block">Janela ideal: {exam.week}</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${exam.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {exam.done ? 'Realizado' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA TAREFAS & PREPARATIVOS DO CASAL */}
        {activeTab === 'tarefas' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <CheckSquare className="w-5 h-5 text-indigo-600" /> Tarefas & Preparativos do Casal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Logística de vacinas, enxoval, consultas e mala da maternidade</p>
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

        {/* ABA RESUMO MÉDICO */}
        {activeTab === 'resumo' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Relatório Executivo para Consulta Obstétrica</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gerado automaticamente a partir dos registros do casal</p>
              </div>
              <button onClick={() => window.print()} className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg font-medium hover:bg-slate-700 transition">
                Imprimir / Salvar PDF
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
              <div><span className="text-slate-500 block text-xs">Idade Gestacional:</span> <strong>{currentWeek} Semanas</strong></div>
              <div><span className="text-slate-500 block text-xs">Trimestre:</span> <strong>{weekData.trimester}º Trimestre</strong></div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-2">Sintomas Recentes Registrados</h4>
              <div className="space-y-1">
                {symptoms.map(s => (
                  <div key={s.id} className="text-sm py-1 border-b border-slate-100 flex justify-between">
                    <span>{s.symptom_name}</span>
                    <span className="text-slate-500">Intensidade: {s.intensity}/5</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-2">Dúvidas para o Obstetra</h4>
              <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                {questions.map(q => (
                  <li key={q.id}>{q.questions_to_ask}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}