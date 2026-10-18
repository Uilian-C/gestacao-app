import { useContext, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, ListChecks, Plus, Sparkles } from 'lucide-react';
import { suggestionsFor, type TaskSuggestion } from '../../content/taskSuggestions';
import { formatBR, isOverdue, trimesterOf } from '../../lib/dates';
import type { Assignee, PartnerTask, Priority } from '../../types';
import WhoPicker, { WhoAvatars } from '../WhoPicker';
import { PeopleContext, whoName } from '../../lib/people';
import { inputClass } from '../styles';
import DayPicker from '../forms/DayPicker';
import { Button, Card, Chip, EmptyState, Field, Pill, Segmented, SectionTitle } from '../ui';

type AssigneeFilter = 'todos' | Assignee;
type PeriodFilter = 'semana' | 'tri1' | 'tri2' | 'tri3' | 'todas';
type StatusFilter = 'pendentes' | 'concluidas' | 'todas';

export interface NewTask {
  title: string;
  assignee: Assignee;
  priority: Priority;
  dueDate: string;
  notes: string;
  week?: number;
}

interface Props {
  tasks: PartnerTask[];
  selectedWeek: number;
  currentWeek: number;
  busy: boolean;
  onCreate: (task: NewTask) => Promise<boolean>;
  onToggle: (task: PartnerTask) => void;
  /** Abre os detalhes (com editar e excluir). */
  onOpen: (task: PartnerTask) => void;
}

const PRIORITY_TONE: Record<Priority, 'neutral' | 'warn' | 'alert'> = { Baixa: 'neutral', Média: 'warn', Alta: 'alert' };

