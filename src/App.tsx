import React, { useState } from 'react';
import { 
  Heart, Stethoscope, FileText, CheckCircle, 
  Plus, Activity, Baby, Scale
} from 'lucide-react';

// Dados de referência por semana
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

export default function App() {
  const [currentWeek, setCurrentWeek] = useState(4);
  const [activeTab, setActiveTab] = useState<'sintomas' | 'consultas' | 'exames' | 'resumo'>('sintomas');

  const [symptoms, setSymptoms] = useState([
    { id: '1', week: 4, date: '2026-10-15', name: 'Ligeiro cansaço', intensity: 2, note: 'Senti mais sono à tarde.' }
  ]);
  const [newSymptom, setNewSymptom] = useState('');
  const [newIntensity, setNewIntensity] = useState(2);

  const [questions, setQuestions] = useState([
    { id: '1', text: 'Quais os suplementos de ácido fólico recomendados?', answered: false }
  ]);
  const [newQuestion, setNewQuestion] = useState('');

  const weekData = GESTATION_WEEKS.find(w => w.week === currentWeek) || GESTATION_WEEKS[0];

  const handleAddSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymptom.trim()) return;
    setSymptoms([
      {
        id: Date.now().toString(),
        week: currentWeek,
        date: new Date().toISOString().split('T')[0],
        name: newSymptom,
        intensity: newIntensity,
        note: ''
      },
      ...symptoms
    ]);
    setNewSymptom('');
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setQuestions([...questions, { id: Date.now().toString(), text: newQuestion, answered: false }]);
    setNewQuestion('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <header className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-6 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="fill-white w-6 h-6" /> Nossa Gestação
            </h1>
            <p className="text-rose-100 text-sm mt-1">Acompanhamento do Casal & Conexão Médica</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-right">
            <span className="text-xs uppercase tracking-wider block font-medium">Semana Atual</span>
            <span className="text-2xl font-extrabold">{currentWeek}ª Semana</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
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

        <div className="flex bg-slate-200/60 p-1.5 rounded-xl gap-1">
          <button 
            onClick={() => setActiveTab('sintomas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'sintomas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Activity className="w-4 h-4" /> Sintomas
          </button>
          <button 
            onClick={() => setActiveTab('consultas')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'consultas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Stethoscope className="w-4 h-4" /> Consultas
          </button>
          <button 
            onClick={() => setActiveTab('exames')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'exames' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <CheckCircle className="w-4 h-4" /> Exames
          </button>
          <button 
            onClick={() => setActiveTab('resumo')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'resumo' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <FileText className="w-4 h-4" /> Resumo Médico
          </button>
        </div>

        {activeTab === 'sintomas' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSymptom} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registar Sintoma / Bem-estar</label>
                <input 
                  type="text" 
                  placeholder="Ex: Enjoo matinal, Cansaço, Sensibilidade..." 
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
              <button type="submit" className="w-full md:w-auto bg-rose-500 hover:bg-rose-600 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Registar
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Histórico de Sintomas</h3>
              {symptoms.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhum sintoma registrado nesta fase.</p>
              ) : (
                symptoms.map((s) => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{s.name}</span>
                      <span className="text-xs text-slate-400 block">{s.date} • Semana {s.week}</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">
                      Nível {s.intensity}/5
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'consultas' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-rose-500" /> Dúvidas para a Próxima Consulta
              </h3>
              <form onSubmit={handleAddQuestion} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Digite uma dúvida que surgiu durante a semana..." 
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                  Anotar
                </button>
              </form>

              <div className="space-y-2 pt-2">
                {questions.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      checked={q.answered}
                      onChange={() => setQuestions(questions.map(item => item.id === q.id ? {...item, answered: !item.answered} : item))}
                      className="w-4 h-4 text-rose-500 rounded focus:ring-rose-400"
                    />
                    <span className={`text-sm ${q.answered ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {q.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

        {activeTab === 'resumo' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Relatório Executivo para Consulta Obstétrica</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gerado automaticamente para apoio no atendimento clínico</p>
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
              <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-2">Sintomas Recentes Registados</h4>
              <div className="space-y-1">
                {symptoms.map(s => (
                  <div key={s.id} className="text-sm py-1 border-b border-slate-100 flex justify-between">
                    <span>{s.name}</span>
                    <span className="text-slate-500">Intensidade: {s.intensity}/5</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-2">Dúvidas do Casal para o Obstetra</h4>
              <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                {questions.map(q => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}