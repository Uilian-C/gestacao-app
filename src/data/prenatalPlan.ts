// Jornada de referência do pré-natal no Brasil: fases, consultas, exames e
// vacinas com a janela de semanas em que costumam acontecer.
// Fontes: Caderneta da Gestante (Ministério da Saúde) e recomendações da
// FEBRASGO. A equipe do pré-natal pode antecipar, repetir ou dispensar itens.

export const PLAN_SOURCE = 'Referência: Caderneta da Gestante (Ministério da Saúde) e FEBRASGO. A equipe do pré-natal pode ajustar datas e exames.';

export type PlanKind = 'consulta' | 'exame' | 'vacina' | 'preparo';

export interface PlanItem {
  id: string;
  kind: PlanKind;
  title: string;
  /** Nome curto para gráficos e listas apertadas. */
  short: string;
  /** Por que importa, em uma frase simples. */
  why: string;
  /** Janela recomendada, em semanas completas desde a DUM. */
  from: number;
  to: number;
  /** Só aparece para quem é Rh negativo. */
  rhNegativeOnly?: boolean;
  /** Pode acontecer a qualquer momento da gestação (ex.: campanha da gripe). */
  anytime?: boolean;
}

export const PLAN_ITEMS: PlanItem[] = [
  { id: 'primeira-consulta', short: '1ª consulta', kind: 'consulta', title: '1ª consulta de pré-natal', why: 'Quanto antes, melhor: idealmente até 12 semanas. Abre a caderneta e pede os exames iniciais.', from: 4, to: 12 },
  { id: 'exames-iniciais', short: 'Exames iniciais', kind: 'exame', title: 'Exames iniciais de sangue e urina', why: 'Hemograma, tipo sanguíneo e fator Rh, glicemia, HIV, sífilis, hepatites B e C, toxoplasmose, urina e urocultura.', from: 4, to: 12 },
  { id: 'morfo-1', short: 'Morfológico 1º tri', kind: 'exame', title: 'Ultrassom morfológico do 1º trimestre', why: 'Confirma a idade gestacional e mede a translucência nucal.', from: 11, to: 14 },
  { id: 'morfo-2', short: 'Morfológico 2º tri', kind: 'exame', title: 'Ultrassom morfológico do 2º trimestre', why: 'Avalia em detalhe a formação dos órgãos do bebê.', from: 20, to: 24 },
  { id: 'dtpa', short: 'Vacina dTpa', kind: 'vacina', title: 'Vacina dTpa', why: 'Passa anticorpos contra a coqueluche para o bebê. Indicada em toda gestação, a partir de 20 semanas.', from: 20, to: 36 },
  { id: 'totg', short: 'Curva glicêmica', kind: 'exame', title: 'Curva glicêmica (TOTG 75 g)', why: 'Rastreia o diabetes gestacional.', from: 24, to: 28 },
  { id: 'coombs', short: 'Coombs indireto', kind: 'exame', title: 'Coombs indireto', why: 'Para quem é Rh negativo: verifica se o corpo criou anticorpos contra o sangue do bebê.', from: 24, to: 28, rhNegativeOnly: true },
  { id: 'anti-d', short: 'Anti-D', kind: 'vacina', title: 'Imunoglobulina anti-D', why: 'Para quem é Rh negativo com Coombs negativo: protege as próximas gestações.', from: 28, to: 30, rhNegativeOnly: true },
  { id: 'exames-3tri', short: 'Exames 3º tri', kind: 'exame', title: 'Exames do 3º trimestre', why: 'Repetem hemograma, HIV, sífilis e urocultura; hepatite B e toxoplasmose conforme os resultados anteriores.', from: 28, to: 32 },
  { id: 'vsr', short: 'Vacina VSR', kind: 'vacina', title: 'Vacina contra o VSR', why: 'Protege o bebê contra a bronquiolite nos primeiros meses. No SUS a partir de 28 semanas.', from: 28, to: 36 },
  { id: 'plano-parto', short: 'Plano de parto', kind: 'preparo', title: 'Plano de parto e visita à maternidade', why: 'Conversem com o obstetra sobre as escolhas de vocês e conheçam o caminho até a maternidade.', from: 28, to: 34 },
  { id: 'mala', short: 'Mala pronta', kind: 'preparo', title: 'Mala da maternidade pronta', why: 'Deixe tudo separado até 36 semanas, com os documentos e a caderneta.', from: 30, to: 36 },
  { id: 'gbs', short: 'Estreptococo B', kind: 'exame', title: 'Pesquisa de estreptococo do grupo B', why: 'Um cotonete na vagina e no ânus: se der positivo, há antibiótico no parto para proteger o bebê.', from: 35, to: 37 },
  { id: 'gripe', short: 'Gripe', kind: 'vacina', title: 'Vacina da gripe (influenza)', why: 'Em qualquer fase da gestação, durante a campanha anual.', from: 4, to: 40, anytime: true },
  { id: 'hepatite-b', short: 'Hepatite B', kind: 'vacina', title: 'Hepatite B', why: 'Completar o esquema se a vacinação não estiver em dia.', from: 4, to: 40, anytime: true },
  { id: 'covid', short: 'COVID-19', kind: 'vacina', title: 'COVID-19', why: 'Conforme o calendário vigente para gestantes.', from: 4, to: 40, anytime: true },
];

