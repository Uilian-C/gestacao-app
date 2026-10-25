import { timingSafeEqual } from 'node:crypto';
import { query } from './_lib/db.js';
import { HttpError, endpoint, json } from './_lib/http.js';
import { notify } from './_lib/push.js';
import { TIME_ZONE, localDate, planReminders, planTimed, type ConsultationRow, type EntryRow, type FamilyRow, type TaskRow, type Timed } from './_lib/reminders.js';

// Lembretes. Este endereço é chamado a cada 15 minutos (GitHub Actions, ver
// .github/workflows/lembretes.yml) e toda manhã pela Vercel ("crons" no
// vercel.json, de reserva), com o CRON_SECRET no cabeçalho; ninguém mais
// consegue disparar. Os avisos do dia (consultas, semana nova, lembretes sem
// hora) saem a partir das 8h; os com hora, quando a hora chega. Nada repete:
// cada aviso tem uma chave guardada em notification_log.

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
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(now));
  // Antes das 8h, só os lembretes com hora; os do dia esperam a manhã.
  // (Nos testes, LEMBRETES_QUALQUER_HORA=1 libera os do dia a qualquer hora.)
  const daily = hour >= 8 || process.env.LEMBRETES_QUALQUER_HORA === '1';

  // Só espaços com alguém que ativou as notificações.
  const [families, consultations, entries, tasks] = await Promise.all([
    query<FamilyRow>(
      `SELECT f.id::text AS id, f.dum_date::text AS dum_date, f.blood_type,
              ARRAY(SELECT m.user_id FROM family_members m WHERE m.family_id = f.id AND m.role <> 'familia') AS members,
              ARRAY(SELECT m.user_id FROM family_members m WHERE m.family_id = f.id AND m.role = 'familia') AS relatives,
              ARRAY(SELECT c.item_id FROM checklist c WHERE c.family_id = f.id AND c.list = 'prenatal') AS done,
              (to_jsonb(f) ->> 'care_since') IS NOT NULL AS care
       FROM families f
       WHERE EXISTS (SELECT 1 FROM family_members m JOIN push_subscriptions s ON s.user_id = m.user_id WHERE m.family_id = f.id)`,
    ),
    query<ConsultationRow>(
      `SELECT c.id::text AS id, c.family_id::text AS family_id,
              to_char(c.scheduled_at AT TIME ZONE $3, 'YYYY-MM-DD HH24:MI') AS local,
              c.professional_name, c.location,
              COALESCE(to_jsonb(c) ->> 'kind', 'consulta') AS kind, to_jsonb(c) ->> 'title' AS title
       FROM consultations c
       WHERE (c.scheduled_at AT TIME ZONE $3)::date IN ($1::date, $2::date)`,
      [today, tomorrow, TIME_ZONE],
    ),
    query<EntryRow>(
      `SELECT e.id::text AS id, e.family_id::text AS family_id, e.user_id, e.visibility, e.body
       FROM journal_entries e WHERE e.remind_on = $1::date AND to_jsonb(e) ->> 'remind_at' IS NULL`,
      [today],
    ),
    // Tarefas abertas com lembrete hoje (migração 017), para quem cuida delas.
    query<TaskRow>(
      `SELECT t.id::text AS id, t.task_title AS title,
              ARRAY(SELECT m.user_id FROM family_members m WHERE m.family_id = t.family_id AND m.role <> 'familia'
                     AND (COALESCE(t.assigned_to, 'casal') = 'casal' OR m.role = t.assigned_to)) AS user_ids
       FROM partner_tasks t WHERE t.remind_on = $1::date AND NOT t.is_completed AND to_jsonb(t) ->> 'remind_at' IS NULL`,
      [today],
    ).catch(() => [] as TaskRow[]),
  ]);

  // Com hora (migração 018): o que chegou nas últimas 12 horas e ainda não saiu.
  const [timedEntries, timedTasks, early] = await Promise.all([
    query<EntryRow & { at: string }>(
      `SELECT e.id::text AS id, e.family_id::text AS family_id, e.user_id, e.visibility, e.body, e.remind_at::text AS at
       FROM journal_entries e WHERE e.remind_at <= NOW() AND e.remind_at > NOW() - INTERVAL '12 hours'`,
    ).catch(() => []),
    query<TaskRow & { at: string }>(
      `SELECT t.id::text AS id, t.task_title AS title, t.remind_at::text AS at,
              ARRAY(SELECT m.user_id FROM family_members m WHERE m.family_id = t.family_id AND m.role <> 'familia'
                     AND (COALESCE(t.assigned_to, 'casal') = 'casal' OR m.role = t.assigned_to)) AS user_ids
       FROM partner_tasks t WHERE NOT t.is_completed AND t.remind_at <= NOW() AND t.remind_at > NOW() - INTERVAL '12 hours'`,
    ).catch(() => []),
    query<ConsultationRow & { before: number }>(
      `SELECT c.id::text AS id, c.family_id::text AS family_id, to_char(c.scheduled_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') AS local,
              c.professional_name, c.location, COALESCE(c.kind, 'consulta') AS kind, c.title, c.remind_before AS before
       FROM consultations c
       WHERE c.remind_before IS NOT NULL AND c.scheduled_at > NOW()
         AND c.scheduled_at - make_interval(mins => c.remind_before) <= NOW()
         AND c.scheduled_at - make_interval(mins => c.remind_before) > NOW() - INTERVAL '12 hours'`,
      [TIME_ZONE],
    ).catch(() => []),
  ]);
  const timed: Timed = { entries: timedEntries, tasks: timedTasks, early };

  const notices = [...(daily ? planReminders(today, families, consultations, entries, tasks) : []), ...planTimed(families, timed)];
  let sent = 0;
  for (const n of notices) sent += await notify(n.userIds, n.kind, n.payload, n.key).catch(err => (console.error(err), 0));
  return json({ ok: true, today, notices: notices.length, sent });
});
