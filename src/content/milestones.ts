// Marcos da gestação para a contagem do Início ("Próximo marco: ...").
// Referência: Caderneta da Gestante (Ministério da Saúde). Cada gestação é única.

export interface Milestone {
  /** Semana completa em que o marco começa. */
  week: number;
  title: string;
  text: string;
}

export const MILESTONES: Milestone[] = [
  { week: 13, title: 'Começa o 2º trimestre', text: 'Para muitas, o enjoo melhora e a energia volta.' },
  { week: 20, title: 'Metade do caminho', text: 'Época do ultrassom morfológico.' },
  { week: 28, title: 'Começa o 3º trimestre', text: 'As consultas passam a ser a cada 15 dias.' },
  { week: 34, title: 'Mala da maternidade pronta', text: 'Bom ter tudo separado a partir daqui.' },
  { week: 37, title: 'Bebê a termo', text: 'A partir daqui o parto pode começar a qualquer momento.' },
  { week: 40, title: 'Data provável do parto', text: 'Poucos bebês nascem exatamente nesse dia.' },
];
