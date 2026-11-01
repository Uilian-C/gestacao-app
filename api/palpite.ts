import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query } from './_lib/db.js';
import { HttpError, endpoint, json, readJson } from './_lib/http.js';
import { notify } from './_lib/push.js';

// O bolão aberto e o envelope do chá (migração 036): páginas públicas, sem
// conta. Quem recebe o link no WhatsApp vota em menino ou menina (um palpite
// por aparelho) e, quando o casal descobre, vê se acertou. O envelope é para
// quem guarda o segredo do chá revelação: registra o resultado e só o casal
// abre, junto. Só sai daqui o que a página mostra: os primeiros nomes do
// casal, a semana, o plano, o placar, os palpites e o resultado já revelado.

const COOKIE = 'tt_palpite';
const MAX_VOTES = 1500;
const TOKEN = z.string().regex(/^[A-Za-z0-9_-]{8,32}$/);

type Sex = 'menina' | 'menino';
interface FamilyRow {
  id: string;
  dum: string | null;
  plan: string | null;
  test_date: string | null;
  sex: Sex | null;
  secret_by: string | null;
  sealed: boolean;
  care: string | null;
}

const FAMILY_SQL = (col: 'bolao_token' | 'envelope_token') =>
  `SELECT id::text AS id, dum_date::text AS dum, sex_plan AS plan, sex_test_date::text AS test_date, baby_sex AS sex, sex_secret_by AS secret_by,
          sex_sealed AS sealed, to_jsonb(f) ->> 'care_since' AS care
   FROM families f WHERE ${col} = $1`;

async function familyBy(col: 'bolao_token' | 'envelope_token', t: string) {
  const parsed = TOKEN.safeParse(t);
  if (!parsed.success) throw new HttpError(404, 'Link não encontrado.');
  const [f] = await query<FamilyRow>(FAMILY_SQL(col), [parsed.data]).catch(() => []);
  // No modo cuidado (uma perda), os links param de funcionar.
  if (!f || f.care) throw new HttpError(404, 'Este link não está mais ativo.');
  return f;
}

async function coupleOf(fid: string) {
  const rows = await query<{ name: string; role: string; user_id: string }>(
    `SELECT u.name, m.role, m.user_id FROM family_members m JOIN "user" u ON u.id = m.user_id WHERE m.family_id = $1 AND m.role <> 'familia' ORDER BY m.role`,
    [fid],
  );
  const names = rows.map(r => r.name.trim().split(/\s+/)[0]).filter(Boolean);
  return { names: names.join(' e ') || 'O casal', ids: rows.map(r => r.user_id) };
}

