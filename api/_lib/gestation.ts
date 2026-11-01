import { query } from './db.js';
import { visibleTargetSql } from './social.js';
import { fetchNameIdeas } from './babyNames.js';
import { fetchCelebrations } from './celebrations.js';
import { fetchEspera } from './espera.js';

// Tudo o que o espaço tem registrado, de uma vez. Usado ao abrir o app (/api/family)
// e depois de cada gravação (/api/data), sempre filtrado pelo espaço de quem está logado.

const toNumber = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

export async function fetchAll(fid: string, userId: string) {
  const nameIdeas = fetchNameIdeas(fid, userId);
  const espera = fetchEspera(fid, userId);
  const celebrations = fetchCelebrations(fid);
  const [family, symptoms, questions, tasks, comments, metrics, consultations, kicks, contractions, plan, checks, journal, exams, social, photos, planWeeks, checkins] = await Promise.all([
    query(
      `SELECT f.dum_date::text AS dum_date, f.pre_pregnancy_weight_kg::text AS pre_weight, f.height_cm::text AS height,
              f.mother_name, f.mother_birth_date::text AS mother_birth_date, f.blood_type, f.gestations, f.births,
              f.abortions, f.cesareans, f.allergies, f.medications, f.conditions, to_jsonb(f) ->> 'baby_tone' AS baby_tone, to_jsonb(f) ->> 'baby_name' AS baby_name, to_jsonb(f) ->> 'baby2_name' AS baby2_name, to_jsonb(f) ->> 'baby_name_at' AS baby_name_at, to_jsonb(f) ->> 'care_since' AS care_since,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultations' AND column_name = 'attendees') AS attendees_ready,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_tasks' AND column_name = 'remind_on') AS task_reminders_ready,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'remind_at') AS timed_reminders_ready,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plan_weeks' AND column_name = 'note') AS plan_notes_ready,
              -- Abraços dos últimos dias (enviados e recebidos), guardados junto com os avisos.
              (SELECT COALESCE(json_agg(json_build_object('day', split_part(n.key, ':', 2), 'toMe', n.user_id = $2)), '[]')
                 FROM notification_log n JOIN family_members fm ON fm.user_id = n.user_id AND fm.family_id = f.id
                WHERE n.key LIKE 'abraco:%' AND n.sent_at > NOW() - INTERVAL '3 days'
                  AND (n.user_id = $2 OR n.key LIKE '%:' || $2)) AS hugs
       FROM families f WHERE f.id = $1`,
      [fid, userId],
    ),
    query(
      `SELECT s.id, s.week_number, s.log_date::text AS log_date, s.symptom_name, s.intensity,
              COALESCE(s.created_by, 'mae') AS created_by, COALESCE(s.category, 'Físico') AS category, s.notes,
              s.time_of_day, s.created_at::text AS created_at
       FROM symptoms_log s WHERE s.family_id = $1
       ORDER BY s.log_date DESC, s.created_at DESC`,
      [fid],
    ),
    query(
      `SELECT q.id, q.questions_to_ask, COALESCE(q.created_by, 'mae') AS created_by, COALESCE(q.category, 'Geral') AS category,
              q.doctor_answer, q.created_at::text AS created_at, q.status, q.specialty, q.answered_at::text AS answered_at
       FROM medical_appointments q
       WHERE q.family_id = $1 AND q.questions_to_ask IS NOT NULL
       ORDER BY q.created_at DESC`,
      [fid],
    ),
    query(
      `SELECT id, week_number, task_title, COALESCE(assigned_to, 'casal') AS assigned_to, is_completed, due_date::text AS due_date,
              COALESCE(priority, 'Média') AS priority, notes, COALESCE(created_by, 'mae') AS created_by,
              to_jsonb(t) ->> 'remind_on' AS remind_on, to_jsonb(t) ->> 'remind_at' AS remind_at
       FROM partner_tasks t WHERE family_id = $1
       ORDER BY created_at DESC`,
      [fid],
    ),
    query(
      `SELECT id, symptom_id, comment_text, COALESCE(author_role, 'mae') AS author_role, created_at::text AS created_at
       FROM partner_comments WHERE family_id = $1
       ORDER BY created_at ASC`,
      [fid],
    ),
    query(
      `SELECT id, week_number, recorded_at::text AS recorded_at, weight_kg::float AS weight_kg, systolic_bp, diastolic_bp,
              COALESCE(created_by, 'mae') AS created_by
       FROM health_metrics_log WHERE family_id = $1
       ORDER BY recorded_at ASC, week_number ASC`,
      [fid],
    ),
    query(
      // Tipo, nome e item da jornada pelo jsonb: antes da migração 013 as colunas não existem e tudo é consulta.
      `SELECT id, scheduled_at::text AS scheduled_at, specialty, professional_name, location, notes, COALESCE(created_by, 'mae') AS created_by,
              COALESCE(to_jsonb(c) ->> 'kind', 'consulta') AS kind, to_jsonb(c) ->> 'title' AS title, to_jsonb(c) ->> 'plan_item' AS plan_item,
              to_jsonb(c) ->> 'attendees' AS attendees, (to_jsonb(c) ->> 'remind_before')::int AS remind_before,
              to_jsonb(c) ->> 'after_status' AS after_status, to_jsonb(c) ->> 'created_at' AS created_at
       FROM consultations c WHERE family_id = $1
       ORDER BY scheduled_at ASC`,
      [fid],
    ),
    query(
      `SELECT id, started_at::text AS started_at, ended_at::text AS ended_at, kicks, target, COALESCE(created_by, 'mae') AS created_by
       FROM kick_sessions WHERE family_id = $1
       ORDER BY started_at DESC`,
      [fid],
    ),
    query(
      `SELECT id, started_at::text AS started_at, ended_at::text AS ended_at, COALESCE(created_by, 'mae') AS created_by
       FROM contractions WHERE family_id = $1
       ORDER BY started_at ASC`,
      [fid],
    ),
    query(`SELECT data, updated_by, updated_at::text AS updated_at FROM birth_plan WHERE family_id = $1 ORDER BY updated_at DESC LIMIT 1`, [fid]),
    query(`SELECT list, item_id, done_at::text AS done_at FROM checklist WHERE family_id = $1`, [fid]).catch(() => null),
    // Momentos particulares só voltam para quem escreveu.
    query(
      // A pasta vem pelo jsonb: antes da migração 012 a coluna não existe e tudo é "momento".
      `SELECT id, entry_date::text AS entry_date, body, visibility, remind_on::text AS remind_on, author_role,
              (user_id = $2) AS mine, created_at::text AS created_at, COALESCE(to_jsonb(j) ->> 'folder', 'momento') AS folder,
              to_jsonb(j) ->> 'remind_at' AS remind_at,
              to_jsonb(j) ->> 'voice_body' AS voice_body, to_jsonb(j) ->> 'voice_role' AS voice_role, to_jsonb(j) ->> 'voice_at' AS voice_at,
              (to_jsonb(j) ->> 'voice_user_id') = $2 AS voice_mine, to_jsonb(j) ->> 'first_time' AS first_time
       FROM journal_entries j
       WHERE family_id = $1 AND (visibility <> 'private' OR user_id = $2)
       ORDER BY entry_date DESC, created_at DESC`,
      [fid, userId],
    ).catch(() => null),
    // Exames com a lista de arquivos; os particulares, de novo, só para quem enviou.
    query(
      `SELECT e.id, e.kind, e.title, e.exam_date::text AS exam_date, e.plan_item, e.notes, e.visibility, e.author_role,
              to_jsonb(e) ->> 'appointment_id' AS appointment_id,
              COALESCE(e.user_id = $2, false) AS mine, e.created_at::text AS created_at,
              COALESCE(json_agg(json_build_object('id', f.id, 'content_type', f.content_type, 'size', f.size_bytes) ORDER BY f.created_at)
                       FILTER (WHERE f.id IS NOT NULL), '[]') AS files
       FROM exams e LEFT JOIN exam_files f ON f.exam_id = e.id
       WHERE e.family_id = $1 AND (e.visibility <> 'private' OR e.user_id = $2)
       GROUP BY e.id
       ORDER BY e.exam_date DESC, e.created_at DESC`,
      [fid, userId],
    ).catch(() => null),
    // Listas editáveis e reações/conversa numa consulta só (só o que esta pessoa pode ver).
    query<{ items: unknown[]; hidden: unknown[]; reactions: unknown[]; threads: unknown[] }>(
      `SELECT
         (SELECT COALESCE(json_agg(json_build_object('id', i.id, 'list', i.list, 'title', i.title, 'bag_group', i.bag_group, 'week', i.week, 'created_by', i.created_by) ORDER BY i.created_at), '[]')
            FROM checklist_items i WHERE i.family_id = $1) AS items,
         (SELECT COALESCE(json_agg(json_build_object('list', h.list, 'item_id', h.item_id)), '[]') FROM checklist_hidden h WHERE h.family_id = $1) AS hidden,
         (SELECT COALESCE(json_agg(json_build_object('target_type', r.target_type, 'target_id', r.target_id, 'kind', r.kind, 'author_role', r.author_role, 'author_id', r.user_id, 'mine', r.user_id = $2) ORDER BY r.created_at), '[]')
            FROM reactions r WHERE r.family_id = $1 AND ${visibleTargetSql('r')}) AS reactions,
         (SELECT COALESCE(json_agg(json_build_object('id', c.id, 'target_type', c.target_type, 'target_id', c.target_id, 'body', c.body, 'author_role', c.author_role, 'author_id', c.user_id, 'mine', COALESCE(c.user_id = $2, false), 'created_at', c.created_at) ORDER BY c.created_at), '[]')
            FROM comments c WHERE c.family_id = $1 AND ${visibleTargetSql('c')}) AS threads`,
      [fid, userId],
    ).catch(() => null),
    // Fotos do diário (migração 012), só dos registros que esta pessoa vê.
    query<{ entry_id: string; id: string; thumb: boolean; video: boolean }>(
      `SELECT f.entry_id::text AS entry_id, f.id::text AS id, (f.thumb_path IS NOT NULL) AS thumb, f.content_type LIKE 'video/%' AS video
       FROM journal_files f JOIN journal_entries e ON e.id = f.entry_id
       WHERE f.family_id = $1 AND (e.visibility <> 'private' OR e.user_id = $2)
       ORDER BY f.created_at`,
      [fid, userId],
    ).catch(() => null),
    // Semanas da jornada ajustadas pelo casal (migração 019).
    query<{ item_id: string; from: number | null; to: number | null; note: string | null }>(
      `SELECT item_id, week_from AS "from", week_to AS "to", to_jsonb(p) ->> 'note' AS note FROM plan_weeks p WHERE family_id = $1`,
      [fid],
    ).catch(() => null),
    // Check-ins do dia (migração 014): a gestação inteira dos dois (Diário → Humor).
    query(
      `SELECT day::text AS day, mood, author_role, (user_id = $2) AS mine
       FROM checkins WHERE family_id = $1 AND day >= CURRENT_DATE - 320 ORDER BY day DESC`,
      [fid, userId],
    ).catch(() => null),
  ]);

  const f = family[0] ?? {};
  const text = (key: string) => {
    const v = f[key];
    return typeof v === 'string' && v.trim() !== '' ? v : null;
  };

  return {
    profile: {
      dumDate: text('dum_date'),
      preWeightKg: toNumber(f.pre_weight),
      heightCm: toNumber(f.height),
      motherName: text('mother_name'),
      motherBirthDate: text('mother_birth_date'),
      bloodType: text('blood_type'),
      gestations: toNumber(f.gestations),
      births: toNumber(f.births),
      abortions: toNumber(f.abortions),
      cesareans: toNumber(f.cesareans),
      allergies: text('allergies'),
      medications: text('medications'),
      conditions: text('conditions'),
      fichaAvailable: true,
    },
    symptoms,
    questions,
    tasks,
    comments,
    metrics,
    consultations,
    /** A migração 016 já rodou: "quem vai" nos agendamentos. */
    attendeesAvailable: f.attendees_ready === true,
    /** A migração 017 já rodou: lembrete nas tarefas. */
    taskRemindersAvailable: f.task_reminders_ready === true,
    /** A migração 018 já rodou: lembretes com hora (e aviso a mais nos agendamentos). */
    timedRemindersAvailable: f.timed_reminders_ready === true,
    hugs: (f.hugs as Array<{ day: string; toMe: boolean }> | undefined) ?? [],
    migrationPending: false,
    kickSessions: kicks,
    contractions,
    birthPlan: plan[0] ?? null,
    laborAvailable: true,
    checks: checks ?? [],
    checksAvailable: checks !== null,
    journal: (journal ?? []).map(e => ({ ...e, photos: (photos ?? []).filter(p => p.entry_id === e.id).map(p => ({ id: p.id, thumb: p.thumb, ...(p.video ? { video: true } : {}) })) })),
    journalAvailable: journal !== null,
    photosAvailable: photos !== null,
    checkins: checkins ?? [],
    checkinAvailable: checkins !== null,
    exams: exams ?? [],
    examsAvailable: exams !== null,
    listItems: social?.[0].items ?? [],
    hiddenItems: social?.[0].hidden ?? [],
    reactions: social?.[0].reactions ?? [],
    threads: social?.[0].threads ?? [],
    socialAvailable: social !== null,
    planWeeks: planWeeks ?? [],
    planWeeksAvailable: planWeeks !== null,
    /** Tom do bebê desenhado (migração 024); null é o tom neutro. */
    babyTone: text('baby_tone'),
    /** Nome do bebê (migração 025); null enquanto não escolheram. */
    babyName: text('baby_name'),
    /** Quando o nome foi escolhido (migração 027). */
    babyNameAt: text('baby_name_at'),
    /** Gêmeos (migração 037): o nome do segundo bebê. */
    baby2Name: text('baby2_name'),
    /** Modo cuidado (migração 029): o dia em que foi ligado; null desligado. */
    careSince: text('care_since'),
    /** Ideias de nome do bebê (migração 026); null antes da migração. */
    nameIdeas: await nameIdeas,
    /** A espera: menino ou menina, o plano e o bolão (migração 035); null antes da migração. */
    espera: await espera,
    /** Celebrações (migração 028); null antes da migração. */
    celebrations: await celebrations,
    /** A migração 020 já rodou: anotação do combinado com a equipe. */
    planNotesAvailable: f.plan_notes_ready === true,
  };
}


