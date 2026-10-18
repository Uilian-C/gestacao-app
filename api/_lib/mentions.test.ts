import { describe, expect, it } from 'vitest';
import { mentioned, mentionedNames } from './mentions.js';

const people = [{ first: 'João' }, { first: 'Ana' }];

describe('marcações', () => {
  it('acha o @Nome sem ligar para acento e maiúscula', () => {
    expect([...mentionedNames('Olha isso, @joao! E @ANA também.')]).toEqual(['joao', 'ana']);
    expect(mentioned(people, 'Olha isso, @joao!')).toEqual([{ first: 'João' }]);
  });
  it('e-mail ou @ sozinho não marcam ninguém', () => {
    expect(mentioned(people, 'escreve para ana@ex.com @ ')).toEqual([]);
  });
  it('ao editar, avisa só quem foi marcado agora', () => {
    expect(mentioned(people, '@Ana e @João', '@Ana')).toEqual([{ first: 'João' }]);
    expect(mentioned(people, '@Ana', '@Ana')).toEqual([]);
  });
});
