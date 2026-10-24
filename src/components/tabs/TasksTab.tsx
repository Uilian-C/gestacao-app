import { useContext, useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, ChevronRight, Clock, Plus, Sparkles } from 'lucide-react';
import { suggestionsFor, type TaskSuggestion } from '../../content/taskSuggestions';
import { formatBR, isOverdue, parseLocalDate, toISODate } from '../../lib/dates';
import type { Assignee, PartnerTask, Priority } from '../../types';
import WhoPicker, { WhoAvatars } from '../WhoPicker';
import { PeopleContext, TaskRemindersReady, TimedRemindersReady, whoName } from '../../lib/people';
import { reminderAt, reminderTime } from '../../lib/reminders';
import ReminderPicker from '../forms/ReminderPicker';
import { inputClass } from '../styles';
import DayPicker from '../forms/DayPicker';
import { Button, Chip, Field, Pill, Segmented } from '../ui';

type AssigneeFilter = 'todos' | Assignee;

export interface NewTask {
  title: string;
  assignee: Assignee;
  priority: Priority;
  dueDate: string;
  notes: string;
  week?: number;
  /** Dia do lembrete ('' sem lembrete); undefined quando o app ainda não pergunta. */
  remindOn?: string;
  /** Dia e hora do lembrete (ISO); undefined quando o app ainda não pergunta a hora. */
  remindAt?: string | null;
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
  const [formOpen, setFormOpen] = useState(false);
  const [ideas, setIdeas] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const byAssignee = tasks.filter(t => assigneeFilter === 'todos' || t.assigned_to === assigneeFilter);
  const pending = byAssignee.filter(t => !t.is_completed).sort((a, b) => Number(isOverdue(b.due_date)) - Number(isOverdue(a.due_date)) || (a.due_date ?? '9').localeCompare(b.due_date ?? '9') || a.week_number - b.week_number);
  const completed = byAssignee.filter(t => t.is_completed);
  const total = byAssignee.length;
  const overdue = pending.filter(t => isOverdue(t.due_date)).length;
  const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const suggestions = suggestionsFor(currentWeek, tasks.map(t => t.task_title));

  const addSuggestion = (s: TaskSuggestion) => onCreate({ title: s.title, assignee: s.assignee, priority: s.priority, dueDate: '', notes: s.notes ?? '', week: Math.max(s.week, currentWeek) });

