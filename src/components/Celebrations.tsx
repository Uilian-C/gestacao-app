import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Lightbulb, Loader2, MapPin, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import {
  CELEBRATION_KINDS,
  GUEST_STATUS,
  PALETTE,
  SUPPLIER_STATUS,
  brl,
  brlCents,
  budgetMeter,
  daysTo,
  diaperFor,
  diaperPlan,
  dueOf,
  guestsOf,
  isLate,
  kindOfCelebration,
  moneyFromTyping,
  pendingTasks,
  type Celebration,
  type CelebrationItem,
  type CelebrationItemKind,
  type CelebrationKind,
  type GuestStatus,
  type SupplierStatus,
} from '../lib/celebrations';
import { formatBR, parseTimestamp } from '../lib/dates';
import { CelebrationTile } from './CelebrationIcon';

// Celebrações: o chá de bebê (e o de fraldas, o revelação, o ensaio...) do
// planejamento à festa. No Diário, a lista; cada celebração abre um fichário
// em tela cheia com um painel (contagem, tarefas, convidados, fornecedores e a
// régua do orçamento) e as fichas: tarefas (com o roteiro pronto, contado a
// partir da data), fornecedores, convidados (com a divisão das fraldas por
// tamanho) e ideias. Toda ficha abre para editar; apagar sempre pede
// confirmação. Por enquanto, só o casal organiza.

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
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
                  className="w-full flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left shadow-soft disabled:opacity-60"
                >
                  <CelebrationTile kind={k.id} size="sm" />
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
            const tasks = c.items.filter(i => i.kind === 'tarefa');
            const done = tasks.filter(t => t.done).length;
            const next = pendingTasks(c)[0];
            const days = daysTo(c.event_at);
            const guests = guestsOf(c);
            const meter = budgetMeter(c);
            const facts = [tasks.length ? `${done}/${tasks.length} tarefas` : null, guests.guests.length ? plural(guests.going, 'confirmado', 'confirmados') : null, meter.pct !== null ? `${Math.round(meter.pct)}% do orçamento` : null].filter(Boolean);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} aria-label={`${c.title}: abrir`} className="relative w-full text-left rounded-[26px] bg-surface shadow-soft px-4 pt-4 pb-4 transition active:scale-[0.99]">
                  <span className="flex items-start gap-3">
                    <CelebrationTile kind={c.kind} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-display text-[1.25rem] leading-tight text-ink">{c.title}</span>
                      <span className="block text-[12.5px] text-ink-soft first-letter:uppercase">{c.event_at ? whenText(c.event_at) : 'Sem data ainda'}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${days !== null && days >= 0 && days <= 14 ? 'bg-rosa text-white' : 'bg-rosa-soft text-rosa-strong'}`}>{countdown(days)}</span>
                  </span>
                  {tasks.length > 0 && (
                    <span className="mt-3 block">
                      <span className="block h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                        <span className="block h-full rounded-full bg-rosa" style={{ width: `${(done / tasks.length) * 100}%` }} />
                      </span>
                      {facts.length > 0 && <span className="mt-1.5 block text-[12px] font-semibold text-ink-soft">{facts.join(' · ')}</span>}
                      <span className="block text-[12.5px] text-ink-mute truncate">{next ? `Próximo passo: ${next.item.title}` : 'Tudo pronto. Agora é aproveitar!'}</span>
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
  const tabsRef = useRef<HTMLDivElement>(null);
  const k = kindOfCelebration(c.kind);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const goTo = (t: Tab) => {
    setTab(t);
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

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
                <CelebrationTile kind={c.kind} size="lg" onTint />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">{k.label}</p>
                  <h2 className="font-display text-[1.55rem] leading-tight text-ink">{c.title}</h2>
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
              <Dashboard celebration={c} onTab={goTo} onEditBudget={() => setEditing(true)} />
            </>
          )}
        </section>

        <div ref={tabsRef} role="tablist" aria-label="Fichas da celebração" className="scroll-mt-16 flex gap-1 rounded-full bg-surface shadow-soft p-1">
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

/** O painel: a contagem, o andamento de cada ficha e a régua do orçamento. */
function Dashboard({ celebration: c, onTab, onEditBudget }: { celebration: Celebration; onTab: (t: Tab) => void; onEditBudget: () => void }) {
  const days = daysTo(c.event_at);
  const tasks = c.items.filter(i => i.kind === 'tarefa');
  const done = tasks.filter(t => t.done).length;
  const late = tasks.filter(t => isLate(t, c.event_at)).length;
  const g = guestsOf(c);
  const people = g.going + g.maybe + g.waiting;
  const suppliers = c.items.filter(i => i.kind === 'fornecedor');
  const closed = suppliers.filter(s => s.status === 'contratado' || s.status === 'pago').length;
  const guestHint = [g.maybe ? `${g.maybe} talvez` : null, g.waiting ? `${g.waiting} sem resposta` : null].filter(Boolean).join(' · ');
  return (
    <div className="mt-4 space-y-2.5">
      <p className="rounded-2xl bg-surface px-4 py-2.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-[1.35rem] text-rosa-strong leading-tight">{countdown(days)}</span>
        {c.event_at && <span className="text-[12.5px] text-ink-soft">{formatBR(c.event_at.slice(0, 10))}</span>}
      </p>
      <div className="rounded-2xl bg-surface divide-y divide-line overflow-hidden">
        <Stat label="Tarefas" value={`${done} de ${tasks.length}`} ratio={tasks.length ? done / tasks.length : 0} hint={late ? `${late} para já` : tasks.length && done === tasks.length ? 'tudo feito' : 'em dia'} hintTone={late ? 'text-rosa-strong' : undefined} onClick={() => onTab('tarefa')} />
        <Stat label="Convidados" value={people ? `${g.going} de ${people}` : '—'} ratio={people ? g.going / people : 0} hint={people ? `confirmados${guestHint ? ` · ${guestHint}` : ''}` : 'ninguém na lista ainda'} onClick={() => onTab('convidado')} />
        <Stat label="Fornecedores" value={suppliers.length ? `${closed} de ${suppliers.length}` : '—'} ratio={suppliers.length ? closed / suppliers.length : 0} hint={suppliers.length ? `fechados${suppliers.length - closed ? ` · ${suppliers.length - closed} em orçamento` : ''}` : 'nenhum ainda'} onClick={() => onTab('fornecedor')} />
      </div>
      <BudgetCard celebration={c} onEdit={onEditBudget} />
    </div>
  );
}

/** Uma linha do painel: o nome, o número, a barrinha e o recado (sem cortar nada no celular). */
function Stat({ label, value, ratio, hint, hintTone = 'text-ink-mute', onClick }: { label: string; value: string; ratio: number; hint: string; hintTone?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`${label}: ${value}, ${hint}`} className="w-full grid grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-2 text-left transition active:bg-surface-2">
      <span className="text-[13.5px] font-bold text-ink">{label}</span>
      <span className="font-display text-[1.05rem] text-ink tabular">{value}</span>
      <span className="col-span-2 mt-1 block h-1 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
        <span className="block h-full rounded-full bg-rosa transition-[width] duration-500" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </span>
      <span className={`col-span-2 mt-0.5 text-[11.5px] font-semibold ${hintTone}`}>{hint}</span>
    </button>
  );
}

const LEVEL = {
  livre: { bar: 'bg-verde', soft: 'bg-verde/45', text: 'text-verde-strong', badge: 'bg-verde-soft text-verde-strong' },
  perto: { bar: 'bg-coral', soft: 'bg-coral/45', text: 'text-coral-strong', badge: 'bg-coral-soft text-coral-strong' },
  estourou: { bar: 'bg-alert', soft: 'bg-alert/45', text: 'text-alert', badge: 'bg-alert-soft text-alert' },
};

/** A régua do orçamento: pago (cheio), combinado (mais leve) e orçamentos abertos (tracejado), com o recado do que ainda cabe. */
function BudgetCard({ celebration: c, onEdit }: { celebration: Celebration; onEdit: () => void }) {
  const m = budgetMeter(c);
  if (m.planned === null || m.pct === null || m.level === null || m.left === null) {
    return (
      <button type="button" onClick={onEdit} className="w-full rounded-2xl bg-surface px-4 py-3 text-left text-[13px] text-ink-soft">
        {m.quoted > 0 ? `${brl(m.committed)} combinados com fornecedores. ` : ''}
        <span className="font-bold text-rosa">Definir um orçamento previsto ›</span>
      </button>
    );
  }
  const tone = LEVEL[m.level];
  const scale = Math.max(m.planned, m.committed, m.quoted);
  const w = (v: number) => `${(v / scale) * 100}%`;
  const message =
    m.level === 'estourou'
      ? `Passou ${brl(-m.left)} do previsto.`
      : m.level === 'perto'
        ? `Atenção: só ${brl(m.left)} até o limite.`
        : `Ainda dá para gastar ${brl(m.left)}.`;
  return (
    <section className="rounded-2xl bg-surface px-4 py-3" aria-label="Orçamento">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">Orçamento</span>
        <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-extrabold tabular ${tone.badge}`}>{Math.round(m.pct)}%</span>
      </div>
      <p className="mt-0.5 text-[15px] text-ink">
        <span className="font-display text-[1.2rem] tabular">{brl(m.committed)}</span> <span className="text-ink-soft">combinados de {brl(m.planned)}</span>
      </p>
      <div className="relative mt-2 h-2 rounded-full bg-surface-2 overflow-hidden" role="img" aria-label={`${Math.round(m.pct)}% do orçamento previsto`}>
        {m.quoted > m.committed && <span className="absolute inset-y-0 left-0 rounded-full border border-dashed border-ink-mute/50" style={{ width: w(m.quoted) }} />}
        <span className={`absolute inset-y-0 left-0 rounded-full ${tone.soft} transition-[width] duration-500`} style={{ width: w(m.committed) }} />
        <span className={`absolute inset-y-0 left-0 rounded-full ${tone.bar} transition-[width] duration-500`} style={{ width: w(m.paid) }} />
        {scale > m.planned && <span className="absolute inset-y-0 w-0.5 bg-ink/60" style={{ left: w(m.planned) }} aria-hidden />}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-ink-mute">
        <span>
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${tone.bar}`} />
          {brl(m.paid)} pagos
        </span>
        <span>
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${tone.soft}`} />a pagar {brl(m.committed - m.paid)}
        </span>
        {m.open > 0 && <span>em orçamento {brl(m.open)}</span>}
      </p>
      <p className={`mt-1.5 text-[12.5px] font-bold ${tone.text}`} role={m.level === 'livre' ? undefined : 'status'}>
        {message}
        {m.level !== 'estourou' && m.projectedPct !== null && m.projectedPct > 100 && <span className="font-semibold text-ink-soft"> Se fecharem os orçamentos abertos, vai a {Math.round(m.projectedPct)}% do previsto.</span>}
      </p>
    </section>
  );
}

