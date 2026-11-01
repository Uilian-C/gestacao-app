import { describe, expect, it } from 'vitest';
import { agoText, daysToTest, esperaStage, latestVote, namesFor, OPTION, percents, questionFor, rightCount, rightGuesses, shares, tally, teamsOf, type Espera } from './espera';

const base: Espera = { plan: null, testDate: null, sex: null, knownAt: null, secret: false, secretMine: false, guesses: [] };
const g = (author_role: 'mae' | 'pai' | 'familia', guess: 'menina' | 'menino', mine = false) => ({ user_id: `${author_role}-${guess}`, author_role, guess, mine });

describe('a espera', () => {
  it('cada casal num ponto da jornada', () => {
    expect(esperaStage(base)).toBe('pergunta');
    expect(esperaStage({ ...base, plan: 'descobrir' })).toBe('bolao');
    expect(esperaStage({ ...base, guesses: [g('familia', 'menina')] })).toBe('bolao');
    expect(esperaStage({ ...base, plan: 'surpresa' })).toBe('surpresa');
    expect(esperaStage({ ...base, sex: 'menina' })).toBe('sabem');
    expect(esperaStage({ ...base, secret: true })).toBe('envelope');
    expect(esperaStage({ ...base, secret: true, secretMine: true, sex: 'menino' })).toBe('guardado');
  });
  it('o placar do bolão e quem acertou', () => {
    const e = { ...base, guesses: [g('mae', 'menina', true), g('pai', 'menino'), g('familia', 'menina')] };
    expect(tally(e)).toMatchObject({ menina: 2, menino: 1, family: 1, mae: 'menina', pai: 'menino', mine: 'menina' });
    expect(rightGuesses({ ...e, sex: 'menina' }).map(x => x.author_role)).toEqual(['mae', 'familia']);
    expect(rightGuesses(e)).toEqual([]);
  });
  it('os palpites pelo link entram no placar e no acerto', () => {
    const e = { ...base, guesses: [g('mae', 'menina')], publicVotes: [{ name: 'Bia', guess: 'menina' as const }, { name: 'Léo', guess: 'menino' as const }] };
    expect(tally(e)).toMatchObject({ menina: 2, menino: 1, family: 2 });
    expect(rightCount({ ...e, sex: 'menina' })).toBe(2);
  });
  it('o envelope do chá: ninguém do casal sabe, qualquer um abre', () => {
    expect(esperaStage({ ...base, sealed: true, secret: true })).toBe('envelope');
  });
  it('a contagem para o exame', () => {
    expect(daysToTest({ ...base, testDate: '2026-11-06' }, '2026-11-01')).toBe(5);
    expect(daysToTest({ ...base, testDate: '2026-10-30' }, '2026-11-01')).toBeNull();
    expect(daysToTest({ ...base, testDate: '2026-11-06', sex: 'menina' }, '2026-11-01')).toBeNull();
  });
  it('os nomes que valem para o sexo do bebê', () => {
    const ideas = [{ n: 'Helena', for_sex: 'menina' as const }, { n: 'Theo', for_sex: 'menino' as const }, { n: 'Ariel', for_sex: 'ambos' as const }, { n: 'Sem marca' }];
    expect(namesFor(ideas, 'menina').map(i => i.n)).toEqual(['Helena', 'Ariel', 'Sem marca']);
    expect(namesFor(ideas, null)).toHaveLength(4);
  });
});

describe('o placar do bolão', () => {
  const e: Espera = {
    plan: 'descobrir', testDate: null, sex: null, knownAt: null, secret: false, secretMine: false,
    guesses: [
      { user_id: 'a', author_role: 'mae', guess: 'menina', mine: true, name: 'Ana', at: '2026-11-01 10:00:00+00' },
      { user_id: 'c', author_role: 'pai', guess: 'menino', mine: false, name: 'Caio', at: '2026-11-01 10:05:00+00' },
      { user_id: 'r', author_role: 'familia', guess: 'menina', mine: false, name: 'Rosa', at: '2026-11-01 09:00:00+00' },
    ],
    publicVotes: [{ name: 'Léo', guess: 'menino', at: '2026-11-01 11:00:00+00' }],
  };
  it('os times: o casal primeiro, depois a família e quem votou pelo link', () => {
    expect(teamsOf(e)).toEqual({ menina: ['Você', 'Rosa'], menino: ['Caio', 'Léo'] });
  });
  it('o palpite mais recente', () => {
    expect(latestVote(e)).toMatchObject({ name: 'Léo', guess: 'menino' });
  });
  it('as porcentagens e o tempo desde o palpite', () => {
    expect(shares(8, 5)).toEqual({ menina: 62, menino: 38, total: 13 });
    expect(shares(0, 0)).toEqual({ menina: 50, menino: 50, total: 0 });
    const now = Date.parse('2026-11-01T11:05:00Z');
    expect(agoText('2026-11-01 11:00:00+00', now)).toBe('há 5 min');
    expect(agoText('2026-10-31 11:00:00+00', now)).toBe('ontem');
  });
});

describe('gêmeos', () => {
  const twins: Espera = {
    plan: 'descobrir', testDate: null, sex: null, knownAt: null, secret: false, secretMine: false, babies: 2,
    guesses: [{ user_id: 'a', author_role: 'mae', guess: 'casal', mine: true, name: 'Ana' }],
    publicVotes: [{ name: 'Bia', guess: 'meninas' }, { name: 'Léo', guess: 'casal' }],
  };
  it('três times: duas meninas, um casal, dois meninos', () => {
    const t = tally(twins);
    expect(t.options).toEqual(['meninas', 'casal', 'meninos']);
    expect(t.counts).toEqual({ meninas: 1, casal: 2, meninos: 0 });
    expect(teamsOf(twins)).toEqual({ meninas: ['Bia'], casal: ['Você', 'Léo'], meninos: [] });
    expect(rightCount({ ...twins, sex: 'casal' })).toBe(2);
  });
  it('as porcentagens somam 100', () => {
    expect(percents([1, 2, 0])).toEqual([33, 67, 0]);
    expect(percents([0, 0, 0]).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('os nomes que valem para os gêmeos', () => {
    const ideas = [{ n: 'Helena', for_sex: 'menina' as const }, { n: 'Theo', for_sex: 'menino' as const }, { n: 'Ariel', for_sex: 'ambos' as const }];
    expect(namesFor(ideas, 'meninas').map(i => i.n)).toEqual(['Helena', 'Ariel']);
    expect(namesFor(ideas, 'casal')).toHaveLength(3);
  });
  it('as perguntas e os títulos', () => {
    expect(questionFor(true)).toBe('Meninas, meninos ou um casal?');
    expect(OPTION.casal.title).toBe('É um casal');
  });
});
