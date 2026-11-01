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

import { countdownTitle, nextCountdown } from './countdown';
import type { Celebration } from './celebrations';
import type { Consultation } from '../types';

describe('a contagem para os marcos', () => {
  const today = new Date(2026, 9, 25, 10, 0);
  const at = (day: string) => new Date(`${day}T09:00:00`).toISOString();
  const c = (over: Partial<Consultation>): Consultation => ({ id: 'u', scheduled_at: at('2026-10-28'), specialty: 'ultrassom', created_by: 'mae', kind: 'ultrassom', title: 'Ultrassom morfológico', ...over });
  it('o morfológico daqui a 3 dias, com o rostinho', () => {
    const n = nextCountdown({ consultations: [c({})], dpp: null, babyName: null, today })!;
    expect(countdownTitle(n)).toBe('Faltam 3 dias para o morfológico');
    expect(n.why).toBe('vocês vão ver o rostinho');
    expect(n.progress).toBeGreaterThan(0.8);
  });
  it('fora da janela, nada; a chegada do bebê nos últimos 30 dias', () => {
    expect(nextCountdown({ consultations: [c({ scheduled_at: at('2026-12-30') })], dpp: null, babyName: null, today })).toBeNull();
    const n = nextCountdown({ consultations: [], dpp: new Date(2026, 10, 4), babyName: 'Helena', today })!;
    expect(countdownTitle(n)).toBe('Faltam 10 dias para a chegada de Helena');
  });
  it('a celebração mantém o nome como foi escrito ("o chá da Helena")', () => {
    const party = { id: 'p1', title: 'Chá da Helena', event_at: at('2026-10-31'), created_at: at('2026-10-01') } as unknown as Celebration;
    const n = nextCountdown({ consultations: [], celebrations: [party], dpp: null, babyName: null, today })!;
    expect(countdownTitle(n)).toBe('Faltam 6 dias para o chá da Helena');
  });
});
