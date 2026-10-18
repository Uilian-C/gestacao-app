import { parseTimestamp, toISODate } from './dates';

// Lembrete com dia e hora. O servidor guarda o instante (remind_at) e, para as
// listas e para quem ainda não tem a migração 018, o dia (remind_on).

export const DEFAULT_REMINDER_TIME = '08:00';

/** "2026-10-20" + "19:30" no horário do celular → instante (ISO). */
export const reminderAt = (day: string, time: string) => new Date(`${day}T${time || DEFAULT_REMINDER_TIME}:00`).toISOString();

/** A hora ("19:30") de um lembrete guardado; sem hora, a padrão. */
export function reminderTime(at: string | null | undefined): string {
  if (!at) return DEFAULT_REMINDER_TIME;
  const d = parseTimestamp(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** O dia ("2026-10-20") de um lembrete guardado, no horário do celular. */
export const reminderDay = (at: string) => toISODate(parseTimestamp(at));

/** "19h30" (ou só "8h"). */
export function timeLabel(time: string) {
  const [h, min] = time.split(':');
  return `${Number(h)}h${min === '00' ? '' : min}`;
}

/** "20/10, às 19h30" (ou só "20/10, às 8h"). */
export const reminderLabel = (day: string, time: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}, às ${timeLabel(time)}`;
