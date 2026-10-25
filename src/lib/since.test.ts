import { describe, expect, it } from 'vitest';
import type { JournalEntry, Reaction } from '../hooks/useGestationData';
import { reactionKey, sinceParts, weightOnDay } from './since';
import { discoveryOf } from '../content/dailyDiscovery';

const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-20', body: '', visibility: 'shared', remind_on: null, author_role: 'pai', mine: false, created_at: '2026-10-20T15:00:00Z', folder: 'momento', photos: [], ...over });
const base = { dumDate: '2026-05-15', partnerName: 'Caio', checkins: [], hugs: [], reactions: [] as Reaction[], seenReactions: null, reactor: () => 'Lúcia' };

describe('desde a última vez', () => {
  it('o bebê cresceu, a outra pessoa guardou lembranças e a avó abraçou a sua foto (só as reações novas)', () => {
    const old: Reaction = { target_type: 'entry', target_id: 'f', kind: 'festa', author_role: 'familia', author_id: 'v', mine: false };
    const hug: Reaction = { ...old, kind: 'abraco' };
    const parts = sinceParts({
      ...base,
      since: new Date('2026-10-18T12:00:00Z'),
      now: new Date('2026-10-21T12:00:00Z'),
      journal: [entry({ id: '1' }), entry({ id: '2' }), entry({ id: '3', created_at: '2026-10-17T10:00:00Z' }), entry({ id: '4', visibility: 'private' }), entry({ id: 'f', mine: true, author_role: 'mae', photos: [{ id: 'p', thumb: true }] })],
      reactions: [old, hug],
      seenReactions: new Set([reactionKey(old)]),
    });
    expect(parts[0]).toMatch(/^o bebê ganhou cerca de \d+ g$/);
    expect(parts.slice(1)).toEqual(['Caio guardou 2 lembranças', 'Lúcia abraçou sua foto']);
  });

  it('sem nada novo da outra pessoa, conta o humor e os abraços', () => {
    const parts = sinceParts({ ...base, dumDate: '2026-10-01', since: new Date('2026-10-20T12:00:00Z'), now: new Date('2026-10-21T12:00:00Z'), journal: [], checkins: [{ day: '2026-10-21', mood: 'bem', author_role: 'pai', mine: false }], hugs: [{ day: '2026-10-21', toMe: true }] });
    expect(parts).toEqual(['Caio contou como está', 'Caio mandou um abraço']);
  });

  it('o peso cresce sem saltos entre as fases da tabela', () => {
    expect(weightOnDay(20 * 7 + 1)).toBe(300);
    expect(weightOnDay(22 * 7 + 1)).toBe(450);
  });
});

describe('descoberta do dia', () => {
  it('muda todos os dias da semana e avisa a véspera da semana nova', () => {
    const week = Array.from({ length: 7 }, (_, i) => discoveryOf(22 * 7 + 1 + i, 'Helena').text);
    expect(new Set(week).size).toBe(7);
    expect(week[0]).toContain('Helena');
    expect(week[6]).toBe('Amanhã 23 semanas. Tem novidade de Helena chegando no Tumtum.');
    expect(discoveryOf(1, null).text).not.toContain('{');
    expect(discoveryOf(300, null).invite.label).toBeTruthy();
  });
});
