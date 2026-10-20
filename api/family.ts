import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { CONSENT_VERSION, hasConsent } from './_lib/consent.js';
import { query, transaction } from './_lib/db.js';
import { familyState } from './_lib/family.js';
import { deleteFiles } from './_lib/storage.js';
import { fetchAll, fetchFamilyView } from './_lib/gestation.js';
import { COUPLE_ONLY, HttpError, accessOf, endpoint, findMembership, isCouple, json, readJson, requireUser } from './_lib/http.js';

// Espaço da gestação: quem faz parte, convites e papel de cada um. O casal (mãe
// e pai) tem os mesmos poderes; os familiares (migração 023) entram por um
// convite próprio, até as vagas do espaço, e só o casal convida ou tira alguém.

const INVITE_DAYS = 7;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, fáceis de confundir

function newInviteCode() {
  const bytes = randomBytes(10);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
const role = z.enum(['mae', 'pai']);
// "Avó", "Tio", "Madrinha"...: como a pessoa aparece no Mural.
const relation = z.string().trim().min(1).max(30);
const MIGRATION_HINT = 'Os familiares ainda não estão ligados no servidor. Rode a migração db/migrations/023_familiares.sql no Neon.';
const COUPLE_SIZE = 2;

const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create'), role }),
  // Convite do casal pede o papel; convite de familiar, o parentesco.
  z.object({ op: z.literal('join'), code: z.string().min(4).max(40), role: role.optional(), relation: relation.optional() }),
  z.object({ op: z.literal('checkInvite'), code: z.string().min(4).max(40) }),
  z.object({ op: z.literal('invite'), kind: z.enum(['casal', 'familia']).default('casal') }),
  z.object({ op: z.literal('setRelation'), userId: z.string().min(1).max(64), relation }),
  z.object({ op: z.literal('setRole'), role }),
  z.object({ op: z.literal('removeMember'), userId: z.string().min(1).max(64) }),
  z.object({ op: z.literal('consent'), version: z.string().max(20) }),
  // O nome que aparece para a outra pessoa (Mural, conversas, "Vocês dois hoje").
  z.object({ op: z.literal('rename'), name: z.string().trim().min(1).max(60) }),
]);

/** Convite válido: existe, não foi usado e não venceu. */
async function findInvite(code: string) {
  const rows = await query<{ code: string; family_id: string; inviter: string | null; inviter_role: string | null; kind: string }>(
    `SELECT i.code, i.family_id::text AS family_id, u.name AS inviter, m.role AS inviter_role, COALESCE(to_jsonb(i)->>'kind', 'casal') AS kind
     FROM family_invites i
     LEFT JOIN "user" u ON u.id = i.created_by
     LEFT JOIN family_members m ON m.user_id = i.created_by AND m.family_id = i.family_id
     WHERE i.code = $1 AND i.used_at IS NULL AND i.expires_at > NOW()`,
    [normalizeCode(code)],
  );
  return rows[0] ?? null;
}

export const GET = endpoint(async request => {
  const user = await requireUser(request);
  const { member, consented, consentedBefore } = await accessOf(user.id);
  // Quem já pode ver os dados recebe tudo nesta mesma resposta: abrir o app é uma chamada só.
  const [family, data] = await Promise.all([
    familyState(user.id, member),
    member && consented ? (isCouple(member) ? fetchAll(member.familyId, user.id) : fetchFamilyView(member.familyId, user.id)) : null,
  ]);
  return json({
    user: { id: user.id, name: user.name, email: user.email },
    consent: { version: CONSENT_VERSION, accepted: consented, previous: consentedBefore },
    family,
    ...(data ? { data } : {}),
  });
});

