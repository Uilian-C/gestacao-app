import { describe, expect, it } from 'vitest';
import type { FamilyMember } from '../api';
import type { JournalEntry, ThreadComment } from '../hooks/useGestationData';
import { partnerNews } from './news';

const members: FamilyMember[] = [
  { userId: 'a', name: 'Ana Souza', email: '', role: 'mae', me: true },
  { userId: 'c', name: 'Caio Lima', email: '', role: 'pai', me: false },
];
const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-17', body: '', visibility: 'shared', remind_on: null, author_role: 'pai', mine: false, created_at: '2026-10-17T12:00:00Z', folder: 'momento', photos: [], ...over });
const comment = (over: Partial<ThreadComment>): ThreadComment => ({ id: 'c', target_type: 'entry', target_id: 'e', body: '', author_role: 'pai', mine: false, created_at: '2026-10-17T12:00:00Z', ...over });

describe('novidades do Mural', () => {
  const since = new Date('2026-10-17T00:00:00Z');
  it('conta o que a outra pessoa postou e comentou depois da última visita, e as marcações', () => {
    const news = partnerNews(
      [entry({ id: '1', body: 'Olha, @ana!', photos: [{ id: 'f', thumb: true }] }), entry({ id: '2', created_at: '2026-10-16T12:00:00Z' }), entry({ id: '3', mine: true }), entry({ id: '4', visibility: 'private' })],
      [comment({ body: '@Ana linda' }), comment({ id: 'x', mine: true })],
      members,
      since,
    );
    expect(news.entries.map(e => e.id)).toEqual(['1']);
    expect(news.comments).toHaveLength(1);
    expect(news.mentions).toBe(2);
    expect(news.photos).toEqual([{ id: 'f', thumb: true, entryId: '1' }]);
  });
  it('sem visita guardada, olha os últimos 3 dias', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    expect(partnerNews([entry({ created_at: '2026-10-14T12:00:00Z' }), entry({ id: 'n' })], [], members, null, now).entries.map(e => e.id)).toEqual(['n']);
  });
});
