import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../hooks/useGestationData';
import { bookMonths, buildBook, freshChapter, joinPt } from './chapters';

// DUM 2026-05-21: a semana 22 vai de 2026-10-22 a 2026-10-28.
const DUM = '2026-05-21';
const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-16', body: '', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '2026-10-16T12:00:00Z', folder: 'dia', photos: [], ...over });
const base = { dumDate: DUM, today: new Date(2026, 9, 23, 10), reactions: [], threads: [], hugs: [], consultations: [], exams: [] };

describe('palavras', () => {
  it('junta como se fala', () => {
    expect(joinPt(['a', 'b', 'c'])).toBe('a, b e c');
    expect(joinPt(['a'])).toBe('a');
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
    expect(c.story).toBe('Uma semana que ficou guardada. Teve um momento daqueles que a gente não esquece, a primeira carta para o bebê, uma foto nova, uma ida ao ultrassom e abraços trocados.');
    expect(c.story).not.toMatch(/\d/);
    expect(c.baby).toBe('Do tamanho de uma manga');
    expect(c.nudge).toBe('A barriga ainda não apareceu no livro. Uma foto de lado já é um começo lindo.');
    expect(c.cover?.entryId).toBe('a');
    expect(c.highlight).toEqual({ entryId: 'b', quote: 'Querido bebê, já te amamos', hugged: false });
  });

  it('compara com a semana anterior e conta o humor com carinho', () => {
    const busy = [1, 2, 3, 4].map(i => entry({ id: `w${i}`, entry_date: '2026-10-09', folder: 'ideia', body: 'Ideia para o quarto' }));
    const calm = buildBook({ ...base, journal: [...busy, entry({ id: 'x', entry_date: '2026-10-16', body: 'Dia tranquilo' })], checkins: [{ day: '2026-10-17', mood: 'cansada', author_role: 'mae', mine: true }] });
    const w21 = calm.find(c => c.week === 21)!;
    expect(w21.story).toBe('Mais tranquila que a semana passada: às vezes é disso que precisamos. O cansaço apareceu: que a próxima traga descanso.');
    expect(calm.find(c => c.week === 20)!.nudge).toBe('A primeira carta para o bebê ainda está esperando por vocês.');
    const more = buildBook({ ...base, journal: [entry({ id: 'y', entry_date: '2026-10-09' }), ...busy.map(e => ({ ...e, entry_date: '2026-10-16' }))] });
    expect(more.find(c => c.week === 21)!.story).toMatch(/^(Uma semana com mais emoções|A semana mais cheia|Vocês viveram mais)/);
  });

  it('semana sem nada é uma semana quieta, sem cobrança', () => {
    const quiet = buildBook({ ...base, journal: [entry({ entry_date: '2026-10-01' })] });
    expect(quiet.find(c => c.week === 20)?.story).toBe('Uma semana quieta. Às vezes o melhor é só viver.');
  });

  it('o capítulo que fechou aparece no Mural só nos primeiros dias da semana seguinte', () => {
    expect(freshChapter(book, DUM, new Date(2026, 9, 23))?.week).toBe(21);
    expect(freshChapter(book, DUM, new Date(2026, 9, 26))).toBeNull();
  });

  it('agrupa as semanas em capítulos por mês, do mais novo ao mais antigo', () => {
    const months = bookMonths(buildBook({ ...base, journal: [entry({ id: 'm', entry_date: '2026-09-12', folder: 'momento', body: 'Contamos para a família' }), ...journal] }));
    expect(months.map(m => [m.month, m.pages.map(p => p.week)])).toEqual([
      [5, [18, 19, 20, 21, 22]],
      [4, [16, 17]],
    ]);
    expect(months[0]).toMatchObject({ name: 'O quinto mês', title: 'Os primeiros chutinhos', open: true });
    expect(months[1].story).toBe('Um mês cheio de histórias. Teve um momento para guardar para sempre.');
    expect(months[1].story).not.toMatch(/\d/);
  });
});
