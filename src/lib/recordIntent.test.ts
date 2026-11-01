import { describe, expect, it } from 'vitest';
import type { QuickMode } from '../components/QuickRecord';
import { guessRecord, symptomOf } from './recordIntent';

const ALL: QuickMode[] = ['momento', 'sintoma', 'medicao', 'consulta', 'tarefa', 'exame'];
const first = (t: string, allowed = ALL) => guessRecord(t, allowed)[0];

describe('guessRecord: onde guardar o que foi escrito', () => {
  it.each([
    ['estou muito enjoada nesta manhã', 'sintoma'],
    ['enjoo forte', 'sintoma'],
    ['dor nas costas', 'sintoma'],
    ['ouvimos o coração pela primeira vez', 'momento'],
    ['chorei de emoção no ultrassom', 'momento'],
    ['o bebê mexeu!', 'momento'],
    ['hoje foi um dia lindo', 'momento'],
    ['marquei o morfológico dia 12', 'consulta'],
    ['consulta amanhã às 9h com a Dra. Lia', 'consulta'],
    ['saiu o resultado do hemograma', 'exame'],
    ['comprar fraldas RN', 'tarefa'],
    ['preciso montar o berço', 'tarefa'],
    ['62,5 kg', 'medicao'],
    ['pressão 12x8', 'medicao'],
  ])('"%s" → %s', (text, mode) => {
    expect(first(text)).toBe(mode);
  });

  it('a segunda opção também aparece (um "chorei" pode ser sintoma)', () => {
    expect(guessRecord('chorei de emoção no ultrassom', ALL)).toEqual(['momento', 'sintoma']);
  });

  it('só sugere o que a tela oferece', () => {
    expect(guessRecord('enjoo forte', ['consulta', 'tarefa'])).toEqual([]);
    expect(first('comprar fraldas', ['consulta', 'tarefa'])).toBe('tarefa');
  });

  it('sem texto, sem sugestão', () => {
    expect(guessRecord('  ', ALL)).toEqual([]);
  });

  it('diz qual sintoma', () => {
    expect(symptomOf('hoje senti enjoo')).toBe('Enjoo');
    expect(symptomOf('ouvimos o coração')).toBeNull();
  });
});
