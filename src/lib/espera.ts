// A espera: menino ou menina? Cada casal vive de um jeito (ainda não sabem,
// vão descobrir num exame, guardaram como surpresa para o outro, escolheram
// esperar até o parto, já sabem). Aqui ficam o estado de cada um e as contas
// do bolão; as telas só mostram.

export type Sex = 'menina' | 'menino';
export type SexPlan = 'descobrir' | 'surpresa';
export type GuessRole = 'mae' | 'pai' | 'familia';

export interface Espera {
  plan: SexPlan | null;
  testDate: string | null;
  sex: Sex | null;
  knownAt: string | null;
  secret: boolean;
  secretMine: boolean;
  guesses: Array<{ user_id: string; author_role: GuessRole; guess: Sex; mine: boolean }>;
}

/** Em que ponto da espera o casal está. */
export type EsperaStage =
  /** Ninguém contou ainda como vai ser. */
  | 'pergunta'
  /** Vão descobrir: o bolão está aberto (e, se marcaram, a contagem para o exame). */
  | 'bolao'
  /** Escolheram esperar até o parto. */
  | 'surpresa'
  /** A outra pessoa guardou o resultado para eu abrir. */
  | 'envelope'
  /** Eu guardei o resultado para a outra pessoa abrir. */
  | 'guardado'
  /** Já sabem. */
  | 'sabem';

export function esperaStage(e: Espera): EsperaStage {
  if (e.secret) return e.secretMine ? 'guardado' : 'envelope';
  if (e.sex) return 'sabem';
  if (e.plan === 'surpresa') return 'surpresa';
  if (e.plan === 'descobrir' || e.guesses.length > 0) return 'bolao';
  return 'pergunta';
}

export const SEX_WORD: Record<Sex, { it: string; title: string; emoji: string }> = {
  menina: { it: 'é menina', title: 'É menina', emoji: '💗' },
  menino: { it: 'é menino', title: 'É menino', emoji: '💙' },
};

/** O placar do bolão: quantos palpites em cada e os do casal. */
export function tally(e: Espera) {
  const menina = e.guesses.filter(g => g.guess === 'menina').length;
  const menino = e.guesses.filter(g => g.guess === 'menino').length;
  const family = e.guesses.filter(g => g.author_role === 'familia').length;
  const of = (role: GuessRole) => e.guesses.find(g => g.author_role === role)?.guess ?? null;
  return { menina, menino, total: menina + menino, family, mae: of('mae'), pai: of('pai'), mine: e.guesses.find(g => g.mine)?.guess ?? null };
}

/** Quem acertou, depois da revelação. */
export const rightGuesses = (e: Espera) => (e.sex ? e.guesses.filter(g => g.guess === e.sex) : []);

/** Dias até o exame marcado (nulo sem data ou se já passou). */
export function daysToTest(e: Espera, today: string): number | null {
  if (!e.testDate || e.sex) return null;
  const [y, m, d] = e.testDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
  return days >= 0 ? days : null;
}

/** As ideias de nome que valem agora: as do sexo do bebê e as que servem para os dois. */
export function namesFor<T extends { for_sex?: Sex | 'ambos' }>(ideas: T[], sex: Sex | null): T[] {
  return sex ? ideas.filter(i => (i.for_sex ?? 'ambos') === 'ambos' || i.for_sex === sex) : ideas;
}
