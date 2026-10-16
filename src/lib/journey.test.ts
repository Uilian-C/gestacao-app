import { describe, expect, it } from 'vitest';
import { PLAN_ITEMS } from '../data/prenatalPlan';
import { dateOfWeek, itemStatus, nextSteps, phaseOf, planFor, planProgress } from './journey';

const item = (id: string) => PLAN_ITEMS.find(i => i.id === id)!;

describe('jornada do pré-natal', () => {
  it('itens de Rh negativo só aparecem para quem é Rh negativo', () => {
    expect(planFor('O+').some(i => i.id === 'anti-d')).toBe(false);
    expect(planFor('O-').some(i => i.id === 'anti-d')).toBe(true);
    expect(planFor(null).some(i => i.id === 'coombs')).toBe(false);
  });

  it('status pela janela de semanas', () => {
    const totg = item('totg'); // 24 a 28
    expect(itemStatus(totg, 18, false)).toBe('depois');
    expect(itemStatus(totg, 21, false)).toBe('em-breve');
    expect(itemStatus(totg, 26, false)).toBe('agora');
    expect(itemStatus(totg, 29, false)).toBe('pendente');
    expect(itemStatus(totg, 29, true)).toBe('feito');
  });

  it('próximos passos: atrasados primeiro, depois a janela aberta, sem vacinas de campanha na frente', () => {
    const steps = nextSteps(planFor('O+'), 22, new Set(['primeira-consulta', 'exames-iniciais']));
    expect(steps.map(s => s.item.id)).toEqual(['morfo-1', 'morfo-2', 'dtpa']);
    expect(steps[0].status).toBe('pendente');
  });

  it('progresso conta só o que já deveria ter acontecido', () => {
    const p = planProgress(planFor('O+'), 22, new Set(['primeira-consulta', 'exames-iniciais']));
    expect(p.dueByNow).toBe(3); // 1ª consulta, exames iniciais, morfológico 1
    expect(p.doneByNow).toBe(2);
  });

  it('fase e data de cada semana', () => {
    expect(phaseOf(10).id).toBe('formacao');
    expect(phaseOf(28).id).toBe('preparacao');
    expect(phaseOf(41).id).toBe('termo');
    expect(dateOfWeek('2026-05-15', 24).toDateString()).toBe(new Date(2026, 9, 30).toDateString());
  });
});
