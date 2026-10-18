import { describe, expect, it } from 'vitest';
import { reminderAt, reminderDay, reminderLabel, reminderTime } from './reminders';

describe('lembrete com hora', () => {
  it('dia e hora do celular viram um instante e voltam iguais', () => {
    const at = reminderAt('2026-10-20', '19:30');
    expect(at).toBe('2026-10-20T22:30:00.000Z'); // São Paulo, UTC-3
    expect(reminderTime(at)).toBe('19:30');
    expect(reminderDay(at)).toBe('2026-10-20');
    expect(reminderTime(null)).toBe('08:00');
  });
  it('escreve o lembrete', () => {
    expect(reminderLabel('2026-10-20', '19:30')).toBe('20/10, às 19h30');
    expect(reminderLabel('2026-10-20', '08:00')).toBe('20/10, às 8h');
  });
});