const input = 'w-full rounded-2xl bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-mute outline-none ring-1 ring-line focus:ring-2 focus:ring-rosa/50';
const fit = input.replace('w-full ', '');

/** Valor em reais formatado enquanto digita: "R$ 1.500,00". */
function MoneyInput({ value, onChange, label, placeholder, className = input }: { value: number | null; onChange: (v: number | null) => void; label: string; placeholder: string; className?: string }) {
  return <input inputMode="numeric" aria-label={label} placeholder={placeholder} value={value === null ? '' : brlCents(value)} onChange={e => onChange(moneyFromTyping(e.target.value))} className={className} />;
}

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
  const [budget, setBudget] = useState<number | null>(num(c.budget));
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
          budget,
          notes: c.notes,
        });
        setBusy(false);
      }}
    >
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">{kindOfCelebration(c.kind).label}</p>
      <input aria-label="Nome da celebração" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} className={input} />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input type="date" aria-label="Data" value={date} onChange={e => setDate(e.target.value)} className={input} />
        <input type="time" aria-label="Hora" value={time} onChange={e => setTime(e.target.value)} className={`${fit} shrink-0 w-28`} />
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
      <MoneyInput label="Orçamento previsto" placeholder="Orçamento previsto (R$) — opcional" value={budget} onChange={setBudget} />
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

