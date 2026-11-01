import { useContext, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, ChevronDown, Plus, Sparkles } from 'lucide-react';
import { ProgressHeart, RestDoodle } from '../agenda/Doodles';
import { suggestionsFor, type TaskSuggestion } from '../../content/taskSuggestions';
import { formatBR, parseLocalDate, toISODate } from '../../lib/dates';
import type { Assignee, PartnerTask, Priority } from '../../types';
import WhoPicker, { WhoAvatars } from '../WhoPicker';
import { PeopleContext, TaskRemindersReady, TimedRemindersReady, whoName } from '../../lib/people';
import { reminderAt, reminderTime } from '../../lib/reminders';
import ReminderPicker from '../forms/ReminderPicker';
import { inputClass } from '../styles';
import DayPicker from '../forms/DayPicker';
import { Button, Chip, Field, Segmented } from '../ui';

type AssigneeFilter = 'todos' | 'mae' | 'pai';

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


// Os grupos por quando, como numa lista de afazeres: o que passou do prazo
// primeiro, depois hoje, amanhã, a semana, o que vem depois e o que não tem data.
type GroupId = 'atrasadas' | 'hoje' | 'amanha' | 'semana' | 'depois' | 'sem-data';
const GROUPS: Array<{ id: GroupId; title: string; tone: string }> = [
  { id: 'atrasadas', title: 'Atrasadas', tone: 'text-alert' },
  { id: 'hoje', title: 'Hoje', tone: 'text-verde-strong' },
  { id: 'amanha', title: 'Amanhã', tone: 'text-lilas-strong' },
  { id: 'semana', title: 'Nos próximos dias', tone: 'text-azul-strong' },
  { id: 'depois', title: 'Mais para frente', tone: 'text-ink-soft' },
  { id: 'sem-data', title: 'Sem data', tone: 'text-ink-soft' },
];

const addDays = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

function groupOf(t: PartnerTask, today: string): GroupId {
  const due = t.due_date?.slice(0, 10);
  if (!due) return 'sem-data';
  if (due < today) return 'atrasadas';
  if (due === today) return 'hoje';
  if (due === addDays(today, 1)) return 'amanha';
  return due <= addDays(today, 7) ? 'semana' : 'depois';
}

