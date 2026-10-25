// As primeiras vezes: os marcos que todo casal vive na gestação, como cartões
// de um álbum. Cada um vira uma página especial do livro quando é guardado.
// Alguns já começam marcados pelo que vocês fizeram no app (o "progresso
// dotado": começar com algo feito dá vontade de completar).

export type FirstTimeId = 'descoberta' | 'contar' | 'coracao' | 'ultrassom' | 'barriga' | 'chute' | 'sexo' | 'nome' | 'roupinha' | 'cantinho' | 'cha' | 'mala';

export interface FirstTime {
  id: FirstTimeId;
  title: string;
  /** O começo do texto quando vão guardar. */
  starter: string;
  /** A partir de que semana costuma acontecer (para sugerir na hora certa). */
  from: number;
}

export const FIRST_TIMES: FirstTime[] = [
  { id: 'descoberta', title: 'Descobrir a gravidez', starter: 'O dia em que descobrimos', from: 4 },
  { id: 'contar', title: 'Contar para a família', starter: 'Quando contamos para a família', from: 6 },
  { id: 'coracao', title: 'Ouvir o coração', starter: 'Ouvimos o coração pela primeira vez', from: 6 },
  { id: 'ultrassom', title: 'Ver o bebê no ultrassom', starter: 'A primeira vez que vimos você', from: 7 },
  { id: 'barriga', title: 'A barriga aparecer', starter: 'A barriga apareceu', from: 12 },
  { id: 'chute', title: 'Sentir o primeiro chute', starter: 'Sentimos você mexer pela primeira vez', from: 16 },
  { id: 'sexo', title: 'Saber se é menino ou menina', starter: 'Descobrimos que', from: 12 },
  { id: 'nome', title: 'Escolher o nome', starter: 'Escolhemos o seu nome', from: 12 },
  { id: 'roupinha', title: 'A primeira roupinha', starter: 'A primeira roupinha', from: 8 },
  { id: 'cantinho', title: 'Montar o cantinho', starter: 'Montamos o seu cantinho', from: 20 },
  { id: 'cha', title: 'O chá de bebê', starter: 'O chá de bebê', from: 24 },
  { id: 'mala', title: 'A mala pronta', starter: 'A mala da maternidade está pronta', from: 32 },
];

export const FIRST_TIME_IDS = FIRST_TIMES.map(f => f.id);
export const firstTimeOf = (id: string | null | undefined) => FIRST_TIMES.find(f => f.id === id) ?? null;
