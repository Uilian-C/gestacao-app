import { describe, expect, it } from 'vitest';
import { computeSymptomStats, findPatterns, normalizeSymptomName, timeOfDayFromHour, toEntries } from './symptoms';
import { bmi, bmiClass, expectedGain, gainStatus } from './weightGain';
import { buildReport, defaultReportPeriod, reportToText } from './report';
import { isAlertSymptom } from '../content/symptomCatalog';
import { parseLocalDate } from './dates';
import type { Consultation, HealthMetric, QuestionItem, SymptomItem, TimeOfDay } from '../types';

const TODAY = parseLocalDate('2026-10-15');
const daysAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let seq = 0;
const symptom = (name: string, ago: number, intensity: number, extra: Partial<SymptomItem> = {}): SymptomItem => ({
  id: `s${++seq}`,
  week_number: 22 - Math.floor(ago / 7),
  log_date: daysAgo(ago),
  symptom_name: name,
  intensity,
  created_by: 'mae',
  category: 'Digestivo',
  ...extra,
});
const period = { from: parseLocalDate(daysAgo(27)), to: TODAY };

describe('normalização e horário', () => {
  it('trata grafias diferentes como o mesmo sintoma', () => {
    expect(normalizeSymptomName('  Dor   Lombar ')).toBe('dor lombar');
    expect(normalizeSymptomName('Insônia')).toBe('insonia');
  });

  it('classifica o período do dia pela hora', () => {
    expect(timeOfDayFromHour(3)).toBe('madrugada');
    expect(timeOfDayFromHour(9)).toBe('manha');
    expect(timeOfDayFromHour(15)).toBe('tarde');
    expect(timeOfDayFromHour(22)).toBe('noite');
  });
});

describe('estatísticas por sintoma', () => {
  const items = [
    symptom('Azia', 25, 2, { time_of_day: 'noite' }),
    symptom('azia', 20, 2, { time_of_day: 'noite' }),
    symptom('Azia ', 10, 4, { time_of_day: 'noite' }),
    symptom('Azia', 5, 4, { time_of_day: 'tarde' }),
    symptom('Azia', 1, 5, { time_of_day: 'noite' }),
    symptom('Dor lombar', 3, 3, { category: 'Físico' }),
  ];
  const stats = computeSymptomStats(toEntries(items), period);
  const azia = stats.find(s => s.key === 'azia')!;

  it('agrupa, conta e calcula média e máximo', () => {
    expect(azia.count).toBe(5);
    expect(azia.avgIntensity).toBeCloseTo(3.4);
    expect(azia.maxIntensity).toBe(5);
    expect(stats[0].key).toBe('azia');
  });

  it('detecta piora comparando as 2 últimas semanas com as 2 anteriores', () => {
    expect(azia.trend).toBe('subindo');
    expect(azia.previousAvg).toBe(2);
    expect(azia.recentAvg).toBeCloseTo(4.33, 1);
  });

  it('acha o período do dia predominante', () => {
    expect(azia.timeOfDay.dominant).toBe('noite');
    expect(azia.timeOfDay.share).toBeCloseTo(0.8);
  });

  it('marca sintoma que surgiu só no fim do período como novo', () => {
    expect(stats.find(s => s.key === 'dor lombar')!.trend).toBe('novo');
  });

  it('ignora registros fora do período', () => {
    const old = computeSymptomStats(toEntries([symptom('Enjoo', 60, 3)]), period);
    expect(old).toHaveLength(0);
  });
});

describe('padrões', () => {
  it('gera piora, horário e frequência com frases explicáveis', () => {
    const items = [10, 8, 5, 3, 1].map((ago, i) => symptom('Azia', ago, i < 2 ? 2 : 4, { time_of_day: 'noite' as TimeOfDay }));
    items.push(symptom('Azia', 20, 2, { time_of_day: 'noite' }));
    const insights = findPatterns(toEntries(items), period);
    const ids = insights.map(i => i.id);
    expect(ids).toContain('frequente-azia');
    expect(ids).toContain('horario-azia');
  });

  it('coloca sinais de alerta primeiro', () => {
    const items = [symptom('Azia', 2, 2), symptom('Sangramento', 1, 3, { category: 'Físico' })];
    expect(findPatterns(toEntries(items), period)[0].tone).toBe('alerta');
  });

  it('encontra sintomas que aparecem juntos', () => {
    const items = [1, 4, 8].flatMap(ago => [symptom('Insônia', ago, 3, { category: 'Sono' }), symptom('Azia', ago, 3)]);
    expect(findPatterns(toEntries(items), period).some(i => i.id === 'juntos-azia|insonia')).toBe(true);
  });
});

