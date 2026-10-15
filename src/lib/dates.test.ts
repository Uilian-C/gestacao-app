import { describe, expect, it } from 'vitest';
import { clampWeek, daysBetween, formatBR, gestationalAge, isOverdue, parseLocalDate, toISODate, trimesterOf } from './dates';

const at = (iso: string, hour = 12) => {
  const d = parseLocalDate(iso);
  d.setHours(hour);
  return d;
};

describe('parseLocalDate / formatBR', () => {
  it('mantém o mesmo dia no fuso local (sem voltar um dia como new Date("AAAA-MM-DD"))', () => {
    const d = parseLocalDate('2026-10-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(15);
    expect(formatBR('2026-10-15')).toBe('15/10/2026');
  });

  it('aceita timestamp completo vindo do banco', () => {
    expect(formatBR('2026-10-15 23:30:00+00')).toBe('15/10/2026');
  });

  it('toISODate é o inverso de parseLocalDate', () => {
    expect(toISODate(parseLocalDate('2027-02-01'))).toBe('2027-02-01');
  });
});

describe('daysBetween', () => {
  it('conta dias de calendário independentemente da hora', () => {
    expect(daysBetween(at('2026-10-15', 23), at('2026-10-16', 1))).toBe(1);
    expect(daysBetween(at('2026-10-16'), at('2026-10-15'))).toBe(-1);
  });
});

describe('gestationalAge', () => {
  it('calcula semanas, dias e DPP (DUM + 280 dias)', () => {
    const age = gestationalAge('2026-05-11', at('2026-10-15'))!;
    expect(age.weeks).toBe(22);
    expect(age.days).toBe(3);
    expect(toISODate(age.dpp)).toBe('2027-02-15');
    expect(age.daysToDpp).toBe(123);
    expect(age.trimester).toBe(2);
    expect(age.isPostTerm).toBe(false);
  });

  it('não trava em 40 semanas e sinaliza pós-data', () => {
    const age = gestationalAge('2026-01-01', at('2026-10-15'))!;
    expect(age.weeks).toBe(41);
    expect(age.isPostTerm).toBe(true);
    expect(age.daysToDpp).toBeLessThan(0);
  });

  it('retorna null para DUM no futuro em vez de inventar uma idade', () => {
    expect(gestationalAge('2026-11-01', at('2026-10-15'))).toBeNull();
  });

  it('no dia da DUM a idade é 0 semanas e 0 dias', () => {
    const age = gestationalAge('2026-10-15', at('2026-10-15', 0))!;
    expect(age.weeks).toBe(0);
    expect(age.days).toBe(0);
  });
});

describe('trimesterOf / clampWeek', () => {
  it('usa os cortes 13 e 27 semanas', () => {
    expect(trimesterOf(13)).toBe(1);
    expect(trimesterOf(14)).toBe(2);
    expect(trimesterOf(27)).toBe(2);
    expect(trimesterOf(28)).toBe(3);
  });

  it('limita a semana visível entre 4 e 42', () => {
    expect(clampWeek(2)).toBe(4);
    expect(clampWeek(22)).toBe(22);
    expect(clampWeek(43)).toBe(42);
  });
});

describe('isOverdue', () => {
  it('prazo de hoje ainda não está atrasado', () => {
    expect(isOverdue('2026-10-15', at('2026-10-15', 23))).toBe(false);
    expect(isOverdue('2026-10-14', at('2026-10-15', 0))).toBe(true);
    expect(isOverdue(null)).toBe(false);
  });
});
