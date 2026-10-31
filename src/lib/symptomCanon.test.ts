import { describe, expect, it } from 'vitest';
import { COMMON_SYMPTOMS } from '../content/symptomCatalog';
import { SYMPTOM_TIPS } from '../content/symptomTips';
import { canonSymptom, symptomToSave, timeOfDayIn } from './symptomCanon';
import { computeSymptomStats, toEntries } from './symptoms';
import type { SymptomItem } from '../types';

const nameOf = (t: string) => canonSymptom(t).name;

describe('canonSymptom: o mesmo sintoma, escrito de jeitos diferentes', () => {
  it.each([
    ['Enjoo', 'Enjoo'],
    ['enjoo', 'Enjoo'],
    ['ENJÔO', 'Enjoo'],
    ['hoje senti enjoo', 'Enjoo'],
    ['estou muito enjoada nesta manhã', 'Enjoo'],
    ['Enjoei depois do almoço', 'Enjoo'],
    ['náusea', 'Enjoo'],
    ['ânsia de vômito', 'Enjoo'],
    ['vomitei duas vezes', 'Vômito'],
    ['Vômito', 'Vômito'],
    ['muito cansada', 'Cansaço'],
    ['exausta', 'Cansaço'],
    ['dor nas costas', 'Dor lombar'],
    ['dor lombar forte', 'Dor lombar'],
    ['cãibra na panturrilha', 'Câimbras'],
    ['queimação no estômago', 'Azia'],
    ['refluxo à noite', 'Azia'],
    ['não consegui dormir', 'Insônia'],
    ['insônia', 'Insônia'],
    ['morrendo de sono', 'Sonolência'],
    ['ansiosa com o exame', 'Ansiedade'],
    ['chorei o dia todo', 'Oscilação de humor'],
    ['pés inchados', 'Inchaço'],
    ['Inchaço nos pés', 'Inchaço'],
    ['dor de cabeça', 'Dor de cabeça'],
    ['enxaqueca', 'Dor de cabeça'],
    ['nariz sangrando', 'Sangramento no nariz'],
    ['sangramento', 'Sangramento'],
    ['barriga dura', 'Contrações de treinamento'],
    ['contrações regulares', 'Contrações regulares'],
    ['tontura ao levantar', 'Tontura'],
    ['falta de ar subindo escada', 'Falta de ar'],
    ['prisão de ventre', 'Intestino preso'],
    ['seios doloridos', 'Seios doloridos'],
    ['o bebê está mexendo menos', 'Bebê mexendo menos'],
  ])('"%s" é %s', (typed, expected) => {
    expect(nameOf(typed)).toBe(expected);
  });

  it('ansiedade não vira enjoo (ânsia), e ânsia de vômito não vira vômito', () => {
    expect(nameOf('ansiedade')).toBe('Ansiedade');
    expect(nameOf('ânsia')).toBe('Enjoo');
  });

  it('o que o Tumtum não conhece perde só as palavras de ligação das pontas', () => {
    expect(canonSymptom('hoje senti formigamento nas mãos')).toEqual({ key: 'formigamento nas maos', name: 'Formigamento nas mãos', category: null });
    expect(canonSymptom('Formigamento nas mãos').key).toBe('formigamento nas maos');
    expect(canonSymptom('coceira na barriga hoje').name).toBe('Coceira na barriga');
  });

  it('todo sintoma do catálogo continua com o próprio nome, e as dicas acham o sintoma', () => {
    for (const c of Object.values(COMMON_SYMPTOMS).flat()) {
      expect(nameOf(c.name)).toBe(c.name);
      expect(SYMPTOM_TIPS[canonSymptom(c.name).key]).toBeTruthy();
    }
  });
});

describe('timeOfDayIn', () => {
  it('acha o período citado na frase', () => {
    expect(timeOfDayIn('estou muito enjoada nesta manhã')).toBe('manha');
    expect(timeOfDayIn('azia à noite')).toBe('noite');
    expect(timeOfDayIn('acordei de madrugada com câimbra')).toBe('madrugada');
    expect(timeOfDayIn('enjoo')).toBeNull();
  });
});

describe('symptomToSave', () => {
  it('salva o nome do sintoma e guarda a frase na observação', () => {
    expect(symptomToSave('estou muito enjoada nesta manhã', '')).toEqual({ name: 'Enjoo', notes: '"estou muito enjoada nesta manhã"' });
    expect(symptomToSave('hoje senti enjoo', 'melhorou com bolacha')).toEqual({ name: 'Enjoo', notes: '"hoje senti enjoo" · melhorou com bolacha' });
  });
  it('nome curto não vira observação', () => {
    expect(symptomToSave('enjoada', '')).toEqual({ name: 'Enjoo', notes: '' });
    expect(symptomToSave('Azia', 'depois do jantar')).toEqual({ name: 'Azia', notes: 'depois do jantar' });
  });
});

describe('gráfico de recorrência', () => {
  const item = (id: string, symptom_name: string, log_date: string): SymptomItem =>
    ({ id, symptom_name, log_date, week_number: 10, intensity: 3, category: 'Físico', created_by: 'mae', time_of_day: 'manha', notes: null }) as SymptomItem;
  it('registros antigos com frases diferentes viram um gráfico só', () => {
    const entries = toEntries([
      item('1', 'Enjoo', '2026-10-01'),
      item('2', 'hoje senti enjoo', '2026-10-02'),
      item('3', 'estou muito enjoada nesta manhã', '2026-10-03'),
      item('4', 'Azia', '2026-10-03'),
    ]);
    const stats = computeSymptomStats(entries, { from: new Date(2026, 8, 1), to: new Date(2026, 9, 10) });
    expect(stats.map(s => [s.name, s.count])).toEqual([['Enjoo', 3], ['Azia', 1]]);
    expect(stats[0].category).toBe('Digestivo');
  });
  it('o alerta olha o que foi escrito, não só o nome', () => {
    const stats = computeSymptomStats(toEntries([item('1', 'perda de líquido', '2026-10-05')]), { from: new Date(2026, 8, 1), to: new Date(2026, 9, 10) });
    expect(stats[0].isAlert).toBe(true);
  });
});
