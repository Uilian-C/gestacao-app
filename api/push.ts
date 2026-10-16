import { z } from 'zod';
import { query } from './_lib/db.js';
import { HttpError, endpoint, json, readJson, requireMember } from './_lib/http.js';
import { NOTIFY_KINDS, isPushEndpoint, notify, vapidKeys } from './_lib/push.js';

// Notificações de cada pessoa: ativar ou desativar neste aparelho e escolher o que receber.

const MIGRATION_HINT = 'As notificações ainda não estão ligadas no servidor. Rode a migração db/migrations/009_notificacoes.sql no Neon.';

async function ready() {
  const rows = await query<{ t: string | null }>("SELECT to_regclass('public.push_subscriptions')::text AS t");
  if (!rows[0].t) throw new HttpError(503, MIGRATION_HINT);
}

async function prefsOf(userId: string) {
  const rows = await query<Record<string, boolean>>('SELECT consultas, momentos, jornada, parceiro FROM notification_prefs WHERE user_id = $1', [userId]);
  return rows[0] ?? { consultas: true, momentos: true, jornada: true, parceiro: true };
}

export const GET = endpoint(async request => {
  const member = await requireMember(request);
  await ready();
  const [{ publicKey }, prefs, devices] = await Promise.all([
    vapidKeys(),
    prefsOf(member.userId),
    query<{ endpoint: string }>('SELECT endpoint FROM push_subscriptions WHERE user_id = $1', [member.userId]),
  ]);
  // A lista de aparelhos volta só para o app saber se este aparelho já está ativo.
  return json({ publicKey, prefs, endpoints: devices.map(d => d.endpoint) });
});

const subscription = z.object({
  endpoint: z.string().max(1000).refine(isPushEndpoint, 'Serviço de notificação não reconhecido.'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('subscribe'), subscription }),
  z.object({ op: z.literal('unsubscribe'), endpoint: z.string().max(1000) }),
  z.object({ op: z.literal('prefs'), consultas: z.boolean(), momentos: z.boolean(), jornada: z.boolean(), parceiro: z.boolean() }),
  z.object({ op: z.literal('test') }),
]);

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await ready();
  const o = parsed.data;
  const me = member.userId;

  switch (o.op) {
    case 'subscribe':
      // O mesmo aparelho trocando de conta passa a receber só os avisos da conta nova.
      await query(
        `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, user_agent) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent`,
        [o.subscription.endpoint, me, o.subscription.keys.p256dh, o.subscription.keys.auth, request.headers.get('user-agent')?.slice(0, 300) ?? null],
      );
      break;
    case 'unsubscribe':
      await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [o.endpoint, me]);
      break;
    case 'prefs':
      await query(
        `INSERT INTO notification_prefs (user_id, consultas, momentos, jornada, parceiro, updated_at) VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET consultas = $2, momentos = $3, jornada = $4, parceiro = $5, updated_at = NOW()`,
        [me, ...NOTIFY_KINDS.map(k => o[k])],
      );
      break;
    case 'test': {
      // Um teste por minuto: vários avisos iguais em sequência parecem spam para o navegador.
      const fresh = await query(
        `INSERT INTO notification_log (user_id, key) VALUES ($1, 'teste:' || floor(extract(epoch FROM NOW()) / 60)::text)
         ON CONFLICT DO NOTHING RETURNING 1`,
        [me],
      );
      if (fresh.length === 0) throw new HttpError(429, 'Aguarde um minuto para enviar outro teste.');
      const sent = await notify([me], null, { title: 'Notificações do Tumtum ativas', body: 'Os lembretes de vocês vão chegar assim neste aparelho.', url: '/', tag: 'teste' });
      if (sent === 0) throw new HttpError(409, 'Nenhum aparelho recebeu. Ative as notificações neste aparelho e tente de novo.');
      return json({ ok: true, sent });
    }
  }
  return json({ ok: true, prefs: await prefsOf(me) });
});
