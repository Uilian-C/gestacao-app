import { useState } from 'react';
import { ShieldCheck, Stethoscope, Trash2 } from 'lucide-react';
import AuthorBadge from '../AuthorBadge';
import { formatBR } from '../../lib/dates';
import type { QuestionItem } from '../../types';

interface Props {
  questions: QuestionItem[];
  busy: boolean;
  onCreate: (text: string, category: string) => Promise<boolean>;
  onAnswer: (questionId: string, answer: string) => Promise<boolean>;
  onDelete: (question: QuestionItem) => void;
}

const CATEGORIES = ['Alimentação', 'Medicação', 'Exames', 'Parto', 'Geral'];

export default function QuestionsTab({ questions, busy, onCreate, onAnswer, onDelete }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Geral');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const pending = questions.filter(q => !q.doctor_answer);
  const answered = questions.filter(q => q.doctor_answer);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await onCreate(text.trim(), category)) setText('');
  };

  const saveAnswer = async (id: string) => {
    const answer = answers[id]?.trim();
    if (!answer) return;
    if (await onAnswer(id, answer)) setAnswers(a => ({ ...a, [id]: '' }));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
        <h3 className="font-bold text-sm uppercase flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-rose-500" /> Anotar dúvida para a próxima consulta
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input aria-label="Dúvida" type="text" placeholder="Dúvida..." value={text} onChange={e => setText(e.target.value)} className="md:col-span-3 border rounded-xl px-4 py-2 text-sm" />
          <select aria-label="Categoria" value={category} onChange={e => setCategory(e.target.value)} className="border rounded-xl px-3.5 py-2 text-sm bg-white">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button type="submit" disabled={busy || !text.trim()} className="w-full bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm">
          Anotar dúvida
        </button>
      </form>

      <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
        <h3 className="font-bold text-sm uppercase">Para perguntar ({pending.length})</h3>
        {pending.length === 0 && <p className="text-sm text-slate-500 py-2">Nenhuma dúvida pendente.</p>}
        {pending.map(q => (
          <div key={q.id} className="p-4 bg-slate-50 rounded-xl border space-y-2">
            <QuestionHeader q={q} onDelete={onDelete} />
            <p className="text-sm font-semibold">{q.questions_to_ask}</p>
            <form
              onSubmit={e => {
                e.preventDefault();
                saveAnswer(q.id);
              }}
              className="pt-2 flex gap-2"
            >
              <input
                aria-label={`Resposta do obstetra para "${q.questions_to_ask}"`}
                type="text"
                placeholder="O que o obstetra respondeu..."
                value={answers[q.id] ?? ''}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                className="flex-1 border rounded-lg px-3 py-1.5 text-xs bg-white"
              />
              <button type="submit" disabled={busy || !answers[q.id]?.trim()} className="bg-emerald-600 disabled:opacity-50 text-white text-xs px-3 rounded-lg font-bold">
                Salvar resposta
              </button>
            </form>
          </div>
        ))}
      </div>

      {answered.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
          <h3 className="font-bold text-sm uppercase">Respondidas ({answered.length})</h3>
          {answered.map(q => (
            <div key={q.id} className="p-4 bg-slate-50 rounded-xl border space-y-2">
              <QuestionHeader q={q} onDelete={onDelete} />
              <p className="text-sm font-semibold">{q.questions_to_ask}</p>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-sm space-y-1">
                <span className="font-bold uppercase text-[11px] text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Conduta do obstetra
                </span>
                <p>{q.doctor_answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionHeader({ q, onDelete }: { q: QuestionItem; onDelete: (q: QuestionItem) => void }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200 rounded-md">{q.category}</span>
        <AuthorBadge role={q.created_by} prefix="Por" />
        <span className="text-[11px] text-slate-500">{formatBR(q.created_at)}</span>
      </div>
      <button onClick={() => onDelete(q)} aria-label="Excluir dúvida" className="text-slate-400 hover:text-rose-600">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
