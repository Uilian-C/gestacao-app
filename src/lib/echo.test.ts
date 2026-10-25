import { describe, expect, it } from 'vitest';
import { symptomEcho } from './echo';
import type { SymptomItem } from '../types';

const item = (date: string, name: string, time: SymptomItem['time_of_day']): SymptomItem => ({ id: date + name, week_number: 22, log_date: date, symptom_name: name, intensity: 3, created_by: 'mae', category: 'Digestivo', time_of_day: time });

describe('devolutiva do sintoma', () => {
  it('na primeira vez, só a dica', () => {
    const e = symptomEcho({ name: 'Azia', date: '2026-10-20', timeOfDay: 'noite' }, []);
    expect(e.pattern).toBeNull();
    expect(e.tip).toMatch(/jantar mais cedo/);
  });

  it('mostra quantas vezes na semana e em que hora do dia', () => {
    const e = symptomEcho({ name: 'azia', date: '2026-10-20', timeOfDay: 'noite' }, [item('2026-10-18', 'Azia', 'noite'), item('2026-10-16', 'Azia', 'tarde'), item('2026-10-01', 'Azia', 'noite')]);
    expect(e.pattern).toBe('Apareceu 3 vezes nesta semana, mais à noite.');
  });

  it('sintoma sem dica conhecida: só o padrão, sem inventar', () => {
    expect(symptomEcho({ name: 'Coceira na barriga', date: '2026-10-20', timeOfDay: 'manha' }, []).tip).toBeNull();
  });
});
