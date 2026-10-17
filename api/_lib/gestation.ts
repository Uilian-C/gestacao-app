import { query } from './db.js';

// Tudo o que o espaço tem registrado, de uma vez. Usado ao abrir o app (/api/family)
// e depois de cada gravação (/api/data), sempre filtrado pelo espaço de quem está logado.

const toNumber = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

export async function fetchAll(fid: string, userId: string) {
  const [family, symptoms, questions, tasks, comments, metrics, consultations, kicks, contractions, plan, checks, journal, exams] = await Promise.all([
    query(
      `SELECT f.dum_date::text AS dum_date, f.pre_pregnancy_weight_kg::text AS pre_weight, f.height_cm::text AS height,
              f.mother_name, f.mother_birth_date::text AS mother_birth_date, f.blood_type, f.gestations, f.births,
              f.abortions, f.cesareans, f.allergies, f.medications, f.conditions
       FROM families f WHERE f.id = $1`,
      [fid],
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
              COALESCE(priority, 'Média') AS priority, notes, COALESCE(created_by, 'mae') AS created_by
       FROM partner_tasks WHERE family_id = $1
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
      `SELECT id, scheduled_at::text AS scheduled_at, specialty, professional_name, location, notes, COALESCE(created_by, 'mae') AS created_by
       FROM consultations WHERE family_id = $1
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
      `SELECT id, entry_date::text AS entry_date, body, visibility, remind_on::text AS remind_on, author_role,
              (user_id = $2) AS mine, created_at::text AS created_at
       FROM journal_entries
       WHERE family_id = $1 AND (visibility = 'shared' OR user_id = $2)
       ORDER BY entry_date DESC, created_at DESC`,
      [fid, userId],
    ).catch(() => null),
    // Exames com a lista de arquivos; os particulares, de novo, só para quem enviou.
    query(
      `SELECT e.id, e.kind, e.title, e.exam_date::text AS exam_date, e.plan_item, e.notes, e.visibility, e.author_role,
              COALESCE(e.user_id = $2, false) AS mine, e.created_at::text AS created_at,
              COALESCE(json_agg(json_build_object('id', f.id, 'content_type', f.content_type, 'size', f.size_bytes) ORDER BY f.created_at)
                       FILTER (WHERE f.id IS NOT NULL), '[]') AS files
       FROM exams e LEFT JOIN exam_files f ON f.exam_id = e.id
       WHERE e.family_id = $1 AND (e.visibility = 'shared' OR e.user_id = $2)
       GROUP BY e.id
       ORDER BY e.exam_date DESC, e.created_at DESC`,
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
    migrationPending: false,
    kickSessions: kicks,
    contractions,
    birthPlan: plan[0] ?? null,
    laborAvailable: true,
    checks: checks ?? [],
    checksAvailable: checks !== null,
    journal: journal ?? [],
    journalAvailable: journal !== null,
    exams: exams ?? [],
    examsAvailable: exams !== null,
  };
}