export const POST = endpoint(async request => {
  const user = await requireUser(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Dados inválidos.');
  const o = parsed.data;

  if (o.op === 'consent') {
    if (o.version !== CONSENT_VERSION) throw new HttpError(409, 'Os termos foram atualizados. Recarregue a página.');
    await query('INSERT INTO user_consents (user_id, version) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, CONSENT_VERSION]);
    return json({ ok: true });
  }
  // Nada de criar ou entrar em espaço sem o consentimento para dados de saúde.
  if (o.op !== 'checkInvite' && !(await hasConsent(user.id))) throw new HttpError(403, 'Aceite os Termos e a Política de Privacidade para continuar.');

  const member = await findMembership(user.id);

  switch (o.op) {
    case 'create': {
      if (member) throw new HttpError(409, 'Você já faz parte de um espaço.');
      await transaction(async client => {
        const { rows } = await client.query('INSERT INTO families DEFAULT VALUES RETURNING id');
        await client.query('INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)', [rows[0].id, user.id, o.role]);
      });
      break;
    }
    case 'checkInvite': {
      const invite = await findInvite(o.code);
      return json({ valid: !!invite, inviter: invite?.inviter ?? null, inviterRole: invite?.inviter_role ?? null, kind: invite?.kind ?? null });
    }
    case 'join': {
      if (member) throw new HttpError(409, 'Você já faz parte de um espaço. Saia dele antes de aceitar outro convite.');
      const joined = await transaction(async client => {
        // FOR UPDATE: duas pessoas não conseguem usar o mesmo convite ao mesmo tempo.
        const { rows } = await client.query(
          `SELECT family_id, COALESCE(to_jsonb(i)->>'kind', 'casal') AS kind FROM family_invites i
           WHERE code = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`,
          [normalizeCode(o.code)],
        );
        if (!rows[0]) return false;
        const fid = rows[0].family_id;
        // A família inteira travada: as vagas não estouram com duas pessoas entrando juntas.
        const { rows: space } = await client.query(`SELECT to_jsonb(f)->>'family_slots' AS slots FROM families f WHERE id = $1 FOR UPDATE`, [fid]);
        const { rows: people } = await client.query('SELECT role FROM family_members WHERE family_id = $1', [fid]);
        if (rows[0].kind === 'familia') {
          const used = people.filter(p => p.role === 'familia').length;
          if (used >= Number(space[0]?.slots ?? 0)) throw new HttpError(409, 'O espaço já está com todas as vagas de familiares ocupadas. Fale com quem convidou.');
          await client.query('INSERT INTO family_members (family_id, user_id, role, relation) VALUES ($1, $2, $3, $4)', [fid, user.id, 'familia', o.relation ?? 'Família']);
        } else {
          if (!o.role) throw new HttpError(400, 'Escolha se você é a mãe ou o pai.');
          if (people.filter(p => p.role !== 'familia').length >= COUPLE_SIZE) throw new HttpError(409, 'Este espaço já tem a mãe e o pai.');
          await client.query('INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)', [fid, user.id, o.role]);
        }
        await client.query('UPDATE family_invites SET used_by = $1, used_at = NOW() WHERE code = $2', [user.id, normalizeCode(o.code)]);
        return true;
      });
      if (!joined) throw new HttpError(404, 'Convite inválido, já usado ou vencido. Peça um novo.');
      break;
    }
    case 'invite': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      if (!isCouple(member)) throw new HttpError(403, COUPLE_ONLY);
      const code = newInviteCode();
      if (o.kind === 'familia') {
        const state = await familyState(user.id, member);
        if (state && state.relatives.length >= state.slots) {
          throw new HttpError(409, state.slots === 0 ? MIGRATION_HINT : `O espaço já tem ${state.slots} familiares, o máximo.`);
        }
      }
      const rows = await query<{ expires_at: string }>(
        o.kind === 'familia'
          ? `INSERT INTO family_invites (code, family_id, created_by, expires_at, kind)
             VALUES ($1, $2, $3, NOW() + make_interval(days => $4), 'familia') RETURNING expires_at::text AS expires_at`
          : `INSERT INTO family_invites (code, family_id, created_by, expires_at)
             VALUES ($1, $2, $3, NOW() + make_interval(days => $4)) RETURNING expires_at::text AS expires_at`,
        [code, member.familyId, user.id, INVITE_DAYS],
      ).catch(err => {
        if ((err as { code?: string }).code === '42703') throw new HttpError(503, MIGRATION_HINT);
        throw err;
      });
      return json({ code, expiresAt: rows[0].expires_at });
    }
    case 'setRelation': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      // O casal ajusta o parentesco de qualquer familiar; o familiar, só o dele.
      if (!isCouple(member) && o.userId !== user.id) throw new HttpError(403, COUPLE_ONLY);
      const rows = await query("UPDATE family_members SET relation = $1 WHERE family_id = $2 AND user_id = $3 AND role = 'familia' RETURNING 1", [o.relation, member.familyId, o.userId]);
      if (rows.length === 0) throw new HttpError(404, 'Familiar não encontrado neste espaço.');
      break;
    }
    case 'rename': {
      await query('UPDATE "user" SET name = $1, "updatedAt" = NOW() WHERE id = $2', [o.name.replace(/\s+/g, ' '), user.id]);
      break;
    }
    case 'setRole': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      if (!isCouple(member)) throw new HttpError(403, COUPLE_ONLY);
      await query('UPDATE family_members SET role = $1 WHERE user_id = $2', [o.role, user.id]);
      break;
    }
    case 'removeMember': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      // Familiar só sai (tira a si mesmo); o casal tira qualquer pessoa.
      if (!isCouple(member) && o.userId !== user.id) throw new HttpError(403, COUPLE_ONLY);
      const removed = await transaction(async client => {
        const { rows } = await client.query('SELECT user_id, role FROM family_members WHERE family_id = $1 FOR UPDATE', [member.familyId]);
        const target = rows.find(r => r.user_id === o.userId);
        if (!target) throw new HttpError(404, 'Pessoa não encontrada neste espaço.');
        const couple = rows.filter(r => r.role !== 'familia');
        if (target.role !== 'familia' && couple.length <= 1) {
          throw new HttpError(409, rows.length > 1 ? 'Você é a única pessoa do casal no espaço. Para sair, exclua o espaço.' : 'Você é a única pessoa no espaço. Convide alguém antes de sair.');
        }
        // A conversa e os abraços de um familiar saem com ele.
        if (target.role === 'familia') {
          await client.query('DELETE FROM comments WHERE family_id = $1 AND user_id = $2', [member.familyId, o.userId]);
          await client.query('DELETE FROM reactions WHERE family_id = $1 AND user_id = $2', [member.familyId, o.userId]);
        }
        const { rows: gone } = await client.query(
          "DELETE FROM family_members m WHERE family_id = $1 AND user_id = $2 RETURNING to_jsonb(m)->>'avatar_path' AS avatar",
          [member.familyId, o.userId],
        );
        return { userId: o.userId as string, avatar: gone[0]?.avatar as string | null };
      });
      // A foto de perfil sai junto com a pessoa.
      if (removed.avatar) await deleteFiles([removed.avatar]).catch(err => console.error('Foto de perfil não apagada', err));
      if (removed.userId === user.id) return json({ ok: true, family: null });
      break;
    }
  }
  return json({ ok: true, family: await familyState(user.id) });
});