  return (
    <div className="space-y-4">
      {/* De quem e quanto já foi: uma linha e a barra fina. */}
      <div className="space-y-3">
        <Segmented
          label="Responsável"
          size="sm"
          full
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'mae', label: whoName(people, 'mae') },
            { value: 'pai', label: whoName(people, 'pai') },
            { value: 'casal', label: 'Os dois' },
          ]}
        />
        {total > 0 && (
          <div className="px-1 space-y-1.5">
            <p className="text-[13px] text-ink-soft">
              <strong className="text-ink tabular">{completed.length}</strong> de <span className="tabular">{total}</span> concluídas
              {overdue > 0 && <span className="text-alert font-semibold"> · {overdue} {overdue === 1 ? 'atrasada' : 'atrasadas'}</span>}
            </p>
            <div className="h-1 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label="Tarefas concluídas">
              <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${rate}%` }} />
            </div>
          </div>
        )}
      </div>

      {formOpen ? (
        <TaskForm selectedWeek={selectedWeek} busy={busy} onCancel={() => setFormOpen(false)} onCreate={async t => { const ok = await onCreate(t); if (ok) setFormOpen(false); return ok; }} />
      ) : (
        <Button tone="soft" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Nova tarefa
        </Button>
      )}

      {pending.length === 0 ? (
        <p className="px-1 text-[14px] text-ink-soft">{total ? 'Nada pendente por aqui. 💛' : 'Dividam os preparativos: cada tarefa tem quem cuida e, se quiserem, prazo e lembrete.'}</p>
      ) : (
        <ul aria-label="Tarefas pendentes" className="rounded-[24px] bg-surface/80 divide-y divide-line/60">
          {pending.map(t => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </ul>
      )}

      {/* O resto, recolhido: as ideias da fase e o que já foi feito. */}
      <div className="rounded-[24px] bg-surface/80 divide-y divide-line/60">
        {suggestions.length > 0 && (
          <div>
            <button type="button" onClick={() => setIdeas(v => !v)} aria-expanded={ideas} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <Sparkles className="w-5 h-5 text-azul-strong shrink-0" />
              <span className="flex-1 font-semibold text-ink">Ideias para esta fase ({suggestions.length})</span>
              <ChevronDown className={`w-4 h-4 text-ink-mute transition-transform ${ideas ? 'rotate-180' : ''}`} />
            </button>
            {ideas && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-[13px] text-ink-soft">Marcos comuns do pré-natal nesta altura. Toque para virar tarefa.</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <Chip key={s.title} onClick={() => addSuggestion(s)}>
                      <span className="inline-flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        {s.title}
                      </span>
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {completed.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowDone(v => !v)} aria-expanded={showDone} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
              <span className="flex-1 font-semibold text-ink">Concluídas ({completed.length})</span>
              <ChevronDown className={`w-4 h-4 text-ink-mute transition-transform ${showDone ? 'rotate-180' : ''}`} />
            </button>
            {showDone && (
              <ul aria-label="Tarefas concluídas" className="divide-y divide-line/60 border-t border-line/60">
                {completed.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Uma tarefa numa linha: concluir à esquerda, o resto abre os detalhes. */
function TaskRow({ task: t, onToggle, onOpen }: { task: PartnerTask; onToggle: (t: PartnerTask) => void; onOpen: (t: PartnerTask) => void }) {
  const people = useContext(PeopleContext);
  const late = !t.is_completed && isOverdue(t.due_date);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button onClick={() => onToggle(t)} aria-label={t.is_completed ? `Reabrir "${t.task_title}"` : `Concluir "${t.task_title}"`} className="mt-0.5 shrink-0">
        {t.is_completed ? <CheckCircle2 className="w-6 h-6 text-ok" /> : <span className={`block w-6 h-6 rounded-full border-2 ${late ? 'border-alert' : 'border-ink-mute'} hover:border-azul`} />}
      </button>
      <button type="button" onClick={() => onOpen(t)} className="flex-1 min-w-0 text-left" aria-label={`${t.task_title}: ver detalhes`}>
        <span className={`block font-semibold leading-snug ${t.is_completed ? 'line-through text-ink-mute' : 'text-ink'}`}>{t.task_title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-mute">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
            <WhoAvatars who={t.assigned_to} className="w-5 h-5 text-[9px]" /> {whoName(people, t.assigned_to)}
          </span>
          {t.priority === 'Alta' && !t.is_completed && <Pill tone={PRIORITY_TONE.Alta}>Alta</Pill>}
          {t.due_date && !t.is_completed && (
            <span className={`flex items-center gap-1 font-semibold ${late ? 'text-alert' : ''}`}>
              <Clock className="w-3.5 h-3.5" /> {late ? 'atrasada desde' : 'até'} {formatBR(t.due_date)}
            </span>
          )}
          {t.remind_on && !t.is_completed && t.remind_on.slice(0, 10) >= toISODate(new Date()) && (
            <span className="flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" /> {formatBR(t.remind_on)}
            </span>
          )}
        </span>
      </button>
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0 self-center" />
    </li>
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
  // Lembrete (migração 017): o celular avisa quem cuida, às 8h do dia escolhido.
  const reminders = useContext(TaskRemindersReady);
  const people = useContext(PeopleContext);
  const [remindOn, setRemindOn] = useState(initial?.remind_on?.slice(0, 10) ?? '');
  const withTime = useContext(TimedRemindersReady);
  const [remindTime, setRemindTime] = useState(reminderTime(initial?.remind_at));
  const today = toISODate(new Date());
  const shift = (iso: string, n: number) => {
    const d = parseLocalDate(iso);
    return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
  };
  const dayBefore = (iso: string) => shift(iso, -1);
  const tomorrow = shift(today, 1);
  const reminderChoices = [
    { iso: '', text: 'Sem lembrete' },
    ...(dueDate && dayBefore(dueDate) >= today ? [{ iso: dayBefore(dueDate), text: 'Na véspera' }] : []),
    ...(dueDate && dueDate >= today ? [{ iso: dueDate, text: 'No dia do prazo' }] : []),
  ];
  if (!reminderChoices.some(c => c.iso === tomorrow)) reminderChoices.push({ iso: tomorrow, text: 'Amanhã' });
  return (
    <form
      className="rounded-[24px] bg-surface/80 p-4 space-y-4"
      onSubmit={async e => {
        e.preventDefault();
        if (title.trim()) await onCreate({ title: title.trim(), assignee, priority, dueDate, notes: notes.trim(), remindOn: reminders ? remindOn : undefined, remindAt: reminders && withTime ? (remindOn ? reminderAt(remindOn, remindTime) : null) : undefined });
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
      {reminders && (
        <ReminderPicker day={remindOn} time={remindTime} onDay={setRemindOn} onTime={setRemindTime} choices={reminderChoices} withTime={withTime} who={assignee === 'casal' ? 'vocês dois' : whoName(people, assignee)} />
      )}
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
