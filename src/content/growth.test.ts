import { describe, expect, it } from 'vitest';
import { GROWTH, growthTimeline, lengthText, stageAt, weightText } from './growth';

describe('crescimento do bebê', () => {
  it('as médias só crescem, semana a semana', () => {
    for (let i = 1; i < GROWTH.length; i++) {
      expect(GROWTH[i].week).toBeGreaterThan(GROWTH[i - 1].week);
      expect(GROWTH[i].lengthCm).toBeGreaterThan(GROWTH[i - 1].lengthCm);
      expect(GROWTH[i].weightG).toBeGreaterThan(GROWTH[i - 1].weightG);
    }
  });
  it('põe a semana de hoje no lugar certo da linha', () => {
    const rows = growthTimeline(22);
    expect(rows.map(r => r.week)).toEqual([4, 8, 12, 16, 20, 22, 24, 28, 32, 36, 40]);
    expect(rows.find(r => r.now)).toMatchObject({ week: 22, stage: null });
    expect(growthTimeline(24).filter(r => r.now)).toHaveLength(1);
    expect(growthTimeline(24).find(r => r.now)?.stage?.week).toBe(24);
  });
  it('escreve tamanho e peso do jeito brasileiro', () => {
    expect(lengthText(GROWTH[0])).toBe('Cerca de 2 mm');
    expect(lengthText(stageAt(21))).toBe('Cerca de 25,6 cm');
    expect(weightText(0)).toBe('menos de 1 g');
    expect(weightText(1700)).toBe('1,7 kg');
  });
});
