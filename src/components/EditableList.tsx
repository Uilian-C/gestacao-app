import { useState } from 'react';
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { inputClass } from './styles';
import { Button } from './ui';

// Peças das listas editáveis (mala e jornada): cada linha tem um "⋯" com as
// ações dela. Item do casal: renomear e apagar. Item da lista padrão: ocultar
// ("não se aplica a nós"), com volta pela lista de ocultos.

export interface RowActions {
  /** Item do casal: pode renomear e apagar. */
  custom?: { title: string; onRename: (title: string) => Promise<boolean>; onDelete: () => void };
  /** Item da lista padrão: pode ocultar. */
  onHide?: () => void;
}

export function MenuButton({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-label={`Opções de "${label}"`} className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition ${open ? 'bg-surface-2 text-ink' : 'text-ink-mute hover:text-ink hover:bg-surface-2'}`}>
      <MoreHorizontal className="w-4 h-4" />
    </button>
  );
}

export function RowMenu({ actions, onDone }: { actions: RowActions; onDone: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(actions.custom?.title ?? '');

  if (actions.custom && renaming) {
    return (
      <form
        className="flex gap-2 pb-2"
        onSubmit={async e => {
          e.preventDefault();
          if (title.trim() && (await actions.custom!.onRename(title.trim()))) onDone();
        }}
      >
        <input autoFocus aria-label="Novo nome do item" className={`${inputClass} !py-2 text-sm`} value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
        <Button type="submit" tone="soft" disabled={!title.trim()} className="!px-4 !py-2 shrink-0">Salvar</Button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 pb-2 pl-8">
      {actions.custom && (
        <>
          <button type="button" onClick={() => setRenaming(true)} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink-soft hover:text-ink">
            <Pencil className="w-3.5 h-3.5" /> Renomear
          </button>
          <button
            type="button"
            onClick={() => {
              actions.custom!.onDelete();
              onDone();
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-alert hover:bg-alert-soft"
          >
            <Trash2 className="w-3.5 h-3.5" /> Apagar
          </button>
        </>
      )}
      {actions.onHide && (
        <button
          type="button"
          onClick={() => {
            actions.onHide!();
            onDone();
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink-soft hover:text-ink"
        >
          <EyeOff className="w-3.5 h-3.5" /> Não se aplica a nós
        </button>
      )}
    </div>
  );
}

/** Campo para pôr um item novo na lista (com semana opcional, na jornada). */
export function AddItem({ placeholder, withWeek = false, disabled, onAdd }: { placeholder: string; withWeek?: boolean; disabled?: boolean; onAdd: (title: string, week: number | null) => Promise<boolean> }) {
  const [title, setTitle] = useState('');
  const [week, setWeek] = useState('');
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 py-2 text-sm font-bold text-brand-strong hover:underline underline-offset-4 disabled:opacity-50">
        <Plus className="w-4 h-4" /> Adicionar item
      </button>
    );
  }
  return (
    <form
      className="flex flex-wrap gap-2 pt-2"
      onSubmit={async e => {
        e.preventDefault();
        const w = week.trim() ? Number(week) : null;
        if (!title.trim() || (w !== null && !(w >= 1 && w <= 42))) return;
        if (await onAdd(title.trim(), w)) {
          setTitle('');
          setWeek('');
          setOpen(false);
        }
      }}
    >
      <input autoFocus aria-label="Novo item" className={`${inputClass} !py-2 text-sm flex-1 min-w-[160px]`} placeholder={placeholder} value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
      {withWeek && <input aria-label="Semana (opcional)" inputMode="numeric" className={`${inputClass} !py-2 text-sm !w-24`} placeholder="Semana" value={week} onChange={e => setWeek(e.target.value.replace(/\D/g, '').slice(0, 2))} />}
      <Button type="submit" tone="soft" disabled={disabled || !title.trim()} className="!px-4 !py-2">Adicionar</Button>
      <Button tone="ghost" onClick={() => setOpen(false)} className="!px-3 !py-2">Cancelar</Button>
    </form>
  );
}

/** Itens da lista padrão que o casal ocultou, com a volta a um toque. */
export function HiddenItems({ items, onShow }: { items: Array<{ id: string; label: string }>; onShow: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <details className="mt-4 rounded-2xl bg-surface-2/60 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Itens ocultos ({items.length})</summary>
      <ul className="mt-2 space-y-1">
        {items.map(i => (
          <li key={i.id} className="flex items-center justify-between gap-2 text-sm text-ink-mute">
            <span className="min-w-0">{i.label}</span>
            <button type="button" onClick={() => onShow(i.id)} className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-brand-strong hover:bg-brand-soft">
              <Eye className="w-3.5 h-3.5" /> Mostrar
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
