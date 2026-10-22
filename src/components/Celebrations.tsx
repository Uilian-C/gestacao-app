import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, ChevronUp, Lightbulb, Loader2, MapPin, PartyPopper, Pencil, Plus, Trash2, Users, Wallet } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import {
  CELEBRATION_KINDS,
  GUEST_STATUS,
  PALETTE,
  SUPPLIER_STATUS,
  brl,
  budgetOf,
  daysTo,
  diaperFor,
  diaperPlan,
  dueOf,
  guestsOf,
  kindOfCelebration,
  pendingTasks,
  type Celebration,
  type CelebrationItem,
  type CelebrationItemKind,
  type CelebrationKind,
  type GuestStatus,
  type SupplierStatus,
} from '../lib/celebrations';
import { formatBR, parseTimestamp } from '../lib/dates';

// Celebrações: o chá de bebê (e o de fraldas, o revelação, o ensaio...) do
// planejamento à festa. No Diário, a lista; cada celebração abre um fichário
// em tela cheia com a data, o tema e as cores, e as fichas: tarefas (com o
// roteiro pronto, contado a partir da data), fornecedores e orçamento,
// convidados (com a divisão das fraldas por tamanho) e ideias. Apagar sempre
// pede confirmação. Por enquanto, só o casal organiza.

export interface CelebrationFields {
  title: string;
  eventAt?: string | null;
  location?: string | null;
  theme?: string | null;
  colors?: string[];
  budget?: number | null;
  notes?: string | null;
}
export interface ItemFields {
  title: string;
  dueDate?: string | null;
  dueOffset?: number | null;
  assignedTo?: 'mae' | 'pai' | 'casal' | null;
  done?: boolean;
  contact?: string | null;
  amount?: number | null;
  status?: string | null;
  people?: number | null;
  notes?: string | null;
}
export interface CelebrationActions {
  create: (kind: CelebrationKind, f: CelebrationFields) => Promise<boolean>;
  update: (id: string, f: CelebrationFields) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  addItem: (celebrationId: string, kind: CelebrationItemKind, f: ItemFields) => Promise<boolean>;
  updateItem: (id: string, f: ItemFields) => Promise<boolean>;
  removeItem: (id: string) => Promise<boolean>;
}

const num = (v: string | null) => (v == null || v === '' ? null : Number(v));
const itemFieldsOf = (i: CelebrationItem): ItemFields => ({
  title: i.title,
  dueDate: i.due_date ? i.due_date.slice(0, 10) : null,
  dueOffset: i.due_offset,
  assignedTo: i.assigned_to,
  done: i.done,
  contact: i.contact,
  amount: num(i.amount),
  status: i.status,
  people: i.people,
  notes: i.notes,
});