const WHO: Array<{ id: 'mae' | 'pai' | 'casal'; label: string }> = [
  { id: 'mae', label: 'Mãe' },
  { id: 'pai', label: 'Pai' },
  { id: 'casal', label: 'Os dois' },
];

const NOUN: Record<CelebrationItemKind, { one: string; add: string; title: string; placeholder: string; remove: string }> = {
  tarefa: { one: 'tarefa', add: 'Nova tarefa', title: 'O que fazer', placeholder: 'Ex.: Comprar as lembrancinhas', remove: 'Apagar esta tarefa?' },
  fornecedor: { one: 'fornecedor', add: 'Novo fornecedor', title: 'Fornecedor ou serviço', placeholder: 'Ex.: Bolo da Ju', remove: 'Apagar este fornecedor?' },
  convidado: { one: 'convidado', add: 'Novo convidado', title: 'Nome (ou família)', placeholder: 'Ex.: Tia Bia e Rafa', remove: 'Tirar da lista?' },
  ideia: { one: 'ideia', add: 'Nova ideia', title: 'Ideia', placeholder: 'Decoração, cardápio, brincadeira, lembrancinha…', remove: 'Apagar esta ideia?' },
};

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: Array<{ id: T; label: string }>; value: T | null; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => value !== o.id && onChange(o.id)} className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${value === o.id ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Quantas pessoas: muda na hora na tela e salva quando para de tocar (sem um envio por toque). */
function PeopleStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [n, setN] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const set = (next: number) => {
    const v = Math.min(30, Math.max(1, next));
    setN(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => v !== value && onChange(v), 600);
  };
  return (
    <span className="inline-flex items-center gap-3">
      <span className="text-[13px] font-bold text-ink-soft">Pessoas</span>
      <span className="inline-flex items-center rounded-full bg-surface-2">
        <button type="button" aria-label="Uma pessoa a menos" onClick={() => set(n - 1)} className="w-9 h-9 flex items-center justify-center text-ink-soft">
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-7 text-center font-bold text-ink tabular" aria-label="Quantas pessoas" aria-live="polite">
          {n}
        </span>
        <button type="button" aria-label="Uma pessoa a mais" onClick={() => set(n + 1)} className="w-9 h-9 flex items-center justify-center text-ink-soft">
          <Plus className="w-4 h-4" />
        </button>
      </span>
    </span>
  );
}

