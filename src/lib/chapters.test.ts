import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../hooks/useGestationData';
import { buildBook, count, freshChapter, joinPt } from './chapters';

// DUM 2026-05-21: a semana 22 vai de 2026-10-22 a 2026-10-28.
const DUM = '2026-05-21';
const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-16', body: '', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '2026-10-16T12:00:00Z', folder: 'dia', photos: [], ...over });
const base = { dumDate: DUM, today: new Date(2026, 9, 23, 10), reactions: [], threads: [], hugs: [], consultations: [], exams: [] };

describe('palavras', () => {
  it('números viram palavras, no gênero certo', () => {
    expect(count(1, 'lembrança', 'lembranças', true)).toBe('uma lembrança');
    expect(count(7, 'abraço', 'abraços', false)).toBe('sete abraços');
    expect(count(12, 'foto', 'fotos', true)).toBe('12 fotos');
    expect(joinPt(['a', 'b', 'c'])).toBe('a, b e c');
  });
});

describe('buildBook', () => {
  const journal = [
    entry({ id: 'a', body: 'Ouvimos o coração pela primeira vez! Que emoção.', folder: 'momento', photos: [{ id: 'f1', thumb: true }] }),
    entry({ id: 'b', body: 'Querido bebê, já te amamos', folder: 'carta', entry_date: '2026-10-18' }),
    entry({ id: 'c', body: 'Segredo', visibility: 'private', entry_date: '2026-10-19' }),
  ];
  const book = buildBook({
    ...base,
    journal,
    reactions: [
      { target_type: 'entry', target_id: 'a', kind: 'abraco', author_role: 'pai', mine: false },
      { target_type: 'entry', target_id: 'a', kind: 'abraco', author_role: 'familia', mine: false },
    ] as never,
    hugs: [{ day: '2026-10-17', toMe: true }],
    consultations: [{ id: 'k', scheduled_at: '2026-10-20T14:00:00', specialty: 'Obstetrícia', created_by: 'mae', kind: 'ultrassom' }] as never,
  });

  it('um capítulo por semana, do mais novo ao mais antigo, com o de hoje aberto', () => {
    expect(book.map(c => c.week)).toEqual([22, 21]);
    expect(book[0].open).toBe(true);
    expect(book[0].story).toBe('Um capítulo novinho, esperando a primeira lembrança.');
  });

  it('a semana contada como história, sem o que é só de uma pessoa', () => {
    const c = book[1];
    expect(c.entries.map(e => e.id)).toEqual(['b', 'a']);
    expect(c.title).toBe('Ouvimos o coração pela primeira vez!');
    expect(c.story).toBe('Uma semana de duas lembranças e uma foto. Vocês trocaram três abraços, foram a um ultrassom e escreveram a primeira carta para o bebê.');
    expect(c.cover?.entryId).toBe('a');
    expect(c.highlight).toEqual({ entryId: 'b', quote: 'Querido bebê, já te amamos', hugged: false });
  });

  it('semana sem nada é uma semana quieta, sem cobrança', () => {
    const quiet = buildBook({ ...base, journal: [entry({ entry_date: '2026-10-01' })] });
    expect(quiet.find(c => c.week === 20)?.story).toBe('Uma semana quieta. Às vezes o melhor é só viver.');
  });

  it('o capítulo que fechou aparece no Mural só nos primeiros dias da semana seguinte', () => {
    expect(freshChapter(book, DUM, new Date(2026, 9, 23))?.week).toBe(21);
    expect(freshChapter(book, DUM, new Date(2026, 9, 26))).toBeNull();
  });
});
