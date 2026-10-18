import { describe, expect, it } from 'vitest';
import { inDays, nextMilestone } from './milestones';

describe('marcos da gestação', () => {
  it('acha o próximo marco pela DUM', () => {
    // DUM em 01/05: a semana 13 completa em 31/07 (91 dias depois).
    expect(nextMilestone('2026-05-01', '2026-07-20')).toEqual({ milestone: expect.objectContaining({ week: 13 }), days: 11 });
    expect(nextMilestone('2026-05-01', '2026-07-31')?.days).toBe(0);
    expect(nextMilestone('2026-05-01', '2026-08-01')?.milestone.week).toBe(20);
  });
  it('depois da DPP, não há próximo marco', () => {
    expect(nextMilestone('2026-01-01', '2026-12-01')).toBeNull();
  });
  it('escreve o tempo que falta', () => {
    expect([0, 1, 5, 7, 10, 15].map(inDays)).toEqual(['hoje', 'amanhã', 'em 5 dias', 'em 1 semana', 'em 1 semana e 3 dias', 'em 2 semanas e 1 dia']);
  });
});
