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
  /** Como contar essa fase para quem espera, com carinho. */
  title: string;
  /** Comprimento médio, em cm. */
  lengthCm: number;
  /** Como foi medido. */
  measure: 'cabeca-bumbum' | 'cabeca-pes';
  /** Peso médio, em gramas. */
  weightG: number;
}

export const GROWTH: GrowthStage[] = [
  { week: 4, title: 'Uma sementinha de amor', lengthCm: 0.2, measure: 'cabeca-bumbum', weightG: 0 },
  { week: 8, title: 'O coraçãozinho já bate forte', lengthCm: 1.6, measure: 'cabeca-bumbum', weightG: 1 },
  { week: 12, title: 'Já tem carinha', lengthCm: 5.4, measure: 'cabeca-bumbum', weightG: 14 },
  { week: 16, title: 'Faz caretas e chupa o dedo', lengthCm: 11.6, measure: 'cabeca-bumbum', weightG: 100 },
  { week: 20, title: 'Os primeiros chutinhos', lengthCm: 25.6, measure: 'cabeca-pes', weightG: 300 },
  { week: 24, title: 'Já ouve a voz de vocês', lengthCm: 30, measure: 'cabeca-pes', weightG: 600 },
  { week: 28, title: 'Abre os olhinhos', lengthCm: 37.6, measure: 'cabeca-pes', weightG: 1000 },
  { week: 32, title: 'Ganhando dobrinhas', lengthCm: 42.4, measure: 'cabeca-pes', weightG: 1700 },
  { week: 36, title: 'Quase pronto para o colo', lengthCm: 47.4, measure: 'cabeca-pes', weightG: 2600 },
  { week: 40, title: 'Pronto para conhecer vocês', lengthCm: 51.2, measure: 'cabeca-pes', weightG: 3400 },
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

/**
 * A foto da barriga de cada fase: a mais recente tirada a partir desta fase e
 * antes da próxima (a fase que o bebê já tinha alcançado). Fases sem foto ficam
 * sem (undefined).
 */
export function stageShots<T extends { week: number }>(shots: T[]): Array<T | undefined> {
  return GROWTH.map((s, i) => {
    const until = GROWTH[i + 1]?.week ?? Infinity;
    return shots.filter(b => b.week >= s.week && b.week < until).sort((a, b) => b.week - a.week)[0];
  });
}

/** A etapa mais próxima já alcançada (para dar a ideia de tamanho da semana de hoje). */
export const stageAt = (week: number) => [...GROWTH].reverse().find(s => s.week <= week) ?? GROWTH[0];