export default function TasksTab({ tasks, currentWeek, onCreate, onToggle, onOpen }: Props) {
  const people = useContext(PeopleContext);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('todos');
  const couple = people.some(m => m.role === 'mae') && people.some(m => m.role === 'pai');
  const [ideas, setIdeas] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const today = toISODate(new Date());

  // Cada pessoa vê as dela e as dos dois ("Os dois" sozinho seria repetir o "Todos").
  const byAssignee = tasks.filter(t => assigneeFilter === 'todos' || t.assigned_to === assigneeFilter || t.assigned_to === 'casal');
  const pending = byAssignee.filter(t => !t.is_completed).sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const completed = byAssignee.filter(t => t.is_completed);
  const total = byAssignee.length;
  const overdue = pending.filter(t => groupOf(t, today) === 'atrasadas').length;
  const suggestions = suggestionsFor(currentWeek, tasks.map(t => t.task_title));
  const groups = GROUPS.map(g => ({ ...g, items: pending.filter(t => groupOf(t, today) === g.id) })).filter(g => g.items.length > 0);

  const addSuggestion = (s: TaskSuggestion) => onCreate({ title: s.title, assignee: s.assignee, priority: s.priority, dueDate: '', notes: s.notes ?? '', week: Math.max(s.week, currentWeek) });

  return (
    <div className="space-y-5">
      {/* O andamento num anel com coração, e de quem são as tarefas. */}
      <div className="flex items-center gap-3 px-1">
        <ProgressHeart value={total ? completed.length / total : 0} />
        <div className="min-w-0">
          <p className="font-display text-[1.2rem] leading-tight text-ink">{total === 0 ? 'Os preparativos de vocês' : completed.length === total ? 'Tudo feito por aqui' : `${completed.length} de ${total} feitas`}</p>
          <p className="text-[13px] text-ink-soft">{overdue > 0 ? <span className="text-alert font-semibold">{overdue} {overdue === 1 ? 'passou do prazo' : 'passaram do prazo'}</span> : pending.length ? `${pending.length} para fazer` : 'Dividam as tarefas: cada uma tem quem cuida.'}</p>
        </div>
      </div>
      {/* Filtrar por quem cuida só faz sentido com os dois no espaço. */}
      {couple && (
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
          ]}
        />
      )}


      {groups.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-4">
          <RestDoodle />
          <p className="mt-2 font-display text-[1.15rem] text-ink">{total ? 'Tudo em dia' : 'Nenhuma tarefa ainda'}</p>
          <p className="text-[13.5px] text-ink-soft">{total ? 'Hora de descansar juntos. 💛' : 'Comecem pelas ideias para esta fase, logo abaixo, ou pelo Registrar, no meio do menu.'}</p>
        </div>
      ) : (
        groups.map(g => (
          <section key={g.id} aria-label={g.title} className="space-y-1.5">
            <h2 className={`px-1 flex items-baseline gap-2 text-[13px] font-extrabold font-sans ${g.tone}`}>
              {g.title} <span className="text-ink-mute font-bold">{g.items.length}</span>
            </h2>
            <ul className="rounded-[24px] bg-surface/80 divide-y divide-line/60">
              {g.items.map(t => (
                <TaskRow key={t.id} task={t} today={today} onToggle={onToggle} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        ))
      )}

      {/* O resto, recolhido: as ideias da fase e o que já foi feito. */}
      {(suggestions.length > 0 || completed.length > 0) && (
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
                    <TaskRow key={t.id} task={t} today={today} onToggle={onToggle} onOpen={onOpen} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PRIORITY_RANK: Record<Priority, number> = { Alta: 0, Média: 1, Baixa: 2 };
// A bolinha de concluir mostra a prioridade pela cor (como nas listas de afazeres).
const RING: Record<Priority, string> = { Alta: 'border-rosa bg-rosa-soft', Média: 'border-azul/70 bg-azul-soft/50', Baixa: 'border-ink-mute/60' };

/** O prazo como uma etiqueta colorida: atrasada, hoje, amanhã, o dia da semana ou a data. */
function dueLabel(due: string, today: string): { text: string; tone: string } {
  if (due < today) return { text: formatBR(due).slice(0, 5), tone: 'text-alert' };
  if (due === today) return { text: 'Hoje', tone: 'text-verde-strong' };
  if (due === addDays(today, 1)) return { text: 'Amanhã', tone: 'text-lilas-strong' };
  const d = parseLocalDate(due);
  if (due <= addDays(today, 7)) return { text: d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, c => c.toUpperCase()), tone: 'text-azul-strong' };
  return { text: d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', ''), tone: 'text-ink-soft' };
}

/** Uma tarefa numa linha: a bolinha conclui (com um pulinho), o resto abre os detalhes. */
function TaskRow({ task: t, today, onToggle, onOpen }: { task: PartnerTask; today: string; onToggle: (t: PartnerTask) => void; onOpen: (t: PartnerTask) => void }) {
  const people = useContext(PeopleContext);
  const [closing, setClosing] = useState(false);
  const done = t.is_completed || closing;
  const due = t.due_date?.slice(0, 10);
  const label = due ? dueLabel(due, today) : null;
  const toggle = () => {
    if (t.is_completed) return onToggle(t);
    // Um instante para ver o "feito" antes de a tarefa sair da lista.
    setClosing(true);
    window.setTimeout(() => onToggle(t), 420);
  };
  return (
    <li className={`flex items-start gap-3 px-4 py-3 transition-opacity duration-300 ${closing ? 'opacity-50' : ''}`}>
      <button onClick={toggle} aria-label={t.is_completed ? `Reabrir "${t.task_title}"` : `Concluir "${t.task_title}"`} className="mt-0.5 shrink-0">
        {done ? (
          <CheckCircle2 className="w-[22px] h-[22px] text-ok animate-[tt-pop_400ms_ease-out]" />
        ) : (
          <span className={`block w-[22px] h-[22px] rounded-full border-2 transition hover:scale-110 ${RING[t.priority] ?? RING.Média}`} />
        )}
      </button>
      <button type="button" onClick={() => onOpen(t)} className="flex-1 min-w-0 text-left" aria-label={`${t.task_title}: ver detalhes`}>
        <span className={`block leading-snug ${done ? 'line-through text-ink-mute' : 'text-ink'}`}>{t.task_title}</span>
        {(label || t.notes || (t.remind_on && !t.is_completed)) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-mute">
            {label && !t.is_completed && (
              <span className={`inline-flex items-center gap-1 font-semibold ${label.tone}`}>
                <CalendarDays className="w-3.5 h-3.5" /> {label.text}
              </span>
            )}
            {t.remind_on && !t.is_completed && t.remind_on.slice(0, 10) >= today && <Bell className="w-3.5 h-3.5" aria-label="com lembrete" />}
            {t.notes && <span className="truncate max-w-[12rem]">{t.notes}</span>}
          </span>
        )}
      </button>
      <span className="shrink-0 self-center flex items-center gap-2" title={whoName(people, t.assigned_to)}>
        <WhoAvatars who={t.assigned_to} className="w-6 h-6 text-[10px]" />
      </span>
    </li>
  );
}

export function TaskForm({ selectedWeek: _selectedWeek, busy, onCreate, initialDueDate, onCancel, initial, startTitle }: { selectedWeek: number; busy: boolean; onCreate: (t: NewTask) => Promise<boolean>; initialDueDate?: string; onCancel?: () => void; initial?: PartnerTask; /** O que já foi escrito (no "Registrar"). */ startTitle?: string }) {
  void _selectedWeek;
  const [title, setTitle] = useState(initial?.task_title ?? startTitle ?? '');
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
