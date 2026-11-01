import { describe, expect, it } from 'vitest';
import { daysToTest, esperaStage, namesFor, rightGuesses, tally, type Espera } from './espera';

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
