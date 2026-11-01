import { randomBytes } from 'node:crypto';
import { query } from './db.js';
import { HttpError } from './http.js';

// A espera (migração 035): menino ou menina? O plano do casal, o dia do exame,
// o resultado (que pode ficar guardado como surpresa para a outra pessoa), e o
// bolão de palpites do casal e da família.

/** O resultado (e o palpite): menina ou menino; para gêmeos, duas meninas, dois meninos ou um casal (migração 037). */
export type Sex = 'menina' | 'menino' | 'meninas' | 'meninos' | 'casal';
export type SexPlan = 'descobrir' | 'surpresa';
export const SINGLE: Sex[] = ['menina', 'menino'];
/** Como cada resultado se diz: "é menina", "são duas meninas"… e o palpite ("duas meninas"). */
export const SEX_SAY: Record<Sex, { it: string; guess: string; emoji: string }> = {
  menina: { it: 'é menina', guess: 'menina', emoji: '💗' },
  menino: { it: 'é menino', guess: 'menino', emoji: '💙' },
  meninas: { it: 'são duas meninas', guess: 'duas meninas', emoji: '💗💗' },
  meninos: { it: 'são dois meninos', guess: 'dois meninos', emoji: '💙💙' },
  casal: { it: 'é um casal', guess: 'um casal', emoji: '💗💙' },
};
export const TWINS: Sex[] = ['meninas', 'casal', 'meninos'];
/** As opções que valem para quantos bebês o casal espera. */
export const optionsFor = (babies: number): Sex[] => (babies === 2 ? TWINS : SINGLE);

/** Quantos bebês (1 ou 2; antes da migração 037, sempre 1). */
export async function babiesOf(fid: string): Promise<number> {
  const [f] = await query<{ n: string | null }>(`SELECT to_jsonb(f) ->> 'babies' AS n FROM families f WHERE id = $1`, [fid]).catch(() => []);
  return Number(f?.n) === 2 ? 2 : 1;
}

/** Um bebê ou gêmeos. Mudar apaga os palpites (as opções do bolão mudam) e o resultado, se houver. */
export async function setBabies(fid: string, babies: 1 | 2) {
  const before = await babiesOf(fid);
  await query('UPDATE families SET babies = $2 WHERE id = $1', [fid, babies]).catch(err => {
    if ((err as { code?: string }).code === '42703') throw new HttpError(503, 'Gêmeos ainda não estão ligados no servidor. Rode a migração db/migrations/037_gemeos.sql no Neon.');
    throw err;
  });
  if (before === babies) return;
  const valid = optionsFor(babies);
  // Os palpites não são apagados: os que não valem para a nova quantidade ficam
  // guardados (fora do placar) e voltam se o casal desfizer a mudança.
  await query(`UPDATE families SET baby_sex = NULL, sex_known_at = NULL, sex_secret_by = NULL, sex_sealed = false WHERE id = $1 AND NOT (baby_sex = ANY($2))`, [fid, valid]).catch(() => undefined);
}

/** O palpite ou o resultado precisa valer para quantos bebês são. */
async function checkOption(fid: string, value: Sex) {
  const babies = await babiesOf(fid);
  if (!optionsFor(babies).includes(value)) throw new HttpError(400, babies === 2 ? 'Para gêmeos, as opções são duas meninas, dois meninos ou um casal.' : 'As opções são menina ou menino.');
}

