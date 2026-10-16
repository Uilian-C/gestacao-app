import { describe, expect, it } from 'vitest';
import { buildFicha, fichaSummary, fichaToText, gpaLabel, maternalAge, missingFicha } from './ficha';
import { parseLocalDate } from './dates';
import type { HealthMetric, PregnancyProfile } from '../types';

const TODAY = parseLocalDate('2026-10-16');
const profile: PregnancyProfile & { dumDate: string } = {
  dumDate: '2026-05-11',
  preWeightKg: 60,
  heightCm: 165,
  motherName: 'Ana Souza',
  motherBirthDate: '1990-10-17',
  bloodType: 'O-',
  gestations: 2,
  births: 1,
  abortions: 0,
  cesareans: 1,
  allergies: 'Dipirona',
  medications: 'Ácido fólico, sulfato ferroso',
  conditions: null,
  fichaAvailable: true,
};
const metrics: HealthMetric[] = [
  { id: 'm1', week_number: 21, recorded_at: '2026-10-07', weight_kg: 65.2, systolic_bp: 118, diastolic_bp: 76, created_by: 'mae' },
  { id: 'm2', week_number: 22, recorded_at: '2026-10-14', weight_kg: null, systolic_bp: 142, diastolic_bp: 91, created_by: 'pai' },
];

describe('ficha da gestante', () => {
  it('calcula a idade materna considerando se já fez aniversário no ano', () => {
    expect(maternalAge('1990-10-17', TODAY)).toBe(35);
    expect(maternalAge('1990-10-16', TODAY)).toBe(36);
  });

  it('escreve G P A com cesáreas e primeira gestação', () => {
    expect(gpaLabel(profile)).toBe('G2 P1 A0 (1 cesárea)');
    expect(gpaLabel({ gestations: 1, births: 0, abortions: 0, cesareans: 0 })).toBe('G1 P0 A0 · primeira gestação');
    expect(gpaLabel({ gestations: null, births: null, abortions: null, cesareans: null })).toBeNull();
  });

  const items = buildFicha(profile, metrics, TODAY);
  const get = (key: string) => items.find(i => i.key === key)!;

  it('monta os itens na ordem de prontuário', () => {
    expect(items.map(i => i.key).slice(0, 5)).toEqual(['gestante', 'ig', 'trimestre', 'dum', 'dpp']);
    expect(get('gestante').value).toBe('Ana Souza, 35 anos');
    expect(get('ig').value).toBe('22 semanas e 4 dias');
    expect(get('dpp').value).toBe('15/02/2027');
    expect(get('imc').value).toContain('IMC 22 (peso adequado)');
    expect(get('peso').value).toBe('65,2 kg em 07/10/2026 (+5,2 kg)');
  });

  it('destaca o que o profissional precisa notar', () => {
    expect(get('gestante').attention).toBe(true); // 35 anos ou mais
    expect(get('sangue').attention).toBe(true); // Rh negativo
    expect(get('pa').attention).toBe(true); // 142/91
    expect(get('alergias').attention).toBe(true);
  });

  it('lista o que falta preencher e gera texto', () => {
    expect(missingFicha(items)).toEqual(['Condições prévias']);
    expect(fichaToText(items)).toContain('Condições prévias: não informado');
  });

  it('resume em uma linha para o topo das telas', () => {
    expect(fichaSummary(profile, TODAY)).toEqual(['Ana, 35 anos', '22s 4d', '2º tri', 'DPP 15/02/2027', 'G2P1A0', 'O-']);
  });
});
