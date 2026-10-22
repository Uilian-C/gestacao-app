import { describe, expect, it } from 'vitest';
import { GROWTH, lengthText, stageAt, stageShots, weightText } from './growth';

describe('crescimento do bebê', () => {
  it('as médias só crescem, semana a semana', () => {
    for (let i = 1; i < GROWTH.length; i++) {
      expect(GROWTH[i].week).toBeGreaterThan(GROWTH[i - 1].week);
      expect(GROWTH[i].lengthCm).toBeGreaterThan(GROWTH[i - 1].lengthCm);
      expect(GROWTH[i].weightG).toBeGreaterThan(GROWTH[i - 1].weightG);
    }
  });
  it('cada fase mostra a foto da barriga mais recente, até a fase seguinte', () => {
    const shots = stageShots([{ week: 17 }, { week: 19 }, { week: 22 }, { week: 41 }]);
    expect(shots[GROWTH.findIndex(s => s.week === 16)]?.week).toBe(19);
    expect(shots[GROWTH.findIndex(s => s.week === 20)]?.week).toBe(22);
    expect(shots[GROWTH.findIndex(s => s.week === 12)]).toBeUndefined();
    expect(shots[GROWTH.length - 1]?.week).toBe(41);
  });
  it('escreve tamanho e peso do jeito brasileiro', () => {
    expect(lengthText(GROWTH[0])).toBe('Cerca de 2 mm');
    expect(lengthText(stageAt(21))).toBe('Cerca de 25,6 cm');
    expect(weightText(0)).toBe('menos de 1 g');
    expect(weightText(1700)).toBe('1,7 kg');
  });
});
