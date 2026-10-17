import { CalendarDays } from 'lucide-react';
import { formatBR, parseLocalDate, toISODate, weekOfDay } from '../../lib/dates';

// "Quando?" dos formulários: atalhos de um toque (hoje, ontem...) e, se
// precisar, um dia qualquer no calendário. Mostra a semana da gestação do dia
// escolhido, que é a semana em que o registro entra.

const shift = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/**
 * past: registros que já aconteceram (sintoma, medição, diário) — hoje, ontem, anteontem ou outro dia, nunca no futuro.
 * due: prazo de tarefa — sem prazo, hoje, amanhã, em uma semana ou outro dia.
 */
export default function DayPicker({ value, onChange, mode = 'past', dumDate, label = 'Quando' }: { value: string; onChange: (iso: string) => void; mode?: 'past' | 'due'; dumDate?: string; label?: string }) {
  const today = toISODate(new Date());
  const shortcuts: Array<{ iso: string; text: string }> =
    mode === 'past'
      ? [
          { iso: today, text: 'Hoje' },
          { iso: shift(today, -1), text: 'Ontem' },
          { iso: shift(today, -2), text: 'Anteontem' },
        ]
      : [
          { iso: '', text: 'Sem prazo' },
          { iso: today, text: 'Hoje' },
          { iso: shift(today, 1), text: 'Amanhã' },
          { iso: shift(today, 7), text: 'Em 1 semana' },
        ];
  const custom = !shortcuts.some(s => s.iso === value);
  const chip = 'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition';

  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-ink-soft">
        <span>{label}</span>
        {value && dumDate && <span className="text-xs font-bold text-brand-strong">semana {weekOfDay(dumDate, value)}</span>}
      </legend>
      <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar">
        {shortcuts.map(s => (
          <button key={s.text} type="button" aria-pressed={value === s.iso} onClick={() => onChange(s.iso)} className={`${chip} ${value === s.iso ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}>
            {s.text}
          </button>
        ))}
        <label className={`${chip} relative inline-flex items-center gap-1.5 cursor-pointer ${custom ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}>
          <CalendarDays className="w-3.5 h-3.5" aria-hidden />
          {custom && value ? formatBR(value) : 'Outro dia'}
          {/* O seletor de data do próprio celular, por cima do botão. */}
          <input
            type="date"
            aria-label={mode === 'past' ? 'Escolher o dia' : 'Escolher o prazo'}
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={value}
            max={mode === 'past' ? today : undefined}
            min={mode === 'past' ? dumDate : today}
            onChange={e => e.target.value && onChange(e.target.value)}
          />
        </label>
      </div>
    </fieldset>
  );
}
