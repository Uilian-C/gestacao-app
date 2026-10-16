import { timingSafeEqual } from 'node:crypto';
import { query } from './_lib/db.js';
import { HttpError, endpoint, json } from './_lib/http.js';
import { notify } from './_lib/push.js';
import { TIME_ZONE, localDate, planReminders, type ConsultationRow, type EntryRow, type FamilyRow } from './_lib/reminders.js';

// Lembretes do dia. A Vercel chama este endereço toda manhã (ver "crons" no
// vercel.json), com o CRON_SECRET no cabeçalho; ninguém mais consegue disparar.

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const GET = endpoint(async request => {
  if (!authorized(request)) throw new HttpError(401, 'Não autorizado.');
  const ready = await query<{ t: string | null }>("SELECT to_regclass('public.push_subscriptions')::text AS t");
  if (!ready[0].t) return json({ ok: true, skipped: 'migração 009 pendente' });

  const now = new Date();
  const today = localDate(now);
  const tomorrow = localDate(now, 1);

  // Só espaços com alguém que ativou as notificações.
  const [families, consultations, entries] = await Promise.all([
    query<FamilyRow>(
      `SELECT f.id::text AS id, f.dum_date::text AS dum_date, f.blood_type,
              ARRAY(SELECT m.user_id FROM family_members m WHERE m.family_id = f.id) AS members,
              ARRAY(SELECT c.item_id FROM checklist c WHERE c.family_id = f.id AND c.list = 'prenatal') AS done
       FROM families f
       WHERE EXISTS (SELECT 1 FROM family_members m JOIN push_subscriptions s ON s.user_id = m.user_id WHERE m.family_id = f.id)`,
    ),
    query<ConsultationRow>(
      `SELECT c.id::text AS id, c.family_id::text AS family_id,
              to_char(c.scheduled_at AT TIME ZONE $3, 'YYYY-MM-DD HH24:MI') AS local,
              c.professional_name, c.location
       FROM consultations c
       WHERE (c.scheduled_at AT TIME ZONE $3)::date IN ($1::date, $2::date)`,
      [today, tomorrow, TIME_ZONE],
    ),
    query<EntryRow>(
      `SELECT e.id::text AS id, e.family_id::text AS family_id, e.user_id, e.visibility, e.body
       FROM journal_entries e WHERE e.remind_on = $1::date`,
      [today],
    ),
  ]);

  const notices = planReminders(today, families, consultations, entries);
  let sent = 0;
  for (const n of notices) sent += await notify(n.userIds, n.kind, n.payload, n.key).catch(err => (console.error(err), 0));
  return json({ ok: true, today, notices: notices.length, sent });
});
