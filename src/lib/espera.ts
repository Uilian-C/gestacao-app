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
  guesses: Array<{ user_id: string; author_role: GuessRole; guess: Sex; mine: boolean; name?: string; at?: string }>;
  /** O resultado foi guardado por alguém de fora, para o chá revelação (migração 036). */
  sealed?: boolean;
  /** O link do bolão aberto e o do envelope do chá (migração 036). */
  bolaoToken?: string | null;
  envelopeToken?: string | null;
  /** Os palpites de quem votou pelo link. */
  publicVotes?: Array<{ name: string; guess: Sex; at?: string }>;
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
  if (e.sealed) return 'envelope';
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
  const outside = e.publicVotes ?? [];
  const menina = e.guesses.filter(g => g.guess === 'menina').length + outside.filter(v => v.guess === 'menina').length;
  const menino = e.guesses.filter(g => g.guess === 'menino').length + outside.filter(v => v.guess === 'menino').length;
  const family = e.guesses.filter(g => g.author_role === 'familia').length + outside.length;
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

/** Quantos acertaram, contando quem votou pelo link. */
export const rightCount = (e: Espera) => (e.sex ? rightGuesses(e).length + (e.publicVotes ?? []).filter(v => v.guess === e.sex).length : 0);

/** Os links públicos (o bolão aberto e o envelope do chá). */
export const bolaoUrl = (token: string) => `${window.location.origin}/?palpite=${token}`;
export const envelopeUrl = (token: string) => `${window.location.origin}/?envelope=${token}`;

export interface Teams {
  menina: string[];
  menino: string[];
}

/** Os dois times do bolão: o casal primeiro, depois a família e quem votou pelo link. */
export function teamsOf(e: Espera, me = 'Você'): Teams {
  const name = (g: Espera['guesses'][number]) => (g.mine ? me : g.name || (g.author_role === 'mae' ? 'Mãe' : g.author_role === 'pai' ? 'Pai' : 'Família'));
  const team = (s: Sex) => [
    ...e.guesses.filter(g => g.author_role !== 'familia' && g.guess === s).map(name),
    ...e.guesses.filter(g => g.author_role === 'familia' && g.guess === s).map(name),
    ...(e.publicVotes ?? []).filter(v => v.guess === s).map(v => v.name),
  ];
  return { menina: team('menina'), menino: team('menino') };
}

/** O palpite mais recente ("Léo entrou para o Time Menino"). */
export function latestVote(e: Espera, me = 'Você') {
  const all = [
    ...e.guesses.map(g => ({ name: g.mine ? me : g.name || 'Alguém', guess: g.guess, at: g.at ?? '' })),
    ...(e.publicVotes ?? []).map(v => ({ name: v.name, guess: v.guess, at: v.at ?? '' })),
  ].filter(v => v.at);
  return all.sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias". */
export function agoText(at: string, now = Date.now()): string {
  // O Postgres manda "2026-11-01 11:00:00.12+00": vira ISO para o navegador ler.
  const t = Date.parse(at.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((now - t) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

/** As porcentagens dos dois times (50/50 sem palpites). */
export function shares(menina: number, menino: number) {
  const total = menina + menino;
  const m = total ? Math.round((menina / total) * 100) : 50;
  return { menina: m, menino: 100 - m, total };
}
