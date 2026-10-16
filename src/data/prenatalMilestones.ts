// Marcos do pré-natal que entram no calendário a partir da DUM. As janelas de
// exames e vacinas são as usuais no Brasil; a data exata é combinada com o obstetra.
export interface PrenatalMilestone {
  week: number;
  title: string;
  detail: string;
  /** Marcos que mudam a fase da gestação aparecem com mais destaque. */
  major?: boolean;
}

export const PRENATAL_MILESTONES: PrenatalMilestone[] = [
  { week: 11, title: 'Janela do morfológico do 1º trimestre', detail: 'Ultrassom entre 11 e 14 semanas.' },
  { week: 14, title: 'Início do 2º trimestre', detail: 'Para muitas mães, os enjoos começam a diminuir.', major: true },
  { week: 20, title: 'Janela do morfológico do 2º trimestre', detail: 'Ultrassom entre 20 e 24 semanas. A partir de agora, a vacina dTpa também pode ser aplicada.' },
  { week: 24, title: 'Janela da curva glicêmica (TOTG)', detail: 'Exame entre 24 e 28 semanas.' },
  { week: 28, title: 'Início do 3º trimestre', detail: 'Vacina contra o VSR disponível no SUS a partir desta semana.', major: true },
  { week: 35, title: 'Janela da pesquisa de estreptococo B', detail: 'Exame entre 35 e 37 semanas.' },
  { week: 37, title: 'Bebê a termo', detail: 'A partir de 37 semanas o bebê é considerado a termo.', major: true },
  { week: 40, title: 'Data provável do parto', detail: 'DPP: 40 semanas desde a DUM.', major: true },
];