describe('sinais de alerta', () => {
  it('reconhece alertas e ignora sangramentos benignos', () => {
    expect(isAlertSymptom('sangramento', 2)).toBe(true);
    expect(isAlertSymptom('sangramento na gengiva', 2)).toBe(false);
    expect(isAlertSymptom('dor de cabeca', 2)).toBe(false);
    expect(isAlertSymptom('dor de cabeca', 4)).toBe(true);
    expect(isAlertSymptom('contracoes de treinamento', 3)).toBe(false);
  });
});

describe('ganho de peso (IOM 2009)', () => {
  it('classifica o IMC', () => {
    expect(bmiClass(bmi(60, 165))).toBe('adequado');
    expect(bmiClass(bmi(48, 165))).toBe('baixo');
    expect(bmiClass(bmi(75, 165))).toBe('sobrepeso');
    expect(bmiClass(bmi(85, 165))).toBe('obesidade');
  });

  it('chega perto do ganho total recomendado na semana 40', () => {
    const [min, max] = expectedGain(40, 'adequado');
    expect(min).toBeCloseTo(9.95);
    expect(max).toBeCloseTo(15.5);
  });

  it('diz se o ganho está dentro da faixa', () => {
    expect(gainStatus(6, 22, 'adequado')).toBe('dentro');
    expect(gainStatus(1, 22, 'adequado')).toBe('abaixo');
    expect(gainStatus(9, 22, 'adequado')).toBe('acima');
  });
});

describe('resumo da consulta', () => {
  const consultations: Consultation[] = [{ id: 'c1', scheduled_at: '2026-09-20T10:00:00-03:00', specialty: 'nutricionista', created_by: 'mae' }];
  const metrics: HealthMetric[] = [
    { id: 'm1', week_number: 19, recorded_at: daysAgo(20), weight_kg: 64, systolic_bp: 110, diastolic_bp: 70, created_by: 'mae' },
    { id: 'm2', week_number: 22, recorded_at: daysAgo(1), weight_kg: 66, systolic_bp: 142, diastolic_bp: 88, created_by: 'pai' },
  ];
  const questions: QuestionItem[] = [
    { id: 'q1', questions_to_ask: 'Posso comer sushi?', created_by: 'mae', category: 'Alimentação', created_at: daysAgo(3), status: 'pendente', specialty: 'nutricionista' },
    { id: 'q2', questions_to_ask: 'Quando fazer o morfológico?', created_by: 'pai', category: 'Exames', created_at: daysAgo(3), status: 'pendente', specialty: null },
  ];
  const symptoms = [symptom('Azia', 2, 4), symptom('Dor lombar', 3, 3, { category: 'Físico' }), symptom('Ansiedade', 4, 2, { category: 'Emocional' })];

  it('usa o período desde a última consulta da mesma especialidade', () => {
    const p = defaultReportPeriod(consultations, 'nutricionista', TODAY);
    expect(p.from.getDate()).toBe(21);
    expect(p.from.getMonth()).toBe(8);
    const fallback = defaultReportPeriod(consultations, 'psicologia', TODAY);
    expect(Math.round((TODAY.getTime() - fallback.from.getTime()) / 86400000)).toBe(30);
  });

  const base = { period, today: TODAY, dumDate: '2026-05-11', preWeightKg: 60, heightCm: 165, symptoms, comments: [], metrics, questions };

  it('nutricionista vê digestivo, peso e as dúvidas dela; pressão alta aparece mesmo assim', () => {
    const r = buildReport({ ...base, specialtyId: 'nutricionista' });
    expect(r.symptoms.map(s => s.key)).toEqual(['azia']);
    expect(r.hiddenSymptomCount).toBe(2);
    expect(r.weight?.periodDelta).toBe(2);
    expect(r.weight?.totalGain).toBe(6);
    expect(r.weight?.status).toBe('dentro');
    expect(r.bloodPressure?.highCount).toBe(1);
    expect(r.pendingQuestions.map(q => q.id)).toEqual(['q1']);
  });

  it('obstetra vê tudo e as dúvidas sem especialidade', () => {
    const r = buildReport({ ...base, specialtyId: 'obstetra' });
    expect(r.symptoms).toHaveLength(3);
    expect(r.pendingQuestions.map(q => q.id)).toEqual(['q2']);
    expect(r.weekTo).toBe(22);
  });

  it('pressão alta entra nos pontos de atenção', () => {
    const r = buildReport({ ...base, specialtyId: 'obstetra' });
    expect(r.insights[0].id).toBe('pressao-m2');
    expect(r.insights[0].tone).toBe('alerta');
  });

  it('gera texto para compartilhar', () => {
    const text = reportToText(buildReport({ ...base, specialtyId: 'obstetra' }));
    expect(text).toContain('RESUMO PARA CONSULTA · OBSTETRA (PRÉ-NATAL)');
    expect(text).toContain('142/88 mmHg ⚠️');
    expect(text).toContain('Quando fazer o morfológico?');
  });
});
