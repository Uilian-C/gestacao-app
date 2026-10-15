import { describe, expect, it } from 'vitest';
import { isHighBloodPressure, parseMetricInput } from './health';

describe('isHighBloodPressure', () => {
  it('alerta a partir de 140 de máxima ou 90 de mínima', () => {
    expect(isHighBloodPressure(139, 89)).toBe(false);
    expect(isHighBloodPressure(140, 80)).toBe(true);
    expect(isHighBloodPressure(120, 90)).toBe(true);
  });

  it('não alerta quando a pressão não foi medida', () => {
    expect(isHighBloodPressure(null, null)).toBe(false);
  });
});

describe('parseMetricInput', () => {
  it('aceita só o peso, sem inventar pressão', () => {
    expect(parseMetricInput({ weight: '64,5', systolic: '', diastolic: '' })).toEqual({ weight: 64.5, systolic: null, diastolic: null });
  });

  it('aceita só a pressão', () => {
    expect(parseMetricInput({ weight: '', systolic: '118', diastolic: '76' })).toEqual({ weight: null, systolic: 118, diastolic: 76 });
  });

  it('recusa formulário vazio', () => {
    expect(parseMetricInput({ weight: '', systolic: '', diastolic: '' })).toHaveProperty('error');
  });

  it('recusa pressão pela metade', () => {
    expect(parseMetricInput({ weight: '', systolic: '120', diastolic: '' })).toHaveProperty('error');
  });

  it('recusa valores fora do esperado ou invertidos', () => {
    expect(parseMetricInput({ weight: '645', systolic: '', diastolic: '' })).toHaveProperty('error');
    expect(parseMetricInput({ weight: '', systolic: '80', diastolic: '120' })).toHaveProperty('error');
    expect(parseMetricInput({ weight: 'abc', systolic: '', diastolic: '' })).toHaveProperty('error');
  });
});
