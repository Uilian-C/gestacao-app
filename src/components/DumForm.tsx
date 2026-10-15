import { useState } from 'react';
import { toISODate } from '../lib/dates';
import { inputClass } from './styles';
import { Button } from './ui';

export function DumForm({ initial, onSave, onCancel }: { initial?: string; onSave: (iso: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(initial ?? '');
  const today = toISODate(new Date());
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (value) onSave(value);
      }}
      className="flex flex-col sm:flex-row sm:items-end gap-3 bg-surface rounded-2xl p-4"
    >
      <div className="flex-1 space-y-1.5">
        <label htmlFor="dum" className="text-sm font-semibold text-ink-soft block">Data da última menstruação (DUM)</label>
        <input id="dum" type="date" required max={today} value={value} onChange={e => setValue(e.target.value)} className={inputClass} />
        <p className="text-xs text-ink-mute">Se o obstetra corrigiu a idade gestacional pelo ultrassom, use a DUM corrigida.</p>
      </div>
      <div className="flex gap-2">
        {onCancel && <Button tone="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit">Salvar DUM</Button>
      </div>
    </form>
  );
}
