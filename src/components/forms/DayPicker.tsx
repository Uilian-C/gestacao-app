import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CalendarDays } from 'lucide-react';
import { formatBR, parseLocalDate, toISODate, weekOfDay } from '../../lib/dates';
import { inputClass } from '../styles';

// "Quando?" dos formulários: atalhos de um toque (hoje, ontem...) e, se
// precisar, um dia qualquer no calendário do celular. Mostra a semana da
// gestação do dia escolhido, que é a semana em que o registro entra.

const shift = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/**
 * past: registros que já aconteceram (sintoma, medição, diário) — hoje, ontem, anteontem ou outro dia, nunca no futuro.
 * due: prazo de tarefa — sem prazo, hoje, amanhã, em uma semana ou outro dia.
 */
export default function DayPicker({ value, onChange, mode = 'past', dumDate, label = 'Quando', choices, fieldLabel }: { value: string; onChange: (iso: string) => void; mode?: 'past' | 'due'; dumDate?: string; label?: string; choices?: Array<{ iso: string; text: string }>; fieldLabel?: string }) {
  const today = toISODate(new Date());
  const shortcuts: Array<{ iso: string; text: string }> = choices ?? (
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
        ]);
  const custom = !shortcuts.some(s => s.iso === value);
  const [open, setOpen] = useState(false);
  const showField = open || (custom && value !== '');
  const field = useRef<HTMLInputElement>(null);
  const chip = 'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition';

  // Mostra o campo de data e, onde o navegador deixa (Android, Chrome, Safari
  // recente), já abre o calendário. Senão, basta tocar no campo.
  const openCalendar = () => {
    flushSync(() => setOpen(true));
    const el = field.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    try {
      el.showPicker?.();
    } catch {
      // Sem showPicker: o campo visível resolve.
    }
  };

  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-ink-soft">
        <span>{label}</span>
        {value && dumDate && <span className="text-xs font-bold text-brand-strong">semana {weekOfDay(dumDate, value)}</span>}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {shortcuts.map(s => (
          <button
            key={s.text}
            type="button"
            aria-pressed={value === s.iso}
            onClick={() => {
              setOpen(false);
              onChange(s.iso);
            }}
            className={`${chip} ${value === s.iso ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
          >
            {s.text}
          </button>
        ))}
        <button type="button" aria-pressed={custom} aria-expanded={showField} onClick={openCalendar} className={`${chip} inline-flex items-center gap-1.5 ${custom ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}>
          <CalendarDays className="w-3.5 h-3.5" aria-hidden />
          {custom && value ? formatBR(value) : 'Outro dia'}
        </button>
      </div>
      {/* Campo de data visível: no iPhone o calendário só abre tocando nele. */}
      {showField && (
        <input
          ref={field}
          type="date"
          aria-label={fieldLabel ?? (mode === 'past' ? 'Escolher o dia' : 'Escolher o prazo')}
          className={`${inputClass} min-h-12 appearance-none text-base`}
          value={value}
          max={mode === 'past' ? today : undefined}
          min={mode === 'past' ? dumDate : today}
          onChange={e => e.target.value && onChange(e.target.value)}
        />
      )}
    </fieldset>
  );
}