/**
 * Uma ficha nova. Fica logo abaixo do botão (no topo da lista) e, quando o
 * teclado sobe, rola para continuar à vista. Um toque duplo não cria duas.
 */
function NewItemForm({ kind, initialTitle = '', onSave, onCancel }: { kind: CelebrationItemKind; initialTitle?: string; onSave: (f: ItemFields) => Promise<boolean>; onCancel: () => void }) {
  const noun = NOUN[kind];
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState('');
  const [who, setWho] = useState<'mae' | 'pai' | 'casal'>('casal');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [status, setStatus] = useState<string>(kind === 'fornecedor' ? 'orcado' : kind === 'convidado' ? 'convidado' : '');
  const [people, setPeople] = useState(1);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const keep = () => formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    titleRef.current?.focus({ preventScroll: true });
    // O teclado leva um instante para abrir: depois disso (e a cada mudança da área visível), o formulário volta à vista.
    const t = window.setTimeout(keep, 320);
    window.visualViewport?.addEventListener('resize', keep);
    return () => {
      window.clearTimeout(t);
      window.visualViewport?.removeEventListener('resize', keep);
    };
  }, []);

  const save = async () => {
    if (sending.current) return;
    if (!title.trim()) return titleRef.current?.focus();
    sending.current = true;
    setBusy(true);
    const ok = await onSave({
      title: title.trim(),
      notes: notes.trim() || null,
      ...(kind === 'tarefa' ? { dueDate: date || null, assignedTo: who } : {}),
      ...(kind === 'fornecedor' ? { contact: contact.trim() || null, amount, status } : {}),
      ...(kind === 'convidado' ? { people, status } : {}),
    });
    sending.current = false;
    setBusy(false);
    if (ok) onCancel();
  };

  return (
    <form
      ref={formRef}
      aria-label={noun.add}
      className="scroll-mt-20 scroll-mb-6 rounded-[22px] bg-surface shadow-soft ring-1 ring-rosa/25 p-3.5 space-y-2.5"
      onSubmit={e => {
        e.preventDefault();
        void save();
      }}
    >
      <input ref={titleRef} aria-label={noun.title} placeholder={noun.placeholder} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} enterKeyHint="done" className={input} />
      {kind === 'tarefa' && (
        <>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span className="shrink-0 font-bold">Prazo</span>
            <input type="date" aria-label="Prazo" value={date} onChange={e => setDate(e.target.value)} className={`${fit} flex-1 min-w-0 py-2`} />
          </label>
          <Chips label="Quem cuida" options={WHO} value={who} onChange={setWho} />
        </>
      )}
      {kind === 'fornecedor' && (
        <>
          <div className="grid grid-cols-[1fr_8.5rem] gap-2">
            <input aria-label="Contato" placeholder="WhatsApp, Instagram…" value={contact} onChange={e => setContact(e.target.value)} maxLength={120} className={`${input} min-w-0`} />
            <MoneyInput label="Valor" placeholder="R$ 0,00" value={amount} onChange={setAmount} className={`${fit} w-full min-w-0`} />
          </div>
          <Chips label="Situação" options={SUPPLIER_OPTIONS} value={status as SupplierStatus} onChange={setStatus} />
        </>
      )}
      {kind === 'convidado' && (
        <>
          <span className="inline-flex items-center gap-3">
            <span className="text-[13px] font-bold text-ink-soft">Pessoas</span>
            <span className="inline-flex items-center rounded-full bg-surface-2">
              <button type="button" aria-label="Uma pessoa a menos" onClick={() => setPeople(n => Math.max(1, n - 1))} className="w-9 h-9 flex items-center justify-center text-ink-soft">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-7 text-center font-bold text-ink tabular" aria-label="Quantas pessoas">
                {people}
              </span>
              <button type="button" aria-label="Uma pessoa a mais" onClick={() => setPeople(n => Math.min(30, n + 1))} className="w-9 h-9 flex items-center justify-center text-ink-soft">
                <Plus className="w-4 h-4" />
              </button>
            </span>
          </span>
          <Chips label="Confirmação" options={GUEST_OPTIONS} value={status as GuestStatus} onChange={setStatus} />
        </>
      )}
      {kind !== 'tarefa' && kind !== 'convidado' && <textarea aria-label="Comentário" placeholder="Comentário (opcional)" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={1} className={`${input} resize-none text-[14px]`} />}
      <div className="flex items-center gap-2 pt-0.5">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-5 py-2 text-[14px] font-extrabold disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Adicionar
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-2 text-[14px] font-bold text-ink-soft">
          Cancelar
        </button>
      </div>
    </form>
  );
}