export interface Espera {
  plan: SexPlan | null;
  testDate: string | null;
  /** O resultado, para quem pode ver (nulo enquanto é surpresa de outra pessoa). */
  sex: Sex | null;
  knownAt: string | null;
  /** Há um resultado guardado como surpresa. */
  secret: boolean;
  /** Fui eu que guardei a surpresa (eu já sei). */
  secretMine: boolean;
  guesses: Array<{ user_id: string; author_role: 'mae' | 'pai' | 'familia'; guess: Sex; mine: boolean; name: string; at: string }>;
  /** O resultado foi guardado por alguém de fora (o envelope do chá, migração 036). */
  sealed?: boolean;
  /** O link do bolão aberto e o do envelope do chá, quando já existem (migração 036). */
  bolaoToken?: string | null;
  envelopeToken?: string | null;
  /** Os palpites de quem votou pelo link (nome e palpite). */
  publicVotes?: Array<{ name: string; guess: Sex; at: string }>;
  /** Quantos bebês: 1, ou 2 para gêmeos (migração 037). */
  babies?: number;
  /** Palpites guardados fora do placar (de quando era um bebê, ou gêmeos): voltam se o casal desfizer a mudança. */
  parked?: number;
}

export const ESPERA_MISSING = 'A espera (menino ou menina) ainda não está ligada no servidor. Rode a migração db/migrations/035_a_espera.sql no Neon.';
const missing = (err: unknown): never => {
  const code = (err as { code?: string }).code;
  if (code === '42P01' || code === '42703') throw new HttpError(503, ESPERA_MISSING);
  throw err;
};

/** A espera do espaço, do ponto de vista de quem pede; nulo antes da migração. */
export async function fetchEspera(fid: string, userId: string): Promise<Espera | null> {
  try {
    const [f] = await query<{ plan: SexPlan | null; test_date: string | null; sex: Sex | null; known_at: string | null; secret_by: string | null; sealed: boolean | null; bolao: string | null; envelope: string | null }>(
      `SELECT sex_plan AS plan, sex_test_date::text AS test_date, baby_sex AS sex, sex_known_at::text AS known_at, sex_secret_by AS secret_by,
              (to_jsonb(f) ->> 'sex_sealed')::boolean AS sealed, to_jsonb(f) ->> 'bolao_token' AS bolao, to_jsonb(f) ->> 'envelope_token' AS envelope
       FROM families f WHERE id = $1`,
      [fid],
    );
    const guesses = await query<Espera['guesses'][number]>(
      `SELECT g.user_id, g.author_role, g.guess, g.user_id = $2 AS mine, split_part(trim(COALESCE(u.name, '')), ' ', 1) AS name, g.created_at::text AS at
       FROM sex_guesses g LEFT JOIN "user" u ON u.id = g.user_id WHERE g.family_id = $1 ORDER BY g.created_at`,
      [fid, userId],
    );
    const publicVotes = await query<{ name: string; guess: Sex; at: string }>('SELECT name, guess, created_at::text AS at FROM bolao_votes WHERE family_id = $1 ORDER BY created_at', [fid]).catch(() => [] as Array<{ name: string; guess: Sex; at: string }>);
    if (!f) return null;
    const sealed = !!f.sealed && !!f.sex;
    const secret = (!!f.secret_by && !!f.sex) || sealed;
    const secretMine = secret && !sealed && f.secret_by === userId;
    const hidden = secret && !secretMine;
    const babies = await babiesOf(fid);
    const valid = optionsFor(babies);
    const ok = (g: { guess: Sex }) => valid.includes(g.guess);
    const parked = guesses.filter(g => !ok(g)).length + publicVotes.filter(v => !ok(v)).length;
    return { plan: f.plan, testDate: f.test_date, sex: hidden ? null : f.sex, knownAt: hidden ? null : f.known_at, secret, secretMine, guesses: guesses.filter(ok), sealed, bolaoToken: f.bolao, envelopeToken: f.envelope, publicVotes: publicVotes.filter(ok), babies, parked };
  } catch {
    return null;
  }
}

export async function setSexPlan(fid: string, plan: SexPlan | null, testDate: string | null) {
  await query('UPDATE families SET sex_plan = $2, sex_test_date = $3 WHERE id = $1', [fid, plan, plan === 'surpresa' ? null : testDate]).catch(missing);
}

