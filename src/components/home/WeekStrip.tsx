import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { buildCalendar, dayDots, gestationDay, type CalendarMoment, type CalendarResult } from '../../lib/calendar';
import type { Celebration } from '../../lib/celebrations';
import { toISODate } from '../../lib/dates';
import type { Consultation, PartnerTask } from '../../types';

// O atalho do Início para o calendário: a data de hoje e a semana em sete
// bolinhas, com um ponto onde há algo marcado e um fio na cor do trimestre.
// Tocar num dia abre o calendário já com a folha daquele dia; "Calendário"
// abre o calendário no mês de hoje, sem abrir nenhum dia.

const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const TRI_LINE = { 1: 'bg-rosa', 2: 'bg-lilas', 3: 'bg-azul' } as const;

export default function WeekStrip({ now, dumDate, consultations, tasks, journal, results, celebrations, note, onOpen }: { now: Date; dumDate: string; consultations: Consultation[]; tasks: PartnerTask[]; journal: CalendarMoment[]; results: CalendarResult[]; celebrations?: Celebration[] | null; note?: ReactNode; onOpen: (day: string | null) => void }) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = toISODate(today);
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + i));
  const cal = buildCalendar({ dumDate, consultations, results, tasks, symptoms: [], metrics: [], journal, celebrations, today });
  return (
    <section aria-label="Esta semana no calendário" className="-mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="min-w-0 truncate text-sm text-ink-soft first-letter:uppercase">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <button type="button" onClick={() => onOpen(null)} className="shrink-0 inline-flex items-center text-[12.5px] font-bold text-brand-strong">
          Calendário <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === todayIso;
          const g = gestationDay(dumDate, iso);
          const { dots } = dayDots(cal.events.get(iso) ?? [], 'tudo', 2);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onOpen(iso)}
              aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', hoje' : ''}: abrir no calendário`}
              className={`relative flex flex-col items-center rounded-2xl pt-1.5 pb-2 transition active:scale-95 ${isToday ? 'bg-brand text-on-accent shadow-soft' : 'text-ink hover:bg-surface/70'}`}
            >
              <span className={`text-[10.5px] font-extrabold ${isToday ? 'opacity-90' : 'text-ink-mute'}`}>{LETTERS[i]}</span>
              <span className="text-[15px] font-semibold tabular leading-tight">{d.getDate()}</span>
              <span className="mt-0.5 flex gap-[3px] h-1.5" aria-hidden>
                {dots.map(c => (
                  <span key={c} className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-on-accent' : c}`} />
                ))}
              </span>
              {g && g.daysToDpp >= 0 && !isToday && <span className={`absolute bottom-0.5 inset-x-3 h-[2px] rounded-full opacity-40 ${TRI_LINE[g.trimester]}`} aria-hidden />}
            </button>
          );
        })}
      </div>
      {note && <p className="px-1 text-[12.5px] text-ink-mute truncate">{note}</p>}
    </section>
  );
}
