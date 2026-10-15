// Faixa de ganho de peso por IMC pré-gestacional, segundo o Institute of
// Medicine (IOM, 2009): ganho total no 1º trimestre de 0,5 a 2 kg e, depois,
// uma taxa semanal por faixa de IMC. A Caderneta da Gestante usa a curva
// brasileira, que tem valores próximos; o obstetra tem a palavra final.

export type BmiClass = 'baixo' | 'adequado' | 'sobrepeso' | 'obesidade';

export const BMI_LABEL: Record<BmiClass, string> = {
  baixo: 'Baixo peso',
  adequado: 'Peso adequado',
  sobrepeso: 'Sobrepeso',
  obesidade: 'Obesidade',
};

const WEEKLY_RATE: Record<BmiClass, [number, number]> = {
  baixo: [0.44, 0.58],
  adequado: [0.35, 0.5],
  sobrepeso: [0.23, 0.33],
  obesidade: [0.17, 0.27],
};

export const TOTAL_GAIN: Record<BmiClass, [number, number]> = {
  baixo: [12.5, 18],
  adequado: [11.5, 16],
  sobrepeso: [7, 11.5],
  obesidade: [5, 9],
};

const FIRST_TRIMESTER_WEEKS = 13;
const FIRST_TRIMESTER_GAIN: [number, number] = [0.5, 2];

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiClass(value: number): BmiClass {
  if (value < 18.5) return 'baixo';
  if (value < 25) return 'adequado';
  if (value < 30) return 'sobrepeso';
  return 'obesidade';
}

/** Faixa esperada de ganho acumulado (kg) em uma semana da gestação. */
export function expectedGain(week: number, cls: BmiClass): [number, number] {
  if (week <= FIRST_TRIMESTER_WEEKS) {
    const f = Math.max(0, week) / FIRST_TRIMESTER_WEEKS;
    return [FIRST_TRIMESTER_GAIN[0] * f, FIRST_TRIMESTER_GAIN[1] * f];
  }
  const extra = week - FIRST_TRIMESTER_WEEKS;
  const [rMin, rMax] = WEEKLY_RATE[cls];
  return [FIRST_TRIMESTER_GAIN[0] + extra * rMin, FIRST_TRIMESTER_GAIN[1] + extra * rMax];
}

export type GainStatus = 'abaixo' | 'dentro' | 'acima';

export function gainStatus(gainKg: number, week: number, cls: BmiClass): GainStatus {
  const [min, max] = expectedGain(week, cls);
  if (gainKg < min) return 'abaixo';
  if (gainKg > max) return 'acima';
  return 'dentro';
}

export const GAIN_STATUS_LABEL: Record<GainStatus, string> = {
  abaixo: 'abaixo da faixa',
  dentro: 'dentro da faixa',
  acima: 'acima da faixa',
};
