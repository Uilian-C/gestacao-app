import { Bell } from 'lucide-react';
import { reminderLabel } from '../../lib/reminders';
import { inputClass } from '../styles';
import DayPicker from './DayPicker';

// Lembrete: o dia (atalhos ou calendário) e, com a migração 018, a hora.

const TIMES = [
  { time: '08:00', text: '8h' },
  { time: '12:00', text: '12h' },
  { time: '19:00', text: '19h' },
];

export default function ReminderPicker({ day, time, onDay, onTime, choices, withTime, who }: {
  day: string;
  time: string;
  onDay: (iso: string) => void;
  onTime: (time: string) => void;
  choices: Array<{ iso: string; text: string }>;
  /** A migração 018 já rodou: dá para escolher a hora. Sem ela, o aviso sai às 8h. */
  withTime: boolean;
  /** Para quem vai o aviso: "você", "vocês dois" ou o nome ("Caio"). */
  who: string;
}) {
  const chip = 'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold transition';
  const custom = !TIMES.some(t => t.time === time);
  return (
    <div className="space-y-2">
      <DayPicker mode="due" label="Lembrete" fieldLabel="Dia do lembrete" value={day} onChange={onDay} choices={choices} />
      {day && withTime && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Hora do lembrete">
          {TIMES.map(t => (
            <button key={t.time} type="button" aria-pressed={time === t.time} onClick={() => onTime(t.time)} className={`${chip} ${time === t.time ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}>
              {t.text}
            </button>
          ))}
          <input type="time" aria-label="Outra hora" value={time} onChange={e => e.target.value && onTime(e.target.value)} className={`${inputClass} !w-auto !py-1.5 text-sm ${custom ? 'ring-2 ring-brand' : ''}`} />
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-ink-mute">
        <Bell className="w-3.5 h-3.5 shrink-0" />
        {day ? `${who === 'você' ? 'Seu celular avisa' : who === 'vocês dois' ? 'Os celulares de vocês avisam' : `O celular de ${who} avisa`} em ${reminderLabel(day, withTime ? time : '08:00')}.` : 'Sem aviso no celular.'}
      </p>
    </div>
  );
}