export interface Phase {
  id: string;
  title: string;
  label: string;
  from: number;
  to: number;
  /** Frequência das consultas nesta fase. */
  visits: string;
  focus: string;
  /** O que mais importa nesta fase, curto e prático. */
  care: string[];
}

export const PHASES: Phase[] = [
  {
    id: 'formacao',
    title: 'Formação',
    label: '1º trimestre',
    from: 4,
    to: 13,
    visits: 'Consulta mensal',
    focus: 'Os órgãos do bebê se formam. É a hora de começar o pré-natal e cuidar da base.',
    care: [
      'Ácido fólico todos os dias até 12 semanas.',
      'Enjoo: refeições pequenas e frequentes; vômitos o dia todo pedem avaliação.',
      'Nada de álcool, cigarro ou remédios sem orientação.',
      'Carne bem passada e verduras bem lavadas (previne toxoplasmose).',
    ],
  },
  {
    id: 'crescimento',
    title: 'Crescimento',
    label: '2º trimestre',
    from: 14,
    to: 27,
    visits: 'Consulta mensal',
    focus: 'Costuma ser a fase mais tranquila. O bebê cresce e os primeiros movimentos aparecem.',
    care: [
      'Suplemento de ferro conforme a orientação do pré-natal.',
      'Os movimentos do bebê começam a ser sentidos entre 18 e 22 semanas.',
      'Atividade física leve, se liberada pela equipe.',
      'Atenção à pressão e a inchaço súbito no rosto ou nas mãos.',
    ],
  },
  {
    id: 'preparacao',
    title: 'Preparação',
    label: '3º trimestre',
    from: 28,
    to: 36,
    visits: 'Consulta a cada 15 dias',
    focus: 'O bebê ganha peso e os pulmões amadurecem. Hora de preparar a chegada.',
    care: [
      'Observe os movimentos do bebê todos os dias; se diminuírem, procure atendimento.',
      'Durma de lado, de preferência do lado esquerdo.',
      'Plano de parto, visita à maternidade e mala pronta.',
      'Contrações regulares antes de 37 semanas: vá à maternidade.',
    ],
  },
  {
    id: 'termo',
    title: 'Reta final',
    label: 'A termo',
    from: 37,
    to: 42,
    visits: 'Consulta semanal',
    focus: 'O bebê está pronto para nascer. Fiquem atentos aos sinais do trabalho de parto.',
    care: [
      'Regra 5-1-1: contrações a cada 5 minutos, durando 1 minuto, por 1 hora.',
      'Perda de líquido ou sangramento: vá à maternidade.',
      'Depois de 41 semanas, a equipe avalia a indução do parto.',
      'Mantenham a mala, os documentos e o transporte à mão.',
    ],
  },
];

export const KIND_LABEL: Record<PlanKind, string> = { consulta: 'Consulta', exame: 'Exame', vacina: 'Vacina', preparo: 'Preparo' };
