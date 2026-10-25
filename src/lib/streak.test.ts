import { describe, expect, it } from 'vitest';
import type { Checkin } from '../hooks/useGestationData';
import { togetherRun, togetherWeek, welcomeBack } from './streak';
import { firstTimesAlbum, nextFirstTime } from './firstTimes';
import type { JournalEntry } from '../hooks/useGestationData';

const both = (day: string): Checkin[] => [
  { day, mood: 'bem', author_role: 'mae', mine: true },
  { day, mood: 'bem', author_role: 'pai', mine: false },
];
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-10-${String(from + i).padStart(2, '0')}`);

describe('a sequência gentil', () => {
  it('a semana inteira com os dois contando ganha o coração; faltou um dia, não', () => {
    const all = days(10, 16).flatMap(both);
    expect(togetherWeek(all, ['mae', 'pai'], '2026-10-10', '2026-10-16')).toBe(true);
    const gap = all.filter(c => !(c.day === '2026-10-13' && c.author_role === 'pai'));
    expect(togetherWeek(gap, ['mae', 'pai'], '2026-10-10', '2026-10-16')).toBe(false);
    expect(togetherWeek(all, [], '2026-10-10', '2026-10-16')).toBe(false);
  });
  it('conta os dias seguidos até hoje (ou até ontem, se hoje ainda falta alguém)', () => {
    const c = days(18, 21).flatMap(both);
    expect(togetherRun(c, ['mae', 'pai'], '2026-10-21')).toBe(4);
    expect(togetherRun(c, ['mae', 'pai'], '2026-10-22')).toBe(4);
    expect(togetherRun(c, ['mae', 'pai'], '2026-10-24')).toBe(0);
  });
  it('quem volta depois de 3 dias é recebido com carinho', () => {
    expect(welcomeBack(both('2026-10-18'), '2026-10-21')).toBe(true);
    expect(welcomeBack(both('2026-10-19'), '2026-10-21')).toBe(false);
    expect(welcomeBack([], '2026-10-21')).toBe(false);
  });
});

describe('as primeiras vezes', () => {
  const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-10', body: '', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '2026-10-10T10:00:00Z', folder: 'momento', photos: [], ...over });
  it('começa com a descoberta marcada; o nome e a barriga se marcam pelo que já aconteceu', () => {
    const album = firstTimesAlbum([entry({ id: 'b', folder: 'barriga' }), entry({ id: 'c', first_time: 'coracao', entry_date: '2026-09-01' }), entry({ id: 'c2', first_time: 'coracao' })], 'Helena');
    const by = Object.fromEntries(album.map(c => [c.ft.id, c]));
    expect(by.descoberta).toMatchObject({ done: true, auto: true, entry: null });
    expect(by.nome.done).toBe(true);
    expect(by.barriga.entry?.id).toBe('b');
    expect(by.coracao.entry?.id).toBe('c');
    expect(by.chute.done).toBe(false);
    expect(nextFirstTime(album, 10)?.ft.id).toBe('contar');
  });
});