const SUPPLIER_OPTIONS = (Object.keys(SUPPLIER_STATUS) as SupplierStatus[]).map(id => ({ id, label: SUPPLIER_STATUS[id] }));
const GUEST_OPTIONS = (Object.keys(GUEST_STATUS) as GuestStatus[]).map(id => ({ id, label: GUEST_STATUS[id] }));

/** O comentário de uma ficha: o botão de salvar só aparece quando algo mudou. */
function CommentBox({ value, onSave }: { value: string | null; onSave: (v: string | null) => Promise<boolean> }) {
  const [text, setText] = useState(value ?? '');
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== (value ?? '');
  return (
    <div className="space-y-1.5">
      <textarea aria-label="Comentário" placeholder="Escrever um comentário…" value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={text ? 2 : 1} className={`${input} resize-none text-[14px] py-2`} />
      {dirty && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSave(text.trim() || null);
            setBusy(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-1.5 text-[13px] font-extrabold disabled:opacity-60"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar comentário
        </button>
      )}
    </div>
  );
}

/**
 * Uma ficha: fechada, o essencial; aberta, só os ajustes do dia a dia (que
 * salvam na hora), o comentário e o apagar com confirmação. O nome não muda.
 */
function ItemCard({ item, title, sub, done, onToggle, pill, quick, actions, removeText }: { item: CelebrationItem; title: string; sub?: React.ReactNode; done?: boolean; onToggle?: () => void; pill?: React.ReactNode; quick?: React.ReactNode; actions: CelebrationActions; removeText: string }) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  return (
    <li className={`rounded-2xl bg-surface shadow-soft transition ${open ? 'ring-1 ring-rosa/25' : ''}`}>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        {onToggle && (
          <button type="button" onClick={onToggle} aria-pressed={!!done} aria-label={`${done ? 'Desmarcar' : 'Marcar como feita'}: ${title}`} className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center transition ${done ? 'bg-rosa border-rosa text-white' : 'border-ink-mute/60'}`}>
            {done && <Check className="w-4 h-4" strokeWidth={3} />}
          </button>
        )}
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={`${title}: ${open ? 'fechar' : 'abrir'}`} className="flex-1 min-w-0 text-left">
          <span className={`block text-[14.5px] leading-snug ${done ? 'text-ink-mute line-through' : 'text-ink font-semibold'}`}>{title}</span>
          {sub && <span className="block text-[12px] text-ink-mute">{sub}</span>}
        </button>
        {pill}
        <ChevronDown className={`w-4 h-4 shrink-0 text-ink-mute transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </div>
      {open && (
        <div className="border-t border-line px-3.5 py-3 space-y-3">
          {quick}
          <CommentBox value={item.notes} onSave={notes => actions.updateItem(item.id, { ...itemFieldsOf(item), notes })} />
          {removing ? (
            <span className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="text-ink-soft">{removeText}</span>
              <button type="button" onClick={() => actions.removeItem(item.id)} className="font-extrabold text-alert">
                Apagar
              </button>
              <button type="button" onClick={() => setRemoving(false)} className="font-bold text-ink-soft">
                Não
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

/** A lista de um tipo de ficha, com o "+ Nova…" no topo (perto de onde os olhos estão quando o teclado sobe). */
function ItemList({ celebration: c, kind, actions, children, count, empty, before }: { celebration: Celebration; kind: CelebrationItemKind; actions: CelebrationActions; children: React.ReactNode; count: number; empty?: React.ReactNode; before?: (pick: (title: string) => void) => React.ReactNode }) {
  const [adding, setAdding] = useState<string | null>(null);
  return (
    <section className="space-y-2.5" aria-label={TABS.find(t => t.id === kind)!.label}>
      {adding !== null ? (
        <NewItemForm key={adding} kind={kind} initialTitle={adding} onSave={f => actions.addItem(c.id, kind, f)} onCancel={() => setAdding(null)} />
      ) : (
        <button type="button" onClick={() => setAdding('')} className="w-full flex items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-rosa/40 py-2.5 text-[13.5px] font-bold text-rosa">
          <Plus className="w-4 h-4" /> {NOUN[kind].add}
        </button>
      )}
      {count === 0 && empty}
      {count === 0 && adding === null && before?.(t => setAdding(t))}
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

const pillCls = (on: boolean) => `shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${on ? 'bg-rosa-soft text-rosa-strong' : 'bg-surface-2 text-ink-soft'}`;
const update = (actions: CelebrationActions, i: CelebrationItem, patch: Partial<ItemFields>) => actions.updateItem(i.id, { ...itemFieldsOf(i), ...patch });

function TaskList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const tasks = c.items
    .filter(i => i.kind === 'tarefa')
    .map(i => ({ item: i, due: dueOf(i, c.event_at) }))
    .sort((a, b) => Number(a.item.done) - Number(b.item.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  return (
    <>
      {!c.event_at && <p className="text-[13px] text-ink-soft px-1">Coloquem a data para os prazos aparecerem (eles se ajustam sozinhos se a data mudar).</p>}
      <ItemList celebration={c} kind="tarefa" actions={actions} count={tasks.length}>
        {tasks.map(({ item: t, due }) => {
          const late = isLate(t, c.event_at);
          const relative = t.due_offset != null && !t.due_date ? dueOf(t, c.event_at) : null;
          return (
            <ItemCard
              key={t.id}
              item={t}
              title={t.title}
              done={t.done}
              actions={actions}
              removeText={NOUN.tarefa.remove}
              onToggle={() => update(actions, t, { done: !t.done })}
              sub={
                <>
                  {late && <span className="font-bold text-rosa-strong">Para já · </span>}
                  {[due && !late ? `até ${formatBR(due)}` : null, WHO.find(w => w.id === t.assigned_to)?.label, t.notes].filter(Boolean).join(' · ')}
                </>
              }
              quick={
                <>
                  <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                    <span className="shrink-0 font-bold">Prazo</span>
                    <input
                      type="date"
                      aria-label="Prazo"
                      value={due ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === (due ?? '')) return;
                        void update(actions, t, { dueDate: v || null, dueOffset: null });
                      }}
                      className={`${fit} flex-1 min-w-0 py-2`}
                    />
                  </label>
                  {relative && t.due_offset != null && <p className="text-[12px] text-ink-mute -mt-1.5">{plural(t.due_offset, 'dia', 'dias')} antes da celebração (muda junto com a data)</p>}
                  <Chips label="Quem cuida" options={WHO} value={t.assigned_to ?? 'casal'} onChange={w => update(actions, t, { assignedTo: w })} />
                </>
              }
            />
          );
        })}
      </ItemList>
    </>
  );
}

const whatsapp = (contact: string | null) => {
  const digits = (contact ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : null;
};

function SupplierList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const suppliers = c.items.filter(i => i.kind === 'fornecedor');
  return (
    <ItemList celebration={c} kind="fornecedor" actions={actions} count={suppliers.length} empty={<p className="px-1 text-[13px] text-ink-soft">Bolo, doces, decoração, fotógrafo, espaço… Anotem cada um com o contato e o valor.</p>}>
      {suppliers.map(s => {
        const link = whatsapp(s.contact);
        const status = (s.status ?? 'orcado') as SupplierStatus;
        return (
          <ItemCard
            key={s.id}
            item={s}
            title={s.title}
            actions={actions}
            removeText={NOUN.fornecedor.remove}
            sub={[s.amount ? brlCents(Number(s.amount)) : null, s.notes].filter(Boolean).join(' · ') || undefined}
            pill={<span className={pillCls(status !== 'orcado')}>{SUPPLIER_STATUS[status]}</span>}
            quick={
              <>
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
                <Chips label="Situação" options={SUPPLIER_OPTIONS} value={status} onChange={st => update(actions, s, { status: st })} />
              </>
            }
          />
        );
      })}
    </ItemList>
  );
}

function GuestList({ celebration: c, actions }: { celebration: Celebration; actions: CelebrationActions }) {
  const g = guestsOf(c);
  const diapers = c.kind === 'cha_fraldas' || c.kind === 'cha_bebe';
  // Um pacote por convite (quem não vai fica de fora).
  const invited = g.guests.filter(x => x.status !== 'nao_vai');
  const sizes = diaperFor(invited.map(x => x.id));
  const total = g.going + g.maybe + g.waiting;
  return (
    <>
      <p className="px-1 text-[13px] text-ink-soft">{g.guests.length === 0 ? 'Anotem quem vocês querem por perto. Cada convite pode levar mais de uma pessoa.' : `${plural(total, 'pessoa', 'pessoas')} na lista · ${g.going} confirmadas`}</p>
      <ItemList celebration={c} kind="convidado" actions={actions} count={g.guests.length}>
        {g.guests.map(x => {
          const status = (x.status ?? 'convidado') as GuestStatus;
          const size = sizes.get(x.id);
          return (
            <ItemCard
              key={x.id}
              item={x}
              title={x.title}
              actions={actions}
              removeText={NOUN.convidado.remove}
              sub={[(x.people ?? 1) > 1 ? `${x.people} pessoas` : null, diapers && size ? `fralda ${size}` : null, x.notes].filter(Boolean).join(' · ') || undefined}
              pill={<span className={pillCls(status === 'vai')}>{GUEST_STATUS[status]}</span>}
              quick={
                <>
                  <Chips label="Confirmação" options={GUEST_OPTIONS} value={status} onChange={st => update(actions, x, { status: st })} />
                  <PeopleStepper value={x.people ?? 1} onChange={n => update(actions, x, { people: n })} />
                </>
              }
            />
          );
        })}
      </ItemList>
      {diapers && invited.length > 0 && <DiaperCalculator packs={invited.length} />}
    </>
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
  const ideas = c.items.filter(i => i.kind === 'ideia');
  const starters = ['Painel de fotos da barriga', 'Brincadeira: adivinhe o tamanho da barriga', 'Lembrancinha: sabonete artesanal', 'Livro de recados para o bebê', 'Mesa de doces nas cores do tema'];
  return (
    <ItemList
      celebration={c}
      kind="ideia"
      actions={actions}
      count={ideas.length}
      before={pick => (
        <div className="flex flex-wrap gap-1.5 px-1">
          {starters.map(s => (
            <button key={s} type="button" onClick={() => pick(s)} className="rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft shadow-soft">
              <Lightbulb className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-warm" />
              {s}
            </button>
          ))}
        </div>
      )}
    >
      {ideas.map(i => (
        <ItemCard key={i.id} item={i} title={i.title} sub={i.notes ?? undefined} actions={actions} removeText={NOUN.ideia.remove} />
      ))}
    </ItemList>
  );
}

/** No Início, a partir de 60 dias antes: a contagem e o próximo passo. */