export default function TasksTab({ tasks, selectedWeek, currentWeek, busy, onCreate, onToggle, onOpen }: Props) {
  const people = useContext(PeopleContext);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pendentes');
  const [formOpen, setFormOpen] = useState(false);

  const byAssignee = tasks.filter(t => assigneeFilter === 'todos' || t.assigned_to === assigneeFilter);
  const filtered = byAssignee
    .filter(t => {
      if (periodFilter === 'semana' && t.week_number !== selectedWeek) return false;
      if (periodFilter === 'tri1' && trimesterOf(t.week_number) !== 1) return false;
      if (periodFilter === 'tri2' && trimesterOf(t.week_number) !== 2) return false;
      if (periodFilter === 'tri3' && trimesterOf(t.week_number) !== 3) return false;
      if (statusFilter === 'pendentes' && t.is_completed) return false;
      if (statusFilter === 'concluidas' && !t.is_completed) return false;
      return true;
    })
    .sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || Number(isOverdue(b.due_date)) - Number(isOverdue(a.due_date)) || a.week_number - b.week_number);

  const total = byAssignee.length;
  const done = byAssignee.filter(t => t.is_completed).length;
  const overdue = byAssignee.filter(t => !t.is_completed && isOverdue(t.due_date)).length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  const suggestions = suggestionsFor(currentWeek, tasks.map(t => t.task_title));

  const addSuggestion = (s: TaskSuggestion) => onCreate({ title: s.title, assignee: s.assignee, priority: s.priority, dueDate: '', notes: s.notes ?? '', week: Math.max(s.week, currentWeek) });

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon={<ListChecks className="w-5 h-5" />}
          title="Preparativos do casal"
          action={
            <Segmented
              label="Responsável"
              size="sm"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'mae', label: whoName(people, 'mae') },
                { value: 'pai', label: whoName(people, 'pai') },
                { value: 'casal', label: 'Os dois' },
              ]}
            />
          }
        />
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">
              <strong className="text-ink tabular">{done}</strong> de <span className="tabular">{total}</span> concluídas
              {overdue > 0 && <span className="text-alert font-semibold"> · {overdue} {overdue === 1 ? 'atrasada' : 'atrasadas'}</span>}
            </span>
            <span className="font-semibold text-brand tabular">{rate}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label="Tarefas concluídas">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${rate}%` }} />
          </div>
        </div>
      </Card>

      {suggestions.length > 0 && (
        <Card tone="brand">
          <SectionTitle icon={<Sparkles className="w-5 h-5" />} title="Sugestões para esta fase" subtitle="Marcos comuns do pré-natal nesta altura. Toque para adicionar." />
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <Chip key={s.title} onClick={() => addSuggestion(s)}>
                <span className="inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />{s.title}</span>
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle
          title="Lista"
          action={
            <Button tone={formOpen ? 'ghost' : 'soft'} onClick={() => setFormOpen(v => !v)} className="!px-4 !py-2">
              {formOpen ? 'Fechar' : <><Plus className="w-4 h-4" /> Nova tarefa</>}
            </Button>
          }
        />
        {formOpen && <TaskForm selectedWeek={selectedWeek} busy={busy} onCreate={async t => { const ok = await onCreate(t); if (ok) setFormOpen(false); return ok; }} />}

        <div className="flex flex-wrap gap-2 mb-4">
          <select aria-label="Período" value={periodFilter} onChange={e => setPeriodFilter(e.target.value as PeriodFilter)} className={`${inputClass} !w-auto !py-1.5 text-sm`}>
            <option value="todas">Todas as semanas</option>
            <option value="semana">Semana {selectedWeek}</option>
            <option value="tri1">1º trimestre</option>
            <option value="tri2">2º trimestre</option>
            <option value="tri3">3º trimestre</option>
          </select>
          <Segmented
            label="Situação"
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'pendentes', label: 'Pendentes' },
              { value: 'concluidas', label: 'Concluídas' },
              { value: 'todas', label: 'Todas' },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<ListChecks />} title="Nada por aqui">Nenhuma tarefa com esses filtros.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map(t => {
              const late = !t.is_completed && isOverdue(t.due_date);
              return (
                <li key={t.id} className={`rounded-2xl border p-4 flex items-start gap-3 transition ${t.is_completed ? 'border-line bg-surface-2/60' : late ? 'border-alert/40 bg-canvas' : 'border-transparent bg-surface-2/60'}`}>
                  <button onClick={() => onToggle(t)} aria-label={t.is_completed ? `Reabrir "${t.task_title}"` : `Concluir "${t.task_title}"`} className="mt-0.5 shrink-0">
                    {t.is_completed ? <CheckCircle2 className="w-6 h-6 text-ok" /> : <span className="block w-6 h-6 rounded-full border-2 border-ink-mute hover:border-brand" />}
                  </button>
                  <button type="button" onClick={() => onOpen(t)} className="flex-1 min-w-0 space-y-1.5 text-left" aria-label={`${t.task_title}: ver detalhes`}>
                    <p className={`font-semibold ${t.is_completed ? 'line-through text-ink-mute' : 'text-ink'}`}>{t.task_title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
                        <WhoAvatars who={t.assigned_to} className="w-5 h-5 text-[9px]" /> {whoName(people, t.assigned_to)}
                      </span>
                      <Pill tone={PRIORITY_TONE[t.priority] ?? 'neutral'}>{t.priority}</Pill>
                      {t.due_date && (
                        <span className={`flex items-center gap-1 font-semibold ${late ? 'text-alert' : ''}`}>
                          <Clock className="w-3.5 h-3.5" /> {late ? 'atrasada desde' : 'até'} {formatBR(t.due_date)}
                        </span>
                      )}
                    </div>
                    {t.notes && <p className="text-sm text-ink-soft line-clamp-1">{t.notes}</p>}
                  </button>
                  <ChevronRight className="w-4 h-4 text-ink-mute shrink-0 self-center" />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function TaskForm({ selectedWeek: _selectedWeek, busy, onCreate, initialDueDate, onCancel, initial }: { selectedWeek: number; busy: boolean; onCreate: (t: NewTask) => Promise<boolean>; initialDueDate?: string; onCancel?: () => void; initial?: PartnerTask }) {
  void _selectedWeek;
  const [title, setTitle] = useState(initial?.task_title ?? '');
  const [assignee, setAssignee] = useState<Assignee>(initial?.assigned_to ?? 'casal');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'Média');
  const [dueDate, setDueDate] = useState(initial?.due_date?.slice(0, 10) ?? initialDueDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [more, setMore] = useState(!!initial?.notes || initial?.priority === 'Alta');
  return (
    <form
      className="rounded-2xl bg-surface-2/60 p-4 space-y-4 mb-5"
      onSubmit={async e => {
        e.preventDefault();
        if (title.trim()) await onCreate({ title: title.trim(), assignee, priority, dueDate, notes: notes.trim() });
      }}
    >
      <Field label="Tarefa" htmlFor="titulo-tarefa">
        <input id="titulo-tarefa" autoFocus={!initial} className={`${inputClass} text-[1.05rem]`} placeholder="Ex.: Comprar o carrinho" value={title} onChange={e => setTitle(e.target.value)} maxLength={300} />
      </Field>
      <div className="space-y-1.5">
        <span className="text-sm font-semibold text-ink-soft block">Quem cuida</span>
        <WhoPicker label="Responsável" value={assignee} onChange={setAssignee} />
      </div>
      <DayPicker mode="due" label="Prazo" value={dueDate} onChange={setDueDate} />
      {more ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-ink-soft block">Prioridade</span>
            <Segmented label="Prioridade" size="sm" value={priority} onChange={setPriority} options={[{ value: 'Baixa', label: 'Baixa' }, { value: 'Média', label: 'Média' }, { value: 'Alta', label: 'Alta' }]} />
          </div>
          <Field label="Observação (opcional)" htmlFor="obs-tarefa">
            <input id="obs-tarefa" className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-strong">
          <Plus className="w-4 h-4" /> Prioridade e observação
        </button>
      )}
      <div className="flex gap-2">
        {onCancel && <Button tone="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={busy || !title.trim()} className="flex-1">{initial ? 'Salvar alterações' : 'Criar tarefa'}</Button>
      </div>
    </form>
  );
}