/** "sábado, 12 de dezembro, 15:00". */
const whenText = (iso: string) => {
  const d = parseTimestamp(iso);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
const countdown = (days: number | null) => (days === null ? 'Sem data ainda' : days === 0 ? 'É hoje!' : days === 1 ? 'É amanhã' : days > 0 ? `Faltam ${days} dias` : 'Já aconteceu');

/** Diário → Celebrações: a lista e o começo de uma nova. */
export function CelebrationList({ celebrations, actions, onOpen }: { celebrations: Celebration[]; actions: CelebrationActions; onOpen: (id: string) => void }) {
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<CelebrationKind | null>(null);
  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <header className="rounded-[28px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft px-5 pt-5 pb-4 shadow-soft">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">Celebrações</p>
        <h2 className="font-display text-[1.45rem] leading-snug text-ink text-balance">Os encontros que vão fazer parte da história de vocês</h2>
        <p className="text-[13.5px] text-ink-soft mt-1">Chá de bebê, de fraldas, revelação, ensaio de fotos: planejem tudo aqui, do tema às fraldas, com prazos que se ajustam à data.</p>
        <button type="button" onClick={() => setPicking(v => !v)} aria-expanded={picking} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-2 text-[13.5px] font-extrabold shadow-soft">
          <Plus className="w-4 h-4" /> Nova celebração
        </button>
        {picking && (
          <ul className="mt-3 grid grid-cols-1 gap-2" aria-label="Que celebração?">
            {CELEBRATION_KINDS.map(k => (
              <li key={k.id}>
                <button
                  type="button"
                  disabled={creating !== null}
                  onClick={async () => {
                    setCreating(k.id);
                    const ok = await actions.create(k.id, { title: k.label });
                    setCreating(null);
                    if (ok) setPicking(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-2.5 text-left shadow-soft disabled:opacity-60"
                >
                  <span className="text-[1.4rem]" aria-hidden>
                    {k.emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-ink">{k.label}</span>
                    <span className="block text-[12.5px] text-ink-soft">{k.hint}</span>
                  </span>
                  {creating === k.id ? <Loader2 className="w-4 h-4 animate-spin text-rosa" /> : <ChevronRight className="w-4 h-4 text-ink-mute" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>

      {celebrations.length === 0 ? (
        <p className="rounded-[24px] bg-surface shadow-soft px-5 py-4 text-[14px] text-ink-soft">
          Ainda não há celebrações. Que tal começar pelo chá de bebê? O roteiro de tarefas já vem pronto.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Celebrações">
          {celebrations.map(c => {
            const k = kindOfCelebration(c.kind);
            const tasks = c.items.filter(i => i.kind === 'tarefa');
            const done = tasks.filter(t => t.done).length;
            const next = pendingTasks(c)[0];
            const days = daysTo(c.event_at);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} aria-label={`${c.title}: abrir`} className="relative w-full text-left rounded-[26px] bg-surface shadow-soft px-5 pt-4 pb-4 transition active:scale-[0.99]">
                  <span className="flex items-start gap-3">
                    <span className="text-[1.8rem] leading-none" aria-hidden>
                      {k.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display text-[1.3rem] leading-tight text-ink">{c.title}</span>
                      <span className="block text-[12.5px] text-ink-soft">{c.event_at ? whenText(c.event_at) : 'Sem data ainda'}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${days !== null && days >= 0 && days <= 14 ? 'bg-rosa text-white' : 'bg-rosa-soft text-rosa-strong'}`}>{countdown(days)}</span>
                  </span>
                  {c.colors.length > 0 && (
                    <span className="mt-2 flex gap-1" aria-hidden>
                      {c.colors.map(col => (
                        <span key={col} className="w-5 h-5 rounded-full ring-1 ring-line" style={{ background: col }} />
                      ))}
                    </span>
                  )}
                  {tasks.length > 0 && (
                    <span className="mt-3 block">
                      <span className="block h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                        <span className="block h-full rounded-full bg-rosa" style={{ width: `${(done / tasks.length) * 100}%` }} />
                      </span>
                      <span className="mt-1 block text-[12.5px] text-ink-soft truncate">{next ? `Próximo passo: ${next.item.title}${next.due ? ` · até ${formatBR(next.due)}` : ''}` : 'Tudo pronto. Agora é aproveitar!'}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Tab = 'tarefa' | 'fornecedor' | 'convidado' | 'ideia';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'tarefa', label: 'Tarefas' },
  { id: 'fornecedor', label: 'Fornecedores' },
  { id: 'convidado', label: 'Convidados' },
  { id: 'ideia', label: 'Ideias' },
];

/** O fichário de uma celebração, em tela cheia. */
export function CelebrationSpace({ celebration: c, actions, onClose }: { celebration: Celebration; actions: CelebrationActions; onClose: () => void }) {
  useScrollLock();
  const [tab, setTab] = useState<Tab>('tarefa');
  const [editing, setEditing] = useState(!c.event_at);
  const [removing, setRemoving] = useState(false);
  const k = kindOfCelebration(c.kind);
  const days = daysTo(c.event_at);
  const tasks = c.items.filter(i => i.kind === 'tarefa');
  const done = tasks.filter(t => t.done).length;
  const budget = budgetOf(c);
  const guests = guestsOf(c);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div role="dialog" aria-label={c.title} className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-canvas">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-canvas/90 backdrop-blur px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
        <button type="button" onClick={onClose} aria-label="Voltar" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="flex-1 font-display text-[1.15rem] text-ink truncate">{c.title}</p>
      </header>

      <div className="mx-auto max-w-[560px] px-4 pb-16 space-y-4">
        <section className="rounded-[28px] bg-gradient-to-b from-rosa-soft via-lilas-soft to-surface px-5 pt-5 pb-5">
          {editing ? (
            <DetailsForm celebration={c} onSave={async f => (await actions.update(c.id, f)) && setEditing(false)} onCancel={c.event_at ? () => setEditing(false) : undefined} />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="text-[2.2rem] leading-none" aria-hidden>
                  {k.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">{k.label}</p>
                  <h2 className="font-display text-[1.6rem] leading-tight text-ink">{c.title}</h2>
                </div>
                <button type="button" onClick={() => setEditing(true)} aria-label="Editar os detalhes" className="shrink-0 w-9 h-9 rounded-full bg-surface flex items-center justify-center text-ink-soft shadow-soft">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-[14.5px] font-bold text-ink first-letter:uppercase">{c.event_at ? whenText(c.event_at) : 'Sem data ainda'}</p>
              {c.location && (
                <p className="mt-1 flex items-start gap-1.5 text-[13.5px] text-ink-soft">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> {c.location}
                </p>
              )}
              {(c.theme || c.colors.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {c.theme && <span className="text-[13.5px] text-ink">Tema: {c.theme}</span>}
                  <span className="flex gap-1" aria-label="Cores do tema">
                    {c.colors.map(col => (
                      <span key={col} className="w-5 h-5 rounded-full ring-1 ring-line" style={{ background: col }} />
                    ))}
                  </span>
                </div>
              )}
              {/* O resumo: quanto falta, as tarefas, o orçamento e quem vai. */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <span className="rounded-2xl bg-surface px-2 py-2.5">
                  <span className="block font-display text-[1.15rem] text-rosa-strong leading-tight">{countdown(days)}</span>
                </span>
                <span className="rounded-2xl bg-surface px-2 py-2.5">
                  <span className="block font-display text-[1.15rem] text-ink leading-tight">
                    {done}/{tasks.length}
                  </span>
                  <span className="block text-[11.5px] text-ink-soft">tarefas</span>
                </span>
                <span className="rounded-2xl bg-surface px-2 py-2.5">
                  <span className="block font-display text-[1.15rem] text-ink leading-tight">{guests.going}</span>
                  <span className="block text-[11.5px] text-ink-soft">confirmados</span>
                </span>
              </div>
              {(budget.planned !== null || budget.quoted > 0) && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <Wallet className="w-4 h-4" /> {brl(budget.committed)} combinados{budget.planned !== null ? ` de ${brl(budget.planned)} previstos` : ''}
                  {budget.paid > 0 && ` · ${brl(budget.paid)} pagos`}
                </p>
              )}
            </>
          )}
        </section>

        <div role="tablist" aria-label="Fichas da celebração" className="flex gap-1 rounded-full bg-surface shadow-soft p-1">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-full py-2 text-[12.5px] font-bold transition ${tab === t.id ? 'bg-ink text-surface' : 'text-ink-soft'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'tarefa' && <TaskList celebration={c} actions={actions} />}
        {tab === 'fornecedor' && <SupplierList celebration={c} actions={actions} />}
        {tab === 'convidado' && <GuestList celebration={c} actions={actions} />}
        {tab === 'ideia' && <IdeaList celebration={c} actions={actions} />}

        <div className="pt-4 text-center">
          {removing ? (
            <div className="inline-flex flex-col items-center gap-2 rounded-2xl bg-alert-soft px-4 py-3">
              <span className="text-[13.5px] text-ink">Apagar “{c.title}”? Tarefas, fornecedores, convidados e ideias saem junto.</span>
              <span className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (await actions.remove(c.id)) onClose();
                  }}
                  className="rounded-full bg-alert text-white px-4 py-1.5 text-[13px] font-extrabold"
                >
                  Apagar
                </button>
                <button type="button" onClick={() => setRemoving(false)} className="rounded-full px-4 py-1.5 text-[13px] font-bold text-ink-soft">
                  Manter
                </button>
              </span>
            </div>
          ) : (
            <button type="button" onClick={() => setRemoving(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mute">
              <Trash2 className="w-3.5 h-3.5" /> Apagar esta celebração
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const input = 'w-full rounded-2xl bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-mute outline-none ring-1 ring-line focus:ring-2 focus:ring-rosa/50';

/** Nome, data e hora, local, tema, cores e orçamento previsto. */
function DetailsForm({ celebration: c, onSave, onCancel }: { celebration: Celebration; onSave: (f: CelebrationFields) => Promise<unknown>; onCancel?: () => void }) {
  const start = c.event_at ? parseTimestamp(c.event_at) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const [title, setTitle] = useState(c.title);
  const [date, setDate] = useState(start ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` : '');
  const [time, setTime] = useState(start ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '15:00');
  const [location, setLocation] = useState(c.location ?? '');
  const [theme, setTheme] = useState(c.theme ?? '');
  const [colors, setColors] = useState<string[]>(c.colors);
  const [budget, setBudget] = useState(c.budget ? String(Number(c.budget)) : '');
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label="Detalhes da celebração"
      className="space-y-2.5"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        await onSave({
          title: title.trim() || c.title,
          eventAt: date ? new Date(`${date}T${time || '15:00'}`).toISOString() : null,
          location: location.trim() || null,
          theme: theme.trim() || null,
          colors,
          budget: budget ? Number(budget.replace(',', '.')) : null,
          notes: c.notes,
        });
        setBusy(false);
      }}
    >
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">{kindOfCelebration(c.kind).label}</p>
      <input aria-label="Nome da celebração" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} className={input} />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input type="date" aria-label="Data" value={date} onChange={e => setDate(e.target.value)} className={input} />
        <input type="time" aria-label="Hora" value={time} onChange={e => setTime(e.target.value)} className={`${input.replace('w-full ', '')} shrink-0 w-28`} />
      </div>
      <input aria-label="Local" placeholder="Local (salão, casa da vó, parque…)" value={location} onChange={e => setLocation(e.target.value)} maxLength={300} className={input} />
      <input aria-label="Tema" placeholder="Tema (ursinhos, safári, nuvens…)" value={theme} onChange={e => setTheme(e.target.value)} maxLength={120} className={input} />
      <div>
        <p className="text-[12.5px] font-bold text-ink-soft mb-1.5">Cores do tema (até seis)</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cores do tema">
          {PALETTE.map(col => {
            const on = colors.includes(col);
            return (
              <button
                key={col}
                type="button"
                aria-pressed={on}
                aria-label={`Cor ${col}`}
                onClick={() => setColors(list => (on ? list.filter(x => x !== col) : list.length < 6 ? [...list, col] : list))}
                className={`w-8 h-8 rounded-full ring-1 ring-line flex items-center justify-center ${on ? 'ring-2 ring-ink' : ''}`}
                style={{ background: col }}
              >
                {on && <Check className="w-4 h-4 text-ink" />}
              </button>
            );
          })}
        </div>
      </div>
      <input inputMode="decimal" aria-label="Orçamento previsto" placeholder="Orçamento previsto (R$) — opcional" value={budget} onChange={e => setBudget(e.target.value.replace(/[^\d.,]/g, ''))} className={input} />
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-rosa text-white py-2.5 font-extrabold disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2.5 font-bold text-ink-soft">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/** Uma linha que abre para mostrar mais (e o apagar com confirmação). */
function Row({ title, sub, done, onToggle, children, onRemove, removeText }: { title: string; sub?: React.ReactNode; done?: boolean; onToggle?: () => void; children?: React.ReactNode; onRemove: () => Promise<boolean>; removeText: string }) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  return (
    <li className="rounded-2xl bg-surface shadow-soft">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        {onToggle && (
          <button type="button" onClick={onToggle} aria-pressed={!!done} aria-label={`${done ? 'Desmarcar' : 'Marcar como feita'}: ${title}`} className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center ${done ? 'bg-rosa border-rosa text-white' : 'border-ink-mute'}`}>
            {done && <Check className="w-4 h-4" strokeWidth={3} />}
          </button>
        )}
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="flex-1 min-w-0 text-left">
          <span className={`block text-[14.5px] leading-snug ${done ? 'text-ink-mute line-through' : 'text-ink font-semibold'}`}>{title}</span>
          {sub && <span className="block text-[12px] text-ink-mute">{sub}</span>}
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-ink-mute shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-mute shrink-0" />}
      </div>
      {open && (
        <div className="border-t border-line px-3.5 py-2.5 space-y-2">
          {children}
          {removing ? (
            <span className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-ink-soft">{removeText}</span>
              <button type="button" onClick={async () => (await onRemove()) && setRemoving(false)} className="font-bold text-alert">
                Apagar
              </button>
              <button type="button" onClick={() => setRemoving(false)} className="font-bold text-ink-soft">
                Manter
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setRemoving(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-mute">
              <Trash2 className="w-3.5 h-3.5" /> Apagar
            </button>
          )}
        </div>
      )}
    </li>
  );
}

const WHO: Array<{ id: 'mae' | 'pai' | 'casal'; label: string }> = [
  { id: 'mae', label: 'Mãe' },
  { id: 'pai', label: 'Pai' },
  { id: 'casal', label: 'Os dois' },
];

function TaskList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const tasks = c.items
    .filter(i => i.kind === 'tarefa')
    .map(i => ({ item: i, due: dueOf(i, c.event_at) }))
    .sort((a, b) => Number(a.item.done) - Number(b.item.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  return (
    <section className="space-y-2.5" aria-label="Tarefas">
      {!c.event_at && <p className="text-[13px] text-ink-soft px-1">Coloquem a data para os prazos aparecerem (eles se ajustam sozinhos se a data mudar).</p>}
      <ul className="space-y-2">
        {tasks.map(({ item: t, due }) => (
          <Row
            key={t.id}
            title={t.title}
            done={t.done}
            onToggle={() => actions.updateItem(t.id, { ...itemFieldsOf(t), done: !t.done })}
            sub={[due ? `até ${formatBR(due)}` : null, t.due_offset != null && !t.due_date ? `${t.due_offset} ${t.due_offset === 1 ? 'dia' : 'dias'} antes` : null, WHO.find(w => w.id === t.assigned_to)?.label].filter(Boolean).join(' · ')}
            onRemove={() => actions.removeItem(t.id)}
            removeText="Apagar esta tarefa?"
          >
            <div className="flex gap-1.5" role="group" aria-label="Quem cuida">
              {WHO.map(w => (
                <button key={w.id} type="button" aria-pressed={t.assigned_to === w.id} onClick={() => actions.updateItem(t.id, { ...itemFieldsOf(t), assignedTo: w.id })} className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${t.assigned_to === w.id ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
                  {w.label}
                </button>
              ))}
            </div>
          </Row>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={async e => {
          e.preventDefault();
          if (!title.trim()) return;
          if (await actions.addItem(c.id, 'tarefa', { title: title.trim(), dueDate: date || null, assignedTo: 'casal' })) {
            setTitle('');
            setDate('');
          }
        }}
      >
        <input aria-label="Nova tarefa" placeholder="Nova tarefa" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className={`${input} flex-1 min-w-0`} />
        <input type="date" aria-label="Prazo da nova tarefa" value={date} onChange={e => setDate(e.target.value)} className={`${input.replace('w-full ', '')} shrink-0 w-36`} />
        <button type="submit" aria-label="Adicionar tarefa" className="shrink-0 w-11 rounded-2xl bg-rosa text-white flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </button>
      </form>
    </section>
  );
}

const whatsapp = (contact: string | null) => {
  const digits = (contact ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : null;
};

function SupplierList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const [title, setTitle] = useState('');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState('');
  const suppliers = c.items.filter(i => i.kind === 'fornecedor');
  const budget = budgetOf(c);
  const statuses = Object.keys(SUPPLIER_STATUS) as SupplierStatus[];
  return (
    <section className="space-y-2.5" aria-label="Fornecedores">
      <p className="px-1 text-[13px] text-ink-soft">
        {suppliers.length === 0 ? 'Bolo, doces, decoração, fotógrafo, espaço… Anotem cada um com o contato e o valor.' : `${brl(budget.committed)} combinados · ${brl(budget.paid)} pagos${budget.planned !== null ? ` · previsto ${brl(budget.planned)}` : ''}`}
      </p>
      <ul className="space-y-2">
        {suppliers.map(s => {
          const link = whatsapp(s.contact);
          const status = (s.status ?? 'orcado') as SupplierStatus;
          return (
            <Row key={s.id} title={s.title} sub={[s.amount ? brl(Number(s.amount)) : null, SUPPLIER_STATUS[status]].filter(Boolean).join(' · ')} onRemove={() => actions.removeItem(s.id)} removeText="Apagar este fornecedor?">
              {s.contact && (
                <p className="text-[13.5px] text-ink">
                  {s.contact}
                  {link && (
                    <a href={link} target="_blank" rel="noopener" className="ml-2 font-bold text-verde-strong">
                      WhatsApp ›
                    </a>
                  )}
                </p>
              )}
              <div className="flex gap-1.5" role="group" aria-label="Situação">
                {statuses.map(st => (
                  <button key={st} type="button" aria-pressed={status === st} onClick={() => actions.updateItem(s.id, { ...itemFieldsOf(s), status: st })} className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${status === st ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
                    {SUPPLIER_STATUS[st]}
                  </button>
                ))}
              </div>
            </Row>
          );
        })}
      </ul>
      <form
        className="space-y-2 rounded-2xl bg-surface-2/60 p-2.5"
        onSubmit={async e => {
          e.preventDefault();
          if (!title.trim()) return;
          if (await actions.addItem(c.id, 'fornecedor', { title: title.trim(), contact: contact.trim() || null, amount: amount ? Number(amount.replace(',', '.')) : null, status: 'orcado' })) {
            setTitle('');
            setContact('');
            setAmount('');
          }
        }}
      >
        <input aria-label="Fornecedor" placeholder="Fornecedor ou serviço (ex.: Bolo da Ju)" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className={input} />
        <div className="flex gap-2">
          <input aria-label="Contato" placeholder="Contato (WhatsApp, Instagram…)" value={contact} onChange={e => setContact(e.target.value)} maxLength={120} className={`${input} flex-1 min-w-0`} />
          <input inputMode="decimal" aria-label="Valor" placeholder="R$" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} className={`${input.replace('w-full ', '')} shrink-0 w-24`} />
          <button type="submit" aria-label="Adicionar fornecedor" className="shrink-0 w-11 rounded-2xl bg-rosa text-white flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </form>
    </section>
  );
}

function GuestList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const [name, setName] = useState('');
  const [people, setPeople] = useState('1');
  const g = guestsOf(c);
  const diapers = c.kind === 'cha_fraldas' || c.kind === 'cha_bebe';
  // Um pacote por convite (quem não vai fica de fora).
  const invited = g.guests.filter(x => x.status !== 'nao_vai');
  const sizes = diaperFor(invited.map(x => x.id));
  const statuses = Object.keys(GUEST_STATUS) as GuestStatus[];
  return (
    <section className="space-y-2.5" aria-label="Convidados">
      <p className="px-1 text-[13px] text-ink-soft">
        {g.guests.length === 0 ? 'Anotem quem vocês querem por perto. Cada convite pode levar mais de uma pessoa.' : `${g.going} confirmados · ${g.maybe} talvez · ${g.waiting} sem resposta`}
      </p>
      <ul className="space-y-2">
        {g.guests.map(x => {
          const status = (x.status ?? 'convidado') as GuestStatus;
          const size = sizes.get(x.id);
          return (
            <Row key={x.id} title={x.title} sub={[GUEST_STATUS[status], (x.people ?? 1) > 1 ? `${x.people} pessoas` : null, diapers && size ? `fralda ${size}` : null].filter(Boolean).join(' · ')} onRemove={() => actions.removeItem(x.id)} removeText="Tirar da lista?">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Confirmação">
                {statuses.map(st => (
                  <button key={st} type="button" aria-pressed={status === st} onClick={() => actions.updateItem(x.id, { ...itemFieldsOf(x), status: st })} className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${status === st ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
                    {GUEST_STATUS[st]}
                  </button>
                ))}
              </div>
            </Row>
          );
        })}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={async e => {
          e.preventDefault();
          if (!name.trim()) return;
          if (await actions.addItem(c.id, 'convidado', { title: name.trim(), people: Math.max(1, Number(people) || 1), status: 'convidado' })) {
            setName('');
            setPeople('1');
          }
        }}
      >
        <input aria-label="Convidado" placeholder="Nome (ou família: Tia Bia e Rafa)" value={name} onChange={e => setName(e.target.value)} maxLength={120} className={`${input} flex-1 min-w-0`} />
        <input inputMode="numeric" aria-label="Quantas pessoas" value={people} onChange={e => setPeople(e.target.value.replace(/\D/g, ''))} className={`${input.replace('w-full ', '')} shrink-0 w-16 text-center`} />
        <button type="submit" aria-label="Adicionar convidado" className="shrink-0 w-11 rounded-2xl bg-rosa text-white flex items-center justify-center">
          <Users className="w-5 h-5" />
        </button>
      </form>
      {diapers && invited.length > 0 && <DiaperCalculator packs={invited.length} />}
    </section>
  );
}

/** A calculadora de fraldas: quantos pacotes de cada tamanho, para não sobrar RN e faltar G. */
function DiaperCalculator({ packs }: { packs: number }) {
  const plan = diaperPlan(packs);
  return (
    <div className="rounded-[22px] bg-azul-soft px-4 py-3.5 space-y-2" aria-label="Calculadora de fraldas">
      <p className="font-bold text-ink">Fraldas: um pacote por convite</p>
      <p className="text-[12.5px] text-ink-soft">O bebê usa poucas RN e muitas M e G. Assim fica a divisão (e cada convidado da lista já aparece com o seu tamanho):</p>
      <ul className="grid grid-cols-5 gap-1.5 text-center">
        {plan.map(p => (
          <li key={p.size} className="rounded-xl bg-surface px-1 py-2">
            <span className="block font-display text-[1.2rem] text-ink leading-none">{p.packs}</span>
            <span className="block text-[12px] font-extrabold text-azul-strong">{p.size}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11.5px] text-ink-mute">{plan.map(p => `${p.size}: ${p.hint}`).join(' · ')}</p>
    </div>
  );
}

function IdeaList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const [title, setTitle] = useState('');
  const ideas = c.items.filter(i => i.kind === 'ideia');
  const starters = ['Painel de fotos da barriga', 'Brincadeira: adivinhe o tamanho da barriga', 'Lembrancinha: sabonete artesanal', 'Livro de recados para o bebê', 'Mesa de doces nas cores do tema'];
  return (
    <section className="space-y-2.5" aria-label="Ideias">
      {ideas.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {starters.map(s => (
            <button key={s} type="button" onClick={() => setTitle(s)} className="rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft shadow-soft">
              <Lightbulb className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-warm" />
              {s}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {ideas.map(i => (
          <Row key={i.id} title={i.title} onRemove={() => actions.removeItem(i.id)} removeText="Apagar esta ideia?" />
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={async e => {
          e.preventDefault();
          if (!title.trim()) return;
          if (await actions.addItem(c.id, 'ideia', { title: title.trim() })) setTitle('');
        }}
      >
        <input aria-label="Nova ideia" placeholder="Decoração, cardápio, brincadeira, lembrancinha…" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className={`${input} flex-1 min-w-0`} />
        <button type="submit" aria-label="Adicionar ideia" className="shrink-0 w-11 rounded-2xl bg-rosa text-white flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </button>
      </form>
    </section>
  );
}

/** No Início, a partir de 60 dias antes: a contagem e o próximo passo. */
export function CelebrationTeaser({ celebration: c, days, onOpen }: { celebration: Celebration; days: number; onOpen: () => void }) {
  const next = pendingTasks(c)[0];
  const k = kindOfCelebration(c.kind);
  return (
    <button type="button" onClick={onOpen} aria-label={`${c.title}: abrir`} className="w-full flex items-center gap-3 rounded-[26px] bg-surface shadow-soft px-4 py-3.5 text-left transition active:scale-[0.99]">
      <span className="w-12 h-12 rounded-2xl bg-rosa-soft flex items-center justify-center text-[1.6rem] shrink-0" aria-hidden>
        {k.emoji}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-rosa">
          <PartyPopper className="w-3.5 h-3.5" /> {countdown(days)}
        </span>
        <span className="block font-bold text-ink leading-snug truncate">{c.title}</span>
        <span className="block text-[12.5px] text-ink-soft truncate">{next ? `Próximo passo: ${next.item.title}${next.due ? ` · até ${formatBR(next.due)}` : ''}` : 'Tudo pronto. Agora é aproveitar!'}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-ink-mute shrink-0" />
    </button>
  );
}
