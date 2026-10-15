import { useState } from 'react';
import { BarChart2, CheckCircle2, Clock, Filter, Plus, Trash2 } from 'lucide-react';
import AuthorBadge from '../AuthorBadge';
import { formatBR, isOverdue, trimesterOf } from '../../lib/dates';
import type { Assignee, PartnerTask, Priority } from '../../types';

type AssigneeFilter = 'todos' | Assignee;
type PeriodFilter = 'semana' | 'tri1' | 'tri2' | 'tri3' | 'todas';
type StatusFilter = 'pendentes' | 'concluidas' | 'todas';

export interface NewTask {
  title: string;
  assignee: Assignee;
  priority: Priority;
  dueDate: string;
  notes: string;
}

interface Props {
  tasks: PartnerTask[];
  selectedWeek: number;
  busy: boolean;
  onCreate: (task: NewTask) => Promise<boolean>;
  onToggle: (task: PartnerTask) => void;
  onDelete: (task: PartnerTask) => void;
}

const PRIORITY_DOT: Record<Priority, string> = { Baixa: '🟢', Média: '🟡', Alta: '🔴' };

export default function TasksTab({ tasks, selectedWeek, busy, onCreate, onToggle, onDelete }: Props) {
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('semana');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pendentes');

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<Assignee>('casal');
  const [priority, setPriority] = useState<Priority>('Média');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const byAssignee = tasks.filter(t => assigneeFilter === 'todos' || t.assigned_to === assigneeFilter);
  const filtered = byAssignee.filter(t => {
    if (periodFilter === 'semana' && t.week_number !== selectedWeek) return false;
    if (periodFilter === 'tri1' && trimesterOf(t.week_number) !== 1) return false;
    if (periodFilter === 'tri2' && trimesterOf(t.week_number) !== 2) return false;
    if (periodFilter === 'tri3' && trimesterOf(t.week_number) !== 3) return false;
    if (statusFilter === 'pendentes' && t.is_completed) return false;
    if (statusFilter === 'concluidas' && !t.is_completed) return false;
    return true;
  });

  const total = byAssignee.length;
  const done = byAssignee.filter(t => t.is_completed).length;
  const overdue = byAssignee.filter(t => !t.is_completed && isOverdue(t.due_date)).length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await onCreate({ title: title.trim(), assignee, priority, dueDate, notes: notes.trim() });
    if (ok) {
      setTitle('');
      setNotes('');
      setDueDate('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" /> Painel de preparativos
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200" role="group" aria-label="Filtrar por responsável">
            {(['todos', 'mae', 'pai', 'casal'] as const).map(value => (
              <button
                key={value}
                onClick={() => setAssigneeFilter(value)}
                aria-pressed={assigneeFilter === value}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${assigneeFilter === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                {{ todos: '👥 Todos', mae: '💖 Mãe', pai: '💙 Pai', casal: '🤝 Casal' }[value]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Pendentes" value={total - done} className="bg-amber-50/60 border-amber-100 text-amber-800" />
          <Stat label="Atrasadas" value={overdue} className={overdue > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-700'} />
          <Stat label="Concluídas" value={done} className="bg-emerald-50/60 border-emerald-100 text-emerald-800" />
          <Stat label="Progresso" value={`${rate}%`} className="bg-indigo-50/60 border-indigo-100 text-indigo-800" />
        </div>
      </div>

      <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" /> Nova tarefa para a semana {selectedWeek}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input aria-label="Título da tarefa" type="text" placeholder="Título da tarefa..." value={title} onChange={e => setTitle(e.target.value)} className="md:col-span-2 border border-slate-200 rounded-xl px-3.5 py-2 text-sm" />
          <select aria-label="Responsável" value={assignee} onChange={e => setAssignee(e.target.value as Assignee)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold">
            <option value="mae">💖 Mãe</option>
            <option value="pai">💙 Pai</option>
            <option value="casal">🤝 Casal</option>
          </select>
          <select aria-label="Prioridade" value={priority} onChange={e => setPriority(e.target.value as Priority)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold">
            <option value="Baixa">🟢 Baixa</option>
            <option value="Média">🟡 Média</option>
            <option value="Alta">🔴 Alta</option>
          </select>
          <input aria-label="Prazo" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm" />
          <input aria-label="Observação" type="text" placeholder="Observação..." value={notes} onChange={e => setNotes(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm" />
        </div>
        <p className="text-[11px] text-slate-500">A tarefa fica na semana selecionada acima. Para planejar outra semana, troque a "semana visível".</p>
        <button type="submit" disabled={busy || !title.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
          Criar tarefa
        </button>
      </form>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" /> Lista de tarefas
          </h3>
          <div className="flex gap-2">
            <select aria-label="Período" value={periodFilter} onChange={e => setPeriodFilter(e.target.value as PeriodFilter)} className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-700">
              <option value="semana">Semana {selectedWeek}</option>
              <option value="tri1">1º trimestre</option>
              <option value="tri2">2º trimestre</option>
              <option value="tri3">3º trimestre</option>
              <option value="todas">Todas</option>
            </select>
            <select aria-label="Situação" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-700">
              <option value="pendentes">Pendentes</option>
              <option value="concluidas">Concluídas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            Nenhuma tarefa com esses filtros.{' '}
            {periodFilter === 'semana' && (
              <button onClick={() => setPeriodFilter('todas')} className="font-semibold text-indigo-600 underline underline-offset-2">Ver todas as semanas</button>
            )}
          </p>
        )}

        <div className="space-y-3">
          {filtered.map(t => {
            const late = !t.is_completed && isOverdue(t.due_date);
            return (
              <div key={t.id} className={`p-4 rounded-xl border transition-all ${t.is_completed ? 'bg-slate-50 opacity-75' : late ? 'bg-white border-rose-200 shadow-sm' : 'bg-white hover:border-indigo-300 shadow-sm'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggle(t)}
                      aria-label={t.is_completed ? `Reabrir "${t.task_title}"` : `Concluir "${t.task_title}"`}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600"
                    >
                      {t.is_completed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <div className="w-5 h-5 rounded-full border-2 hover:border-indigo-500" />}
                    </button>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {PRIORITY_DOT[t.priority] ?? ''} {t.task_title}
                        </span>
                        <AuthorBadge role={t.assigned_to} prefix="Resp.:" />
                        <span className="text-[11px] text-slate-500 font-semibold">Semana {t.week_number}</span>
                      </div>
                      {t.due_date && (
                        <span className={`text-xs font-semibold flex items-center gap-1 pt-0.5 ${late ? 'text-rose-600' : 'text-indigo-600'}`}>
                          <Clock className="w-3.5 h-3.5" /> {late ? 'Atrasada · prazo era' : 'Prazo:'} {formatBR(t.due_date)}
                        </span>
                      )}
                      {t.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border mt-2">💬 {t.notes}</p>}
                      <p className="text-[11px] text-slate-500">Criada por {t.created_by === 'pai' ? 'Pai' : 'Mãe'}</p>
                    </div>
                  </div>
                  <button onClick={() => onDelete(t)} aria-label={`Excluir "${t.task_title}"`} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number | string; className: string }) {
  return (
    <div className={`p-4 rounded-xl border ${className}`}>
      <span className="text-xs font-semibold block opacity-90">{label}</span>
      <span className="text-2xl font-extrabold">{value}</span>
    </div>
  );
}