/**
 * O que um familiar (migração 023) vê: a data para a semana do bebê e os posts
 * que o casal guardou para a família, com fotos, abraços e conversa. Nada de
 * saúde, exames, agenda, tarefas, humor ou do resto do diário.
 */
export async function fetchFamilyView(fid: string, userId: string) {
  const nameIdeas = fetchNameIdeas(fid, userId);
  const espera = fetchEspera(fid, userId);
  const [family, journal, photos, social] = await Promise.all([
    query(`SELECT dum_date::text AS dum_date, to_jsonb(f) ->> 'baby_tone' AS baby_tone, to_jsonb(f) ->> 'baby_name' AS baby_name, to_jsonb(f) ->> 'baby2_name' AS baby2_name, to_jsonb(f) ->> 'baby_name_at' AS baby_name_at, to_jsonb(f) ->> 'care_since' AS care_since FROM families f WHERE id = $1`, [fid]),
    query(
      `SELECT id, entry_date::text AS entry_date, body, visibility, author_role, false AS mine, created_at::text AS created_at,
              COALESCE(to_jsonb(j) ->> 'folder', 'momento') AS folder,
              to_jsonb(j) ->> 'voice_body' AS voice_body, to_jsonb(j) ->> 'voice_role' AS voice_role, false AS voice_mine
       FROM journal_entries j WHERE family_id = $1 AND visibility = 'family'
       ORDER BY entry_date DESC, created_at DESC`,
      [fid],
    ).catch(() => []),
    query<{ entry_id: string; id: string; thumb: boolean; video: boolean }>(
      `SELECT f.entry_id::text AS entry_id, f.id::text AS id, (f.thumb_path IS NOT NULL) AS thumb, f.content_type LIKE 'video/%' AS video
       FROM journal_files f JOIN journal_entries e ON e.id = f.entry_id
       WHERE f.family_id = $1 AND e.visibility = 'family' ORDER BY f.created_at`,
      [fid],
    ).catch(() => []),
    query<{ reactions: unknown[]; threads: unknown[] }>(
      `SELECT
         (SELECT COALESCE(json_agg(json_build_object('target_type', r.target_type, 'target_id', r.target_id, 'kind', r.kind, 'author_role', r.author_role, 'author_id', r.user_id, 'mine', r.user_id = $2) ORDER BY r.created_at), '[]')
            FROM reactions r JOIN journal_entries e ON e.id = r.target_id AND e.visibility = 'family'
           WHERE r.family_id = $1 AND r.target_type = 'entry') AS reactions,
         (SELECT COALESCE(json_agg(json_build_object('id', c.id, 'target_type', c.target_type, 'target_id', c.target_id, 'body', c.body, 'author_role', c.author_role, 'author_id', c.user_id, 'mine', COALESCE(c.user_id = $2, false), 'created_at', c.created_at) ORDER BY c.created_at), '[]')
            FROM comments c JOIN journal_entries e ON e.id = c.target_id AND e.visibility = 'family'
           WHERE c.family_id = $1 AND c.target_type = 'entry') AS threads`,
      [fid, userId],
    ).catch(() => null),
  ]);
  const dum = family[0]?.dum_date;
  return {
    familyView: true,
    profile: { dumDate: typeof dum === 'string' && dum ? dum : null },
    babyTone: (family[0]?.baby_tone as string | null | undefined) ?? null,
    babyName: (family[0]?.baby_name as string | null | undefined) ?? null,
    babyNameAt: (family[0]?.baby_name_at as string | null | undefined) ?? null,
    baby2Name: (family[0]?.baby2_name as string | null | undefined) ?? null,
    careSince: (family[0]?.care_since as string | null | undefined) ?? null,
    nameIdeas: await nameIdeas,
    espera: await espera,
    journal: journal.map(e => ({ ...e, photos: photos.filter(p => p.entry_id === e.id).map(p => ({ id: p.id, thumb: p.thumb, ...(p.video ? { video: true } : {}) })) })),
    reactions: social?.[0].reactions ?? [],
    threads: social?.[0].threads ?? [],
    socialAvailable: social !== null,
  };
}
