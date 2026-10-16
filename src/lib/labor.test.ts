import { describe, expect, it } from 'vitest';
import { formatDuration, laborReportLines, laborStatus, summarizeKicks, timeContractions } from './labor';
import { EMPTY_PLAN, planProgress, planToText, toPlan } from './birthPlan';
import type { Contraction } from '../types';

const NOW = new Date('2026-10-16T12:00:00Z');
const at = (minAgo: number, durSec: number, id = `c${minAgo}`): Contraction => {
  const s = new Date(NOW.getTime() - minAgo * 60000);
  return { id, started_at: s.toISOString(), ended_at: new Date(s.getTime() + durSec * 1000).toISOString(), created_by: 'pai' };
};

describe('contrações', () => {
  it('calcula duração e intervalo entre inícios', () => {
    const t = timeContractions([at(10, 50), at(15, 40)]);
    expect(t[0].durationSec).toBe(40);
    expect(t[0].intervalMin).toBeNull();
    expect(t[1].intervalMin).toBe(5);
  });

  it('reconhece o padrão 5-1-1 a termo', () => {
    const list = [55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0].map(m => at(m, 65));
    expect(laborStatus(timeContractions(list), 39, NOW).signal).toBe('511');
  });

  it('antes de 37 semanas, contrações frequentes são alerta', () => {
    const list = [40, 30, 20, 10].map(m => at(m, 40));
    expect(laborStatus(timeContractions(list), 33, NOW).signal).toBe('prematuro');
  });

  it('padrão ainda irregular ou só começando', () => {
    expect(laborStatus(timeContractions([at(50, 30), at(20, 30)]), 39, NOW).signal).toBe('irregular');
    expect(laborStatus(timeContractions([at(16, 45), at(8, 45), at(0, 45)]), 39, NOW).signal).toBe('ritmo');
    expect(laborStatus([], 39, NOW).signal).toBe('nenhum');
  });

  it('ignora contrações de mais de uma hora atrás', () => {
    const s = laborStatus(timeContractions([at(120, 60), at(90, 60)]), 39, NOW);
    expect(s.lastHourCount).toBe(0);
  });
});

describe('movimentos', () => {
  it('resume sessões, mais recentes primeiro', () => {
    const r = summarizeKicks([
      { id: 'a', started_at: '2026-10-15T20:00:00Z', ended_at: '2026-10-15T20:25:00Z', kicks: 10, target: 10, created_by: 'mae' },
      { id: 'b', started_at: '2026-10-16T08:00:00Z', ended_at: '2026-10-16T10:00:00Z', kicks: 6, target: 10, created_by: 'pai' },
    ]);
    expect(r[0].session.id).toBe('b');
    expect(r[0].minutes).toBe(120);
    expect(r[0].reachedTarget).toBe(false);
    expect(r[1].reachedTarget).toBe(true);
  });

  it('formata a duração', () => {
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1h02');
  });
});

describe('plano de parto', () => {
  it('lê dados salvos com segurança e mede o progresso', () => {
    expect(toPlan(null)).toEqual(EMPTY_PLAN);
    const plan = toPlan({ companion: 'Uilian', maternity: 'Maternidade X', birthType: 'normal', choices: { alivio: ['Bola de pilates'] }, discussedWithDoctor: true, lixo: 1 });
    expect(planProgress(plan)).toBeCloseTo(4 / 10);
  });

  it('gera texto para imprimir ou mandar', () => {
    const text = planToText(toPlan({ companion: 'Uilian', birthType: 'normal', choices: { nascimento: ['Contato pele a pele imediato'] } }), 'Ana');
    expect(text).toContain('PLANO DE PARTO · Ana');
    expect(text).toContain('Tipo de parto desejado: Parto normal');
    expect(text).toContain('- Contato pele a pele imediato');
    expect(text).toContain('ainda não conversado');
  });
});

describe('resumo da reta final', () => {
  it('resume movimentos, contrações e plano no período', () => {
    const lines = laborReportLines(
      {
        kicks: [
          { id: 'a', started_at: '2026-10-10T20:00:00Z', ended_at: '2026-10-10T20:20:00Z', kicks: 10, target: 10, created_by: 'mae' },
          { id: 'b', started_at: '2026-10-12T20:00:00Z', ended_at: '2026-10-12T20:40:00Z', kicks: 10, target: 10, created_by: 'pai' },
          { id: 'c', started_at: '2026-10-13T20:00:00Z', ended_at: '2026-10-13T22:00:00Z', kicks: 7, target: 10, created_by: 'pai' },
          { id: 'velha', started_at: '2026-08-01T20:00:00Z', ended_at: '2026-08-01T20:10:00Z', kicks: 10, target: 10, created_by: 'mae' },
        ],
        contractions: [at(30, 40), at(20, 50)],
        plan: { progress: 0.5, discussed: false },
      },
      { from: new Date('2026-10-01T00:00:00'), to: new Date('2026-10-16T00:00:00') },
    );
    expect(lines[0]).toBe('Movimentos do bebê: 3 contagens, meta alcançada em média em 30 min; 1 sem alcançar a meta');
    expect(lines[1]).toBe('Contrações cronometradas: 2, duração média de 0:45');
    expect(lines[2]).toBe('Plano de parto: 50% preenchido, ainda não conversado com o obstetra');
  });
});
