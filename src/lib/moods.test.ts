import { describe, expect, it } from 'vitest';
import type { Checkin, Mood } from '../hooks/useGestationData';
import { moodCounts, moodTrends, needsCare } from './moods';

const c = (day: string, mood: Mood, author_role: 'mae' | 'pai' = 'mae'): Checkin => ({ day, mood, author_role, mine: author_role === 'mae' });

describe('humor', () => {
  it('conta os dias de cada humor no período, por pessoa', () => {
    const counts = moodCounts([c('2026-10-01', 'bem'), c('2026-10-02', 'bem'), c('2026-10-03', 'cansada'), c('2026-09-30', 'bem'), c('2026-10-01', 'otima', 'pai')], 'mae', '2026-10-01', '2026-10-31');
    expect(counts).toEqual({ otima: 0, bem: 2, cansada: 1, enjoada: 0, ansiosa: 0 });
  });
  it('aponta o que aumentou nas últimas 2 semanas', () => {
    const now = ['2026-10-18', '2026-10-16', '2026-10-14', '2026-10-12', '2026-10-10'].map(d => c(d, 'cansada'));
    const prev = [c('2026-10-01', 'cansada')];
    expect(moodTrends([...now, ...prev], 'mae', '2026-10-18')).toEqual([{ mood: 'cansada', now: 5, prev: 1 }]);
    expect(moodTrends(prev, 'mae', '2026-10-18')).toEqual([]);
  });
  it('ansiedade em 5 dos últimos 7 dias pede cuidado', () => {
    const days = ['2026-10-18', '2026-10-17', '2026-10-16', '2026-10-14', '2026-10-12'];
    expect(needsCare(days.map(d => c(d, 'ansiosa')), 'mae', '2026-10-18')).toBe(true);
    expect(needsCare(days.slice(0, 4).map(d => c(d, 'ansiosa')), 'mae', '2026-10-18')).toBe(false);
  });
});
