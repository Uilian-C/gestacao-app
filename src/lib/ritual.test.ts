import { describe, expect, it } from 'vitest';
import type { Checkin, JournalEntry } from '../hooks/useGestationData';
import { dayClosed, partnerDay } from './ritual';

const day = '2026-11-01';
const checkin = (over: Partial<Checkin>): Checkin => ({ day, mood: 'bem', author_role: 'mae', mine: true, ...over });
const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: day, body: 'Montei o berço', visibility: 'shared', remind_on: null, author_role: 'pai', mine: false, created_at: `${day}T20:00:00Z`, folder: 'dia', photos: [], ...over });

describe('o Tumtum de hoje', () => {
  it('quem já contou como está hoje não recebe o convite', () => {
    expect(dayClosed('u', day, [], [checkin({})])).toBe(true);
  });
  it('quem escreveu no Dia a dia hoje também não', () => {
    expect(dayClosed('u', day, [entry({ mine: true })], [])).toBe(true);
  });
  it('o registro da outra pessoa ou de ontem não conta como meu', () => {
    expect(dayClosed('u', day, [entry({})], [checkin({ mine: false }), checkin({ day: '2026-10-31' })])).toBe(false);
  });
  it('o que a outra pessoa contou hoje aparece no convite', () => {
    expect(partnerDay([checkin({ mine: false, mood: 'cansada' })], [entry({})], day)).toEqual({ mood: 'cansada', phrase: 'Montei o berço' });
    expect(partnerDay([], [], day)).toBeNull();
  });
});