function voterOf(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]{16,64})`));
  return m?.[1] ?? null;
}

const weekOf = (dum: string | null) => (dum ? Math.floor((Date.now() - Date.parse(`${dum}T12:00:00Z`)) / (7 * 86_400_000)) : null);

const track = (fid: string, kind: 'bolao_visita' | 'bolao_voto' | 'bolao_conhecer') => query('INSERT INTO product_events (family_id, kind) VALUES ($1, $2)', [fid, kind]).catch(() => undefined);

async function bolaoView(f: FamilyRow, voter: string | null) {
  const couple = await coupleOf(f.id);
  const [inside, outside] = await Promise.all([
    query<{ guess: Sex; name: string; role: string; at: string }>(
      `SELECT g.guess, split_part(trim(COALESCE(u.name, '')), ' ', 1) AS name, g.author_role AS role, g.created_at::text AS at
       FROM sex_guesses g LEFT JOIN "user" u ON u.id = g.user_id WHERE g.family_id = $1`,
      [f.id],
    ),
    query<{ name: string; guess: Sex; voter: string; at: string }>('SELECT name, guess, voter, created_at::text AS at FROM bolao_votes WHERE family_id = $1 ORDER BY created_at DESC', [f.id]),
  ]);
  // Os times: o casal primeiro, depois a família e quem votou pelo link (os mais recentes primeiro).
  const pair = inside.filter(g => g.role !== 'familia');
  const team = (s: Sex) => [...pair.filter(g => g.guess === s).map(g => g.name), ...inside.filter(g => g.role === 'familia' && g.guess === s).map(g => g.name), ...outside.filter(v => v.guess === s).map(v => v.name)].filter(Boolean);
  const latest = [...inside.map(g => ({ name: g.name, guess: g.guess, at: g.at })), ...outside.map(v => ({ name: v.name, guess: v.guess, at: v.at }))].filter(v => v.name).sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  const all = [...inside, ...outside];
  const revealed = f.sex && !f.secret_by && !f.sealed ? f.sex : null;
  const mine = voter ? outside.find(v => v.voter === voter) : undefined;
  const week = weekOf(f.dum);
  return {
    couple: couple.names,
    week: week !== null && week >= 0 && week <= 42 ? week : null,
    plan: f.plan,
    testDate: revealed ? null : f.test_date,
    revealed,
    tally: { menina: all.filter(g => g.guess === 'menina').length, menino: all.filter(g => g.guess === 'menino').length },
    recent: outside.slice(0, 12).map(v => ({ name: v.name, guess: v.guess })),
    teams: { menina: team('menina').slice(0, 30), menino: team('menino').slice(0, 30) },
    latest,
    mine: mine ? { name: mine.name, guess: mine.guess } : null,
  };
}

export const GET = endpoint(async request => {
  const url = new URL(request.url);
  const envelope = url.searchParams.get('envelope');
  if (envelope) {
    const f = await familyBy('envelope_token', envelope);
    return json({ couple: (await coupleOf(f.id)).names });
  }
  const f = await familyBy('bolao_token', url.searchParams.get('t') ?? '');
  const voter = voterOf(request);
  // Conta a visita uma vez por aparelho (o cookie só nasce no voto; antes dele, toda visita conta).
  if (!voter) await track(f.id, 'bolao_visita');
  return json(await bolaoView(f, voter));
});

const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('vote'), t: z.string(), name: z.string().trim().min(2).max(40), guess: z.enum(['menina', 'menino']) }),
  z.object({ op: z.literal('seal'), envelope: z.string(), sex: z.enum(['menina', 'menino']) }),
  z.object({ op: z.literal('conhecer'), t: z.string() }),
  z.object({ op: z.literal('unvote'), t: z.string() }),
]);

export const POST = endpoint(async request => {
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Dados inválidos.');
  const o = parsed.data;

  if (o.op === 'seal') {
    const f = await familyBy('envelope_token', o.envelope);
    // Um envelope só fecha uma vez: o link deixa de valer na hora.
    const rows = await query(
      `UPDATE families SET baby_sex = $2, sex_known_at = NOW(), sex_sealed = true, sex_secret_by = NULL, sex_plan = 'descobrir', envelope_token = NULL
       WHERE id = $1 AND envelope_token = $3 RETURNING id`,
      [f.id, o.sex, o.envelope],
    );
    if (rows.length === 0) throw new HttpError(404, 'Este envelope já foi fechado.');
    const couple = await coupleOf(f.id);
    await notify(couple.ids, 'parceiro', { title: 'O segredo do chá está guardado 💌', body: 'Menino ou menina? Abram juntos, na hora da revelação.', url: '/?revelar=1', tag: 'revelacao' }).catch(err => console.error('Aviso do envelope não enviado', err));
    return json({ ok: true });
  }

  const f = await familyBy('bolao_token', o.t);
  if (o.op === 'conhecer') {
    await track(f.id, 'bolao_conhecer');
    return json({ ok: true });
  }
  if (o.op === 'unvote') {
    // Sair do bolão: apaga o palpite deste aparelho (e o nome sai do placar).
    const voter = voterOf(request);
    if (voter) await query('DELETE FROM bolao_votes WHERE family_id = $1 AND voter = $2', [f.id, voter]);
    return json(await bolaoView(f, voter));
  }
  if (f.sex && !f.secret_by && !f.sealed) throw new HttpError(409, 'O bolão já fechou: eles já descobriram!');
  let voter = voterOf(request);
  const fresh = !voter;
  voter ??= randomBytes(24).toString('base64url');
  const [count] = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM bolao_votes WHERE family_id = $1', [f.id]);
  if (count.n >= MAX_VOTES) throw new HttpError(429, 'O bolão já recebeu palpites demais.');
  const rows = await query<{ inserted: boolean }>(
    `INSERT INTO bolao_votes (family_id, voter, name, guess) VALUES ($1, $2, $3, $4)
     ON CONFLICT (family_id, voter) DO UPDATE SET name = EXCLUDED.name, guess = EXCLUDED.guess
     RETURNING (xmax = 0) AS inserted`,
    [f.id, voter, o.name, o.guess],
  );
  if (rows[0]?.inserted) await track(f.id, 'bolao_voto');
  const res = json(await bolaoView(f, voter));
  if (fresh) res.headers.append('Set-Cookie', `${COOKIE}=${voter}; Path=/api/palpite; Max-Age=31536000; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
  return res;
});