/** Guarda o resultado (ou apaga, com nulo). Com `secret`, só quem guardou vê até a outra pessoa abrir. */
export async function setSex(fid: string, userId: string, sex: Sex | null, secret: boolean) {
  if (sex) await checkOption(fid, sex);
  await query(
    `UPDATE families SET baby_sex = $2::varchar, sex_known_at = CASE WHEN $2::varchar IS NULL THEN NULL ELSE NOW() END,
            sex_secret_by = CASE WHEN $3::boolean AND $2::varchar IS NOT NULL THEN $4::text ELSE NULL END,
            sex_plan = CASE WHEN $2::varchar IS NULL THEN sex_plan ELSE 'descobrir' END
      WHERE id = $1`,
    [fid, sex, secret, userId],
  ).catch(missing);
  // Registrado pelo casal: o envelope do chá (se havia um) deixa de valer.
  await query('UPDATE families SET sex_sealed = false, envelope_token = NULL WHERE id = $1', [fid]).catch(() => undefined);
}

/** Abrir a surpresa: a partir daí, todo mundo do espaço vê. */
export async function openSex(fid: string, userId: string) {
  // O envelope do chá (guardado por alguém de fora) qualquer um do casal abre; o do parceiro, só quem não guardou.
  const sealed = await query(`UPDATE families SET sex_sealed = false WHERE id = $1 AND sex_sealed AND baby_sex IS NOT NULL RETURNING id`, [fid]).catch(() => []);
  if (sealed.length) return;
  const rows = await query('UPDATE families SET sex_secret_by = NULL WHERE id = $1 AND sex_secret_by IS NOT NULL AND sex_secret_by <> $2 RETURNING id', [fid, userId]).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Não há revelação esperando por você.');
}

const token = () => randomBytes(12).toString('base64url');

/** O link do bolão aberto (cria na primeira vez). */
export async function bolaoLink(fid: string) {
  const [f] = await query<{ t: string | null }>('SELECT bolao_token AS t FROM families WHERE id = $1', [fid]).catch(missing);
  if (f?.t) return f.t;
  const t = token();
  await query('UPDATE families SET bolao_token = $2 WHERE id = $1', [fid, t]).catch(missing);
  return t;
}

/** O link do envelope do chá: um link novo a cada pedido (o anterior deixa de valer). */
export async function envelopeLink(fid: string) {
  const t = token();
  await query('UPDATE families SET envelope_token = $2 WHERE id = $1', [fid, t]).catch(missing);
  return t;
}

/** O palpite no bolão (nulo apaga). Depois que o resultado é conhecido, o bolão fecha. */
export async function guessSex(fid: string, userId: string, role: 'mae' | 'pai' | 'familia', guess: Sex | null) {
  const [f] = await query<{ sex: string | null }>('SELECT baby_sex AS sex FROM families WHERE id = $1', [fid]).catch(missing);
  if (f?.sex) throw new HttpError(409, 'O bolão já fechou: vocês já sabem!');
  if (!guess) {
    await query('DELETE FROM sex_guesses WHERE family_id = $1 AND user_id = $2', [fid, userId]);
    return;
  }
  await checkOption(fid, guess);
  await query(
    `INSERT INTO sex_guesses (family_id, user_id, author_role, guess) VALUES ($1, $2, $3, $4)
     ON CONFLICT (family_id, user_id) DO UPDATE SET guess = EXCLUDED.guess, created_at = NOW()`,
    [fid, userId, role, guess],
  ).catch(missing);
}

/** Para quem é o nome (menina, menino ou os dois) e se está na lista final. */
export async function tagNameIdea(fid: string, id: string, f: { forSex?: Sex | 'ambos'; finalist?: boolean }) {
  const rows = await query(
    `UPDATE baby_name_ideas SET for_sex = COALESCE($3::varchar, for_sex), finalist = COALESCE($4::boolean, finalist) WHERE id = $1 AND family_id = $2 RETURNING id`,
    [id, fid, f.forSex ?? null, f.finalist ?? null],
  ).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Nome não encontrado.');
}
