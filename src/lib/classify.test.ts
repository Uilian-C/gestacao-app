import { describe, expect, it } from 'vitest';
import { guessFolder } from './classify';

describe('guessFolder', () => {
  it('na dúvida, o dia a dia', () => {
    expect(guessFolder('Dia tranquilo, muita vontade de manga')).toBe('dia');
    expect(guessFolder('Hoje me senti cansada')).toBe('dia');
    expect(guessFolder('')).toBe('dia');
  });
  it('as primeiras vezes e as notícias são momentos', () => {
    expect(guessFolder('Ouvimos o coração pela primeira vez!')).toBe('momento');
    expect(guessFolder('Hoje o bebê chutou forte')).toBe('momento');
    expect(guessFolder('Contamos para a família no almoço')).toBe('momento');
    expect(guessFolder('Descobrimos: é menina!')).toBe('momento');
    expect(guessFolder('Primeiro ultrassom, que emoção')).toBe('momento');
  });
  it('falar com o bebê é carta', () => {
    expect(guessFolder('Querido bebê, hoje...')).toBe('carta');
    expect(guessFolder('Filha, a gente já te ama')).toBe('carta');
  });
  it('planos e listas são ideias', () => {
    expect(guessFolder('Nomes que gostamos: Helena, Theo')).toBe('ideia');
    expect(guessFolder('Lista do enxoval: bodies, fraldas')).toBe('ideia');
    expect(guessFolder('Precisamos ver o berço')).toBe('ideia');
  });
  it('foto da barriga com a palavra barriga', () => {
    expect(guessFolder('A barriga hoje', true)).toBe('barriga');
    expect(guessFolder('A barriga hoje', false)).toBe('dia');
  });
});
