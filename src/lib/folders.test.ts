import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../hooks/useGestationData';
import { bellyWeeks, byMonth, weekOn } from './folders';

const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-15', body: '', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '', folder: 'momento', photos: [], ...over });

describe('fichário', () => {
  it('semana da gestação a partir da DUM', () => {
    expect(weekOn('2026-05-15', '2026-05-15')).toBe(0);
    expect(weekOn('2026-05-15', '2026-10-16')).toBe(22);
  });

  it('agrupa por mês, do mais recente ao mais antigo', () => {
    const groups = byMonth([entry({ id: 'a', entry_date: '2026-09-02' }), entry({ id: 'b', entry_date: '2026-10-15' }), entry({ id: 'c', entry_date: '2026-10-01' })]);
    expect(groups.map(g => g.key)).toEqual(['2026-10', '2026-09']);
    expect(groups[0].items.map(e => e.id)).toEqual(['b', 'c']);
    expect(groups[0].label).toBe('outubro de 2026');
  });

  it('barriguinha: só a pasta barriga, uma linha por semana, da última para a primeira', () => {
    const weeks = bellyWeeks(
      [
        entry({ id: 'a', folder: 'barriga', entry_date: '2026-10-16' }),
        entry({ id: 'b', folder: 'barriga', entry_date: '2026-10-17' }),
        entry({ id: 'c', folder: 'barriga', entry_date: '2026-09-01' }),
        entry({ id: 'd', folder: 'momento', entry_date: '2026-10-16' }),
      ],
      '2026-05-15',
    );
    expect(weeks.map(w => w.week)).toEqual([22, 15]);
    expect(weeks[0].items.map(e => e.id)).toEqual(['a', 'b']);
  });
});
