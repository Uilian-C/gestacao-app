// Como o bebê cresce: tamanho e peso médios em semanas marcantes da gestação,
// para a linha do tempo "Como o bebê cresce". São médias de tabelas de
// crescimento fetal usadas no pré-natal: cada bebê tem o próprio ritmo, e quem
// diz como o seu está é o ultrassom e a equipe que acompanha vocês.
//
// Até a 16ª semana o comprimento é medido da cabeça ao bumbum (o bebê fica
// encolhido); a partir da 20ª, da cabeça aos pés. Por isso o número "salta"
// entre as duas.

export interface GrowthStage {
  week: number;
  /** Comprimento médio, em cm. */
  lengthCm: number;
  /** Como foi medido. */
  measure: 'cabeca-bumbum' | 'cabeca-pes';
  /** Peso médio, em gramas. */
  weightG: number;
}

export const GROWTH: GrowthStage[] = [
  { week: 4, lengthCm: 0.2, measure: 'cabeca-bumbum', weightG: 0 },
  { week: 8, lengthCm: 1.6, measure: 'cabeca-bumbum', weightG: 1 },
  { week: 12, lengthCm: 5.4, measure: 'cabeca-bumbum', weightG: 14 },
  { week: 16, lengthCm: 11.6, measure: 'cabeca-bumbum', weightG: 100 },
  { week: 20, lengthCm: 25.6, measure: 'cabeca-pes', weightG: 300 },
  { week: 24, lengthCm: 30, measure: 'cabeca-pes', weightG: 600 },
  { week: 28, lengthCm: 37.6, measure: 'cabeca-pes', weightG: 1000 },
  { week: 32, lengthCm: 42.4, measure: 'cabeca-pes', weightG: 1700 },
  { week: 36, lengthCm: 47.4, measure: 'cabeca-pes', weightG: 2600 },
  { week: 40, lengthCm: 51.2, measure: 'cabeca-pes', weightG: 3400 },
];

export const GROWTH_SOURCE = 'Médias de tabelas de crescimento fetal usadas no pré-natal. Cada bebê tem o próprio ritmo.';

export const MEASURE_TEXT = { 'cabeca-bumbum': 'da cabeça ao bumbum', 'cabeca-pes': 'da cabeça aos pés' } as const;

const cm = (v: number) => (v < 1 ? `${Math.round(v * 10)} mm` : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`);

/** "Cerca de 25,6 cm", "Cerca de 2 mm". */
export const lengthText = (s: GrowthStage) => `Cerca de ${cm(s.lengthCm)}`;

/** "300 g", "1,7 kg", "menos de 1 g". */
export function weightText(g: number) {
  if (g < 1) return 'menos de 1 g';
  if (g < 1000) return `${g} g`;
  return `${(g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

/** As etapas da linha, com a semana de hoje no lugar certo (quando não é uma delas). */
export function growthTimeline(currentWeek: number): Array<{ stage: GrowthStage | null; week: number; now: boolean }> {
  const rows = GROWTH.map(s => ({ stage: s as GrowthStage | null, week: s.week, now: s.week === currentWeek }));
  if (currentWeek >= 4 && currentWeek <= 42 && !GROWTH.some(s => s.week === currentWeek)) {
    rows.push({ stage: null, week: currentWeek, now: true });
    rows.sort((a, b) => a.week - b.week);
  }
  return rows;
}

/** A etapa mais próxima já alcançada (para dar a ideia de tamanho da semana de hoje). */
export const stageAt = (week: number) => [...GROWTH].reverse().find(s => s.week <= week) ?? GROWTH[0];
