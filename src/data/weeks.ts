import { FIRST_WEEK, LAST_WEEK, trimesterOf } from '../lib/dates';

export interface WeekInfo {
  week: number;
  fruit: string;
  size: string;
  weight: string;
  trimester: 1 | 2 | 3;
}

// Referência aproximada por faixa de semanas. Será substituída por conteúdo
// semana a semana na Onda 2.
const RANGES: Array<{ from: number; fruit: string; size: string; weight: string }> = [
  { from: 4, fruit: 'Semente de papoula', size: '1-2 mm', weight: '< 1 g' },
  { from: 5, fruit: 'Grão de arroz', size: '5-10 mm', weight: '< 1 g' },
  { from: 8, fruit: 'Azeitona / uva', size: '1,6-3,1 cm', weight: '1-4 g' },
  { from: 11, fruit: 'Figo / limão', size: '4,1-7,4 cm', weight: '7-23 g' },
  { from: 14, fruit: 'Maçã / abacate', size: '8,7-13 cm', weight: '43-140 g' },
  { from: 18, fruit: 'Manga / banana', size: '14,2-27,8 cm', weight: '190-430 g' },
  { from: 23, fruit: 'Berinjela / couve-flor', size: '28,9-36,6 cm', weight: '500-875 g' },
  { from: 28, fruit: 'Melão / coco', size: '37,6-42,4 cm', weight: '1-1,7 kg' },
  { from: 33, fruit: 'Melancia', size: '43,7-50,7 cm', weight: '1,9-3,5 kg' },
];

export const GESTATION_WEEKS: WeekInfo[] = Array.from({ length: LAST_WEEK - FIRST_WEEK + 1 }, (_, i) => {
  const week = FIRST_WEEK + i;
  const range = [...RANGES].reverse().find(r => week >= r.from)!;
  return { week, fruit: range.fruit, size: range.size, weight: range.weight, trimester: trimesterOf(week) };
});

export function weekInfo(week: number): WeekInfo {
  return GESTATION_WEEKS.find(w => w.week === week) ?? GESTATION_WEEKS[0];
}
