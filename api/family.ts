import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { CONSENT_VERSION, hasConsent } from './_lib/consent.js';
import { query, transaction } from './_lib/db.js';
import { HttpError, endpoint, findMembership, json, readJson, requireUser } from './_lib/http.js';

// Espaço da gestação: quem faz parte, convites e papel (mãe ou pai) de cada um.
// Todos os membros têm os mesmos poderes.

const INVITE_DAYS = 7;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, fáceis de confundir

function newInviteCode() {
  const bytes = randomBytes(10);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
const role = z.enum(['mae', 'pai']);

const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create'), role }),
  z.object({ op: z.literal('join'), code: z.string().min(4).max(40), role }),
  z.object({ op: z.literal('checkInvite'), code: z.string().min(4).max(40) }),
  z.object({ op: z.literal('invite') }),
  z.object({ op: z.literal('setRole'), role }),
  z.object({ op: z.literal('removeMember'), userId: z.string().min(1).max(64) }),
  z.object({ op: z.literal('consent'), version: z.string().max(20) }),
]);

async function familyState(userId: string) {
  const member = await findMembership(userId);
  if (!member) return null;
  const members = await query<{ user_id: string; name: string; email: string; role: string; joined_at: string }>(
    `SELECT m.user_id, u.name, u.email, m.role, m.joined_at::text AS joined_at
     FROM family_members m JOIN "user" u ON u.id = m.user_id
     WHERE m.family_id = $1 ORDER BY m.joined_at`,
    [member.familyId],
  );
  return {
    role: member.role,
    members: members.map(m => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role, me: m.user_id === userId })),
  };
}

/** Convite válido: existe, não foi usado e não venceu. */
async function findInvite(code: string) {
  const rows = await query<{ code: string; family_id: string; inviter: string | null; inviter_role: string | null }>(
    `SELECT i.code, i.family_id::text AS family_id, u.name AS inviter, m.role AS inviter_role
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
  return json({
    user: { id: user.id, name: user.name, email: user.email },
    consent: {
      version: CONSENT_VERSION,
      accepted: await hasConsent(user.id),
      previous: (await query('SELECT 1 FROM user_consents WHERE user_id = $1 LIMIT 1', [user.id])).length > 0,
    },
    family: await familyState(user.id),
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
      return json({ valid: !!invite, inviter: invite?.inviter ?? null, inviterRole: invite?.inviter_role ?? null });
    }
    case 'join': {
      if (member) throw new HttpError(409, 'Você já faz parte de um espaço. Saia dele antes de aceitar outro convite.');
      const joined = await transaction(async client => {
        // FOR UPDATE: duas pessoas não conseguem usar o mesmo convite ao mesmo tempo.
        const { rows } = await client.query(
          'SELECT family_id FROM family_invites WHERE code = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE',
          [normalizeCode(o.code)],
        );
        if (!rows[0]) return false;
        await client.query('INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)', [rows[0].family_id, user.id, o.role]);
        await client.query('UPDATE family_invites SET used_by = $1, used_at = NOW() WHERE code = $2', [user.id, normalizeCode(o.code)]);
        return true;
      });
      if (!joined) throw new HttpError(404, 'Convite inválido, já usado ou vencido. Peça um novo.');
      break;
    }
    case 'invite': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      const code = newInviteCode();
      const rows = await query<{ expires_at: string }>(
        `INSERT INTO family_invites (code, family_id, created_by, expires_at)
         VALUES ($1, $2, $3, NOW() + make_interval(days => $4)) RETURNING expires_at::text AS expires_at`,
        [code, member.familyId, user.id, INVITE_DAYS],
      );
      return json({ code, expiresAt: rows[0].expires_at });
    }
    case 'setRole': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      await query('UPDATE family_members SET role = $1 WHERE user_id = $2', [o.role, user.id]);
      break;
    }
    case 'removeMember': {
      if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
      const removed = await transaction(async client => {
        const { rows } = await client.query('SELECT user_id FROM family_members WHERE family_id = $1 FOR UPDATE', [member.familyId]);
        if (!rows.some(r => r.user_id === o.userId)) throw new HttpError(404, 'Pessoa não encontrada neste espaço.');
        if (rows.length <= 1) throw new HttpError(409, 'Você é a única pessoa no espaço. Convide alguém antes de sair.');
        await client.query('DELETE FROM family_members WHERE family_id = $1 AND user_id = $2', [member.familyId, o.userId]);
        return o.userId;
      });
      if (removed === user.id) return json({ ok: true, family: null });
      break;
    }
  }
  return json({ ok: true, family: await familyState(user.id) });
});
