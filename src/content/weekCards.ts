// Cartões "Nesta semana" do Início: o corpo da mãe e um gesto para o pai, por
// fase da gestação. O que acontece com o bebê vem de weeks.ts (o mesmo do coração).
// Referência: Caderneta da Gestante (Ministério da Saúde). Cada gestação é única:
// na dúvida, vale perguntar na consulta.

export interface WeekCard {
  title: string;
  text: string;
}

const RANGES: Array<{ from: number; body: WeekCard; partner: WeekCard }> = [
  {
    from: 4,
    body: { title: 'Cansaço e seios sensíveis', text: 'Os hormônios estão a mil. Sono fora de hora e enjoo são comuns e costumam passar.' },
    partner: { title: 'Divida a casa', text: 'Assuma mais tarefas e pergunte, sem pressa, como ela está se sentindo.' },
  },
  {
    from: 8,
    body: { title: 'Enjoo no auge', text: 'Comer pouco e várias vezes ao dia ajuda. Biscoito de água e sal ao acordar também.' },
    partner: { title: 'Lanches por perto', text: 'Deixe frutas e biscoitos à mão e fique com os cheiros fortes da cozinha.' },
  },
  {
    from: 13,
    body: { title: 'A energia volta', text: 'Para muitas, o enjoo melhora no 2º trimestre e a barriga começa a aparecer.' },
    partner: { title: 'Hora de planejar', text: 'Bom momento para conversarem sobre licenças, orçamento e o quarto do bebê.' },
  },
  {
    from: 18,
    body: { title: 'Os primeiros movimentos', text: 'Parecem bolhas ou borboletas. Dor nas costas fica mais comum: cuide da postura.' },
    partner: { title: 'Mão na barriga', text: 'Com calma, à noite: logo você também vai sentir os chutes.' },
  },
  {
    from: 23,
    body: { title: 'Pés inchados e azia', text: 'Pernas para cima no fim do dia, água e refeições menores ajudam.' },
    partner: { title: 'Massagem nos pés', text: 'Dez minutos à noite fazem diferença. E converse com o bebê: ele já ouve vocês.' },
  },
  {
    from: 28,
    body: { title: 'Sono mais difícil', text: 'Dormir de lado, com um travesseiro entre as pernas, costuma ajudar.' },
    partner: { title: 'Conheçam a maternidade', text: 'Visitem juntos, combinem o trajeto e revisem o plano de parto.' },
  },
  {
    from: 33,
    body: { title: 'Menos espaço', text: 'Falta de ar e vontade de fazer xixi toda hora são comuns: o bebê está grande.' },
    partner: { title: 'Mala na porta', text: 'Mala pronta, documentos separados e celular sempre carregado.' },
  },
  {
    from: 37,
    body: { title: 'Contrações de treino', text: 'Ficam mais frequentes. A aba Parto ajuda a diferenciar das de verdade.' },
    partner: { title: 'Por perto', text: 'Telefone ligado e combinado de quando ir para a maternidade.' },
  },
];

export function weekCards(week: number) {
  return [...RANGES].reverse().find(r => week >= r.from) ?? RANGES[0];
}

export const WEEK_CARDS_SOURCE = 'Caderneta da Gestante (Ministério da Saúde)';
