// A espera: menino ou menina? Cada casal vive de um jeito (ainda não sabem,
// vão descobrir num exame, guardaram como surpresa para o outro, escolheram
// esperar até o parto, já sabem). Aqui ficam o estado de cada um e as contas
// do bolão; as telas só mostram.

/** O resultado (e o palpite): menina ou menino; para gêmeos, duas meninas, dois meninos ou um casal (migração 037). */
export type Sex = 'menina' | 'menino' | 'meninas' | 'meninos' | 'casal';
export type SexPlan = 'descobrir' | 'surpresa';
export type Tone = 'rosa' | 'azul' | 'lilas';

/** Como cada resultado aparece: o botão, o time, a revelação e a cor. */
export const OPTION: Record<Sex, { label: string; team: string; title: string; it: string; emoji: string; tone: Tone }> = {
  menina: { label: 'Menina', team: 'Time Menina', title: 'É menina', it: 'é menina', emoji: '💗', tone: 'rosa' },
  menino: { label: 'Menino', team: 'Time Menino', title: 'É menino', it: 'é menino', emoji: '💙', tone: 'azul' },
  meninas: { label: 'Duas meninas', team: 'Time Meninas', title: 'São duas meninas', it: 'são duas meninas', emoji: '💗💗', tone: 'rosa' },
  meninos: { label: 'Dois meninos', team: 'Time Meninos', title: 'São dois meninos', it: 'são dois meninos', emoji: '💙💙', tone: 'azul' },
  casal: { label: 'Um casal', team: 'Time Casal', title: 'É um casal', it: 'é um casal', emoji: '💗💙', tone: 'lilas' },
};

/** As opções do bolão (e do resultado): menina ou menino; para gêmeos, as três combinações. */
export const optionsFor = (twins: boolean): Sex[] => (twins ? ['meninas', 'casal', 'meninos'] : ['menina', 'menino']);
export const isTwins = (e: { babies?: number } | null | undefined) => e?.babies === 2;
/** A pergunta do bolão: "Menino ou menina?" (ou, para gêmeos, "Meninas, meninos ou um casal?"). */
export const questionFor = (twins: boolean) => (twins ? 'Meninas, meninos ou um casal?' : 'Menino ou menina?');
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
  /** Quantos bebês: 1, ou 2 para gêmeos (migração 037). */
  babies?: number;
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

export const SEX_WORD = OPTION;

/** O placar do bolão: quantos palpites em cada opção e os do casal. */
export function tally(e: Espera) {
  const outside = e.publicVotes ?? [];
  const options = optionsFor(isTwins(e));
  const counts = Object.fromEntries(options.map(o => [o, e.guesses.filter(g => g.guess === o).length + outside.filter(v => v.guess === o).length])) as Partial<Record<Sex, number>>;
  const total = options.reduce((n, o) => n + (counts[o] ?? 0), 0);
  const family = e.guesses.filter(g => g.author_role === 'familia').length + outside.length;
  const of = (role: GuessRole) => e.guesses.find(g => g.author_role === role)?.guess ?? null;
  return { options, counts, menina: counts.menina ?? 0, menino: counts.menino ?? 0, total, family, mae: of('mae'), pai: of('pai'), mine: e.guesses.find(g => g.mine)?.guess ?? null };
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

/** As ideias de nome que valem agora: as do sexo do bebê (ou dos bebês) e as que servem para os dois. */
export function namesFor<T extends { for_sex?: 'menina' | 'menino' | 'ambos' }>(ideas: T[], sex: Sex | null): T[] {
  if (!sex || sex === 'casal') return ideas;
  const want = sex === 'meninas' ? 'menina' : sex === 'meninos' ? 'menino' : sex;
  return ideas.filter(i => (i.for_sex ?? 'ambos') === 'ambos' || i.for_sex === want);
}

/** Quantos acertaram, contando quem votou pelo link. */
export const rightCount = (e: Espera) => (e.sex ? rightGuesses(e).length + (e.publicVotes ?? []).filter(v => v.guess === e.sex).length : 0);

/** Os links públicos (o bolão aberto e o envelope do chá). */
export const bolaoUrl = (token: string) => `${window.location.origin}/?palpite=${token}`;
export const envelopeUrl = (token: string) => `${window.location.origin}/?envelope=${token}`;

/** Os times do bolão: os nomes em cada opção. */
export type Teams = Partial<Record<Sex, string[]>>;

/** Os times do bolão: o casal primeiro, depois a família e quem votou pelo link. */
export function teamsOf(e: Espera, me = 'Você'): Teams {
  const name = (g: Espera['guesses'][number]) => (g.mine ? me : g.name || (g.author_role === 'mae' ? 'Mãe' : g.author_role === 'pai' ? 'Pai' : 'Família'));
  const team = (s: Sex) => [
    ...e.guesses.filter(g => g.author_role !== 'familia' && g.guess === s).map(name),
    ...e.guesses.filter(g => g.author_role === 'familia' && g.guess === s).map(name),
    ...(e.publicVotes ?? []).filter(v => v.guess === s).map(v => v.name),
  ];
  return Object.fromEntries(optionsFor(isTwins(e)).map(o => [o, team(o)]));
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

/** As porcentagens de cada opção (iguais sem palpites; a soma dá 100). */
export function percents(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map((_, i) => (i === 0 ? 100 - Math.floor(100 / values.length) * (values.length - 1) : Math.floor(100 / values.length)));
  const raw = values.map(v => Math.round((v / total) * 100));
  raw[raw.indexOf(Math.max(...raw))] += 100 - raw.reduce((a, b) => a + b, 0);
  return raw;
}

/** As cores de cada time (classes do Tailwind), iguais em todas as telas. */
export const TEAM_TONE: Record<Sex, { text: string; chip: string; bar: string }> = {
  menina: { text: 'text-rosa-strong', chip: 'bg-rosa-soft text-rosa-strong', bar: 'bg-rosa' },
  meninas: { text: 'text-rosa-strong', chip: 'bg-rosa-soft text-rosa-strong', bar: 'bg-rosa' },
  menino: { text: 'text-azul-strong', chip: 'bg-azul-soft text-azul-strong', bar: 'bg-azul' },
  meninos: { text: 'text-azul-strong', chip: 'bg-azul-soft text-azul-strong', bar: 'bg-azul' },
  casal: { text: 'text-lilas-strong', chip: 'bg-lilas-soft text-lilas-strong', bar: 'bg-lilas' },
};
