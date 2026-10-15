import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AuthorBadge from '../AuthorBadge';
import { formatBR } from '../../lib/dates';
import type { PartnerComment, SymptomItem } from '../../types';

export interface NewSymptom {
  name: string;
  category: string;
  intensity: number;
  notes: string;
}

interface Props {
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  selectedWeek: number;
  currentWeek: number;
  busy: boolean;
  onCreate: (symptom: NewSymptom) => Promise<boolean>;
  onDelete: (symptom: SymptomItem) => void;
  onComment: (symptomId: string, text: string) => Promise<boolean>;
  onDeleteComment: (comment: PartnerComment) => void;
}

const CATEGORIES = ['Físico', 'Digestivo', 'Emocional', 'Sono'];
const INTENSITY_LABELS = ['Muito leve', 'Leve', 'Moderado', 'Forte', 'Muito forte'];

export default function SymptomsTab({ symptoms, comments, selectedWeek, currentWeek, busy, onCreate, onDelete, onComment, onDeleteComment }: Props) {
  const [filterMode, setFilterMode] = useState<'semana' | 'todas'>('semana');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Físico');
  const [intensity, setIntensity] = useState(2);
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const visible = filterMode === 'semana' ? symptoms.filter(s => s.week_number === selectedWeek) : symptoms;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await onCreate({ name: name.trim(), category, intensity, notes: notes.trim() });
    if (ok) {
      setName('');
      setNotes('');
      setIntensity(2);
    }
  };

  const sendComment = async (symptomId: string) => {
    const text = drafts[symptomId]?.trim();
    if (!text) return;
    if (await onComment(symptomId, text)) setDrafts(d => ({ ...d, [symptomId]: '' }));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-rose-500" /> Registrar sintoma de hoje
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input aria-label="Sintoma" type="text" placeholder="Sintoma (ex.: azia, enjoo)..." value={name} onChange={e => setName(e.target.value)} className="md:col-span-2 border rounded-xl px-3.5 py-2 text-sm" />
          <select aria-label="Categoria" value={category} onChange={e => setCategory(e.target.value)} className="border rounded-xl px-3.5 py-2 text-sm bg-white">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-slate-600">Intensidade: {intensity}/5 · {INTENSITY_LABELS[intensity - 1]}</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                aria-pressed={intensity === level}
                aria-label={`Intensidade ${level}: ${INTENSITY_LABELS[level - 1]}`}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${intensity === level ? 'bg-rose-500 text-white border-rose-500' : intensity > level ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-slate-500'}`}
              >
                {level}
              </button>
            ))}
          </div>
        </fieldset>
        <input aria-label="Observação" type="text" placeholder="Observação (opcional): quando começou, o que ajudou..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-xl px-3.5 py-2 text-sm" />
        <button type="submit" disabled={busy || !name.trim()} className="w-full bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm">
          Salvar no diário (semana {currentWeek})
        </button>
      </form>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-slate-800 text-sm uppercase">Diário do casal</h3>
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border">
            <button onClick={() => setFilterMode('semana')} aria-pressed={filterMode === 'semana'} className={`px-3 py-1 rounded-md text-xs font-bold ${filterMode === 'semana' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}>
              Semana {selectedWeek}
            </button>
            <button onClick={() => setFilterMode('todas')} aria-pressed={filterMode === 'todas'} className={`px-3 py-1 rounded-md text-xs font-bold ${filterMode === 'todas' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}>
              Tudo
            </button>
          </div>
        </div>

        {visible.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Nenhum registro {filterMode === 'semana' ? `na semana ${selectedWeek}` : 'ainda'}.</p>}

        {visible.map(s => (
          <div key={s.id} className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-base">{s.symptom_name}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200">{s.category}</span>
                  <AuthorBadge role={s.created_by} />
                </div>
                <span className="text-xs text-slate-500">{formatBR(s.log_date)} · semana {s.week_number}</span>
                {s.notes && <p className="text-sm text-slate-600">{s.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700">Nível {s.intensity}/5</span>
                <button onClick={() => onDelete(s)} aria-label={`Excluir registro "${s.symptom_name}"`} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {comments
              .filter(c => c.symptom_id === s.id)
              .map(c => (
                <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border flex justify-between items-start gap-2">
                  <span className="text-slate-700 flex flex-wrap items-center gap-1.5">
                    <AuthorBadge role={c.author_role} /> {c.comment_text}
                  </span>
                  <button onClick={() => onDeleteComment(c)} aria-label="Excluir comentário" className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            <form
              onSubmit={e => {
                e.preventDefault();
                sendComment(s.id);
              }}
              className="flex gap-2 pt-1"
            >
              <input
                aria-label={`Comentário de apoio em "${s.symptom_name}"`}
                type="text"
                placeholder="Adicionar apoio (ex.: dei o remédio às 22h)..."
                value={drafts[s.id] ?? ''}
                onChange={e => setDrafts(d => ({ ...d, [s.id]: e.target.value }))}
                className="flex-1 border rounded-lg px-3 py-1.5 text-xs bg-white"
              />
              <button type="submit" disabled={busy || !drafts[s.id]?.trim()} className="bg-indigo-600 disabled:opacity-50 text-white text-xs px-3 rounded-lg font-bold">
                Salvar
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
