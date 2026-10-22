import { useContext, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { BabyNameContext } from '../lib/baby';

// O nome do bebê: um convite enquanto não escolheram ("Já escolheram o
// nome?"); depois, o nome com um lápis para trocar. Vale para o app todo.

export default function BabyNameSetting({ onSave, invite = 'Já escolheram o nome? Ele vai para a capa do livro e para o app todo.', className = '' }: { onSave: (name: string | null) => Promise<boolean> | void; invite?: string; className?: string }) {
  const name = useContext(BabyNameContext);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? '');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return name ? (
      <button type="button" onClick={() => (setValue(name), setEditing(true))} aria-label={`Nome do bebê: ${name}. Trocar`} className={`inline-flex items-center gap-1.5 text-[13px] font-bold text-rosa-strong ${className}`}>
        <Pencil className="w-3.5 h-3.5" /> {name}
      </button>
    ) : (
      <button type="button" onClick={() => setEditing(true)} className={`block text-left text-[13px] font-bold text-rosa-strong ${className}`}>
        {invite} ›
      </button>
    );
  }
  return (
    <form
      aria-label="Nome do bebê"
      className={`flex items-center gap-2 ${className}`}
      onSubmit={async e => {
        e.preventDefault();
        setSaving(true);
        const ok = await onSave(value.trim() || null);
        setSaving(false);
        if (ok !== false) setEditing(false);
      }}
    >
      <input autoFocus aria-label="Nome do bebê" placeholder="O nome do bebê" value={value} onChange={e => setValue(e.target.value)} maxLength={40} className="flex-1 min-w-0 rounded-full bg-surface px-4 py-2 text-[15px] text-ink placeholder:text-ink-mute outline-none ring-1 ring-line focus:ring-2 focus:ring-rosa/50" />
      <button type="submit" disabled={saving} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rosa text-white px-4 py-2 text-[13.5px] font-extrabold disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
      </button>
      <button type="button" onClick={() => setEditing(false)} className="shrink-0 px-2 text-[13px] font-bold text-ink-soft">
        Cancelar
      </button>
    </form>
  );
}
