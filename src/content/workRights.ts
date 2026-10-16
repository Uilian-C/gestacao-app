// Direitos da gestante no trabalho (CLT). Aparece quando o casal registra que
// contou a gravidez no trabalho. Conteúdo informativo: em caso de dúvida, RH ou sindicato.

export const WORK_RIGHTS_SOURCE = 'Constituição (ADCT, art. 10, II, b), CLT (arts. 392 e 392-A), TST Súmula 244 e Lei 11.770/2008';

export const WORK_RIGHTS: string[] = [
  'Estabilidade: não pode ser demitida sem justa causa desde a confirmação da gravidez até 5 meses após o parto, inclusive em contrato de experiência.',
  'Consultas e exames: direito a se ausentar do trabalho para pelo menos 6 consultas e exames do pré-natal, sem desconto.',
  'Mudança de função, se a saúde exigir, com retorno à função anterior depois.',
  'Licença-maternidade de 120 dias, que pode começar até 28 dias antes do parto; 180 dias em empresas do Programa Empresa Cidadã.',
];

/** Momentos que pedem o guia de direitos no trabalho. */
export const WORK_TERMS = /trabalho|empresa|chefe|gestor|rh\b|emprego/i;
