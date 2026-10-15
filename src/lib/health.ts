// Limite usado pela Caderneta da Gestante e pela Febrasgo para hipertensão na
// gestação. É um aviso para procurar o obstetra, não um diagnóstico.
export const HIGH_SYSTOLIC = 140;
export const HIGH_DIASTOLIC = 90;

export function isHighBloodPressure(systolic: number | null, diastolic: number | null): boolean {
  return (systolic ?? 0) >= HIGH_SYSTOLIC || (diastolic ?? 0) >= HIGH_DIASTOLIC;
}

export type MetricInput = { weight: string; systolic: string; diastolic: string };
export type ParsedMetric = { weight: number | null; systolic: number | null; diastolic: number | null };

/** Converte o formulário de medição. Retorna uma mensagem de erro em vez de inventar valores. */
export function parseMetricInput(input: MetricInput): ParsedMetric | { error: string } {
  const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const weight = num(input.weight);
  const systolic = num(input.systolic);
  const diastolic = num(input.diastolic);

  if (weight === null && systolic === null && diastolic === null) {
    return { error: 'Informe o peso, a pressão ou os dois.' };
  }
  if ((systolic === null) !== (diastolic === null)) {
    return { error: 'Informe a pressão completa: máxima e mínima.' };
  }
  if (weight !== null && (!Number.isFinite(weight) || weight < 30 || weight > 250)) {
    return { error: 'Peso fora do esperado. Use quilos, por exemplo 64,5.' };
  }
  if (systolic !== null && diastolic !== null) {
    if (!Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 60 || systolic > 250 || diastolic < 30 || diastolic > 150) {
      return { error: 'Pressão fora do esperado. Use mmHg, por exemplo 120 por 80.' };
    }
    if (diastolic >= systolic) {
      return { error: 'A pressão mínima precisa ser menor que a máxima.' };
    }
  }
  return { weight, systolic, diastolic };
}
