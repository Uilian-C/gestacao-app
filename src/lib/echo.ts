import { SYMPTOM_TIPS } from '../content/symptomTips';
import type { SymptomItem, TimeOfDay } from '../types';
import { daysBetween, parseLocalDate } from './dates';
import { canonSymptom } from './symptomCanon';

const WHEN: Record<TimeOfDay, string> = { manha: 'de manhã', tarde: 'à tarde', noite: 'à noite', madrugada: 'de madrugada' };

// A devolutiva do sintoma: logo depois de registrar, o que costuma ajudar e,
// quando há, o padrão da última semana ("3 vezes, mais à noite"). Transforma o
// registro numa descoberta, sem alarme (os sinais de alerta têm aviso próprio).

export interface SymptomEcho {
  name: string;
  /** "Apareceu 3 vezes nesta semana, mais à noite." (só com 2 ou mais). */
  pattern: string | null;
  tip: string | null;
}

export function symptomEcho(entry: { name: string; date: string; timeOfDay: TimeOfDay }, history: SymptomItem[]): SymptomEcho {
  // "Enjoo" e "hoje senti enjoo" contam juntos.
  const { key, name } = canonSymptom(entry.name);
  const day = parseLocalDate(entry.date);
  // O histórico é o de antes de salvar: o registro novo entra na conta à parte.
  const week = history.filter(s => canonSymptom(s.symptom_name).key === key && Math.abs(daysBetween(parseLocalDate(s.log_date.slice(0, 10)), day)) <= 6);
  const times = [...week.map(s => s.time_of_day).filter((t): t is TimeOfDay => !!t), entry.timeOfDay];
  const count = week.length + 1;
  const top = [...times.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map<TimeOfDay, number>()).entries()].sort((a, b) => b[1] - a[1])[0];
  const when = top && top[1] >= 2 ? `, mais ${WHEN[top[0]]}` : '';
  return {
    name,
    pattern: count >= 2 ? `Apareceu ${count} vezes nesta semana${when}.` : null,
    tip: SYMPTOM_TIPS[key] ?? null,
  };
}
