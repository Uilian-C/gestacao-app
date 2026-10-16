import { z } from 'zod';
import { query, transaction } from './_lib/db.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';

// Toda consulta filtra por family_id = espaço de quem está logado. O autor dos
// registros vem do login (papel no espaço), nunca do que o navegador envia.

const toNumber = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

async function fetchAll(fid: string) {
  const [family, symptoms, questions, tasks, comments, metrics, consultations, kicks, contractions, plan] = await Promise.all([
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
  };
}

// ---- Validação do que chega do navegador ----

const id = z.string().min(1).max(64);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.string().min(10).max(40).refine(v => !Number.isNaN(Date.parse(v)), 'data inválida');
const week = z.number().int().min(1).max(45);
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform(v => v || null);
const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable();
const nullableNum = (min: number, max: number) => z.number().min(min).max(max).nullable();

const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('saveDum'), date: isoDate }),
  z.object({ op: z.literal('saveProfile'), preWeightKg: z.number().min(20).max(400), heightCm: z.number().min(40).max(250) }),
  z.object({
    op: z.literal('saveFicha'),
    motherName: optionalText(120),
    motherBirthDate: isoDate.nullable(),
    bloodType: z.string().max(5).nullable(),
    gestations: nullableInt(0, 30),
    births: nullableInt(0, 30),
    abortions: nullableInt(0, 30),
    cesareans: nullableInt(0, 30),
    preWeightKg: nullableNum(20, 400),
    heightCm: nullableNum(40, 250),
    allergies: optionalText(2000),
    medications: optionalText(2000),
    conditions: optionalText(2000),
  }),
  z.object({ op: z.literal('saveKicks'), startedAt: timestamp, endedAt: timestamp, kicks: z.number().int().min(0).max(500), target: z.number().int().min(1).max(100) }),
  z.object({ op: z.literal('saveContraction'), startedAt: timestamp, endedAt: timestamp }),
  z.object({ op: z.literal('saveBirthPlan'), plan: z.record(z.string(), z.unknown()) }),
  z.object({
    op: z.literal('createTask'),
    week,
    title: text(300),
    assignee: z.enum(['mae', 'pai', 'casal']),
    priority: z.enum(['Alta', 'Média', 'Baixa']),
    dueDate: isoDate.nullish().or(z.literal('')).transform(v => v || null),
    notes: optionalText(2000),
  }),
  z.object({ op: z.literal('toggleTask'), id, done: z.boolean() }),
  z.object({
    op: z.literal('createSymptom'),
    week,
    date: isoDate,
    name: text(100),
    intensity: z.number().int().min(1).max(5),
    category: text(30),
    notes: optionalText(2000),
    timeOfDay: z.string().max(12).nullish().transform(v => v || null),
  }),
  z.object({ op: z.literal('createComment'), symptomId: id, text: text(2000) }),
  z.object({ op: z.literal('createQuestion'), week, text: text(2000), category: text(30), specialty: text(30) }),
  z.object({ op: z.literal('answerQuestion'), id, answer: text(4000) }),
  z.object({
    op: z.literal('createMetric'),
    week,
    date: isoDate,
    weight: nullableNum(20, 400),
    systolic: nullableInt(50, 260),
    diastolic: nullableInt(30, 180),
  }),
  z.object({ op: z.literal('createConsultation'), scheduledAt: timestamp, specialty: text(30), professional: optionalText(120), location: optionalText(200) }),
  z.object({ op: z.literal('delete'), kind: z.enum(['task', 'symptom', 'question', 'comment', 'metric', 'consultation', 'kick', 'contraction']), id }),
]);

type Op = z.infer<typeof ops>;

const DELETE_TABLE = {
  task: 'partner_tasks',
  question: 'medical_appointments',
  comment: 'partner_comments',
  metric: 'health_metrics_log',
  consultation: 'consultations',
  kick: 'kick_sessions',
  contraction: 'contractions',
} as const;

async function apply(m: Member, o: Op) {
  const fid = m.familyId;
  const who = m.role;
  switch (o.op) {
    case 'saveDum':
      return query('UPDATE families SET dum_date = $1 WHERE id = $2', [o.date, fid]);
    case 'saveProfile':
      return query('UPDATE families SET pre_pregnancy_weight_kg = $1, height_cm = $2 WHERE id = $3', [o.preWeightKg, o.heightCm, fid]);
    case 'saveFicha':
      return query(
        `UPDATE families SET mother_name = $1, mother_birth_date = $2, blood_type = $3, gestations = $4, births = $5,
                abortions = $6, cesareans = $7, pre_pregnancy_weight_kg = $8, height_cm = $9, allergies = $10,
                medications = $11, conditions = $12
         WHERE id = $13`,
        [o.motherName, o.motherBirthDate, o.bloodType, o.gestations, o.births, o.abortions, o.cesareans, o.preWeightKg, o.heightCm, o.allergies, o.medications, o.conditions, fid],
      );
    case 'saveKicks':
      return query('INSERT INTO kick_sessions (family_id, started_at, ended_at, kicks, target, created_by) VALUES ($1, $2, $3, $4, $5, $6)', [fid, o.startedAt, o.endedAt, o.kicks, o.target, who]);
    case 'saveContraction':
      return query('INSERT INTO contractions (family_id, started_at, ended_at, created_by) VALUES ($1, $2, $3, $4)', [fid, o.startedAt, o.endedAt, who]);
    case 'saveBirthPlan': {
      const data = JSON.stringify(o.plan);
      if (data.length > 50_000) throw new HttpError(413, 'Plano de parto grande demais.');
      const updated = await query(
        `UPDATE birth_plan SET data = $1::jsonb, updated_by = $2, updated_at = NOW()
         WHERE id = (SELECT id FROM birth_plan WHERE family_id = $3 ORDER BY updated_at DESC LIMIT 1)
         RETURNING id`,
        [data, who, fid],
      );
      if (updated.length === 0) await query('INSERT INTO birth_plan (family_id, data, updated_by) VALUES ($1, $2::jsonb, $3)', [fid, data, who]);
      return;
    }
    case 'createTask':
      return query(
        `INSERT INTO partner_tasks (family_id, week_number, task_title, assigned_to, priority, due_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [fid, o.week, o.title, o.assignee, o.priority, o.dueDate, o.notes, who],
      );
    case 'toggleTask':
      return query('UPDATE partner_tasks SET is_completed = $1 WHERE id::text = $2 AND family_id = $3', [o.done, o.id, fid]);
    case 'createSymptom':
      return query(
        `INSERT INTO symptoms_log (family_id, week_number, log_date, symptom_name, intensity, created_by, category, notes, time_of_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [fid, o.week, o.date, o.name, o.intensity, who, o.category, o.notes, o.timeOfDay],
      );
    case 'createComment': {
      // O sintoma comentado precisa ser do mesmo espaço.
      const rows = await query(
        `INSERT INTO partner_comments (family_id, symptom_id, author_role, comment_text)
         SELECT $1, s.id, $2, $3 FROM symptoms_log s WHERE s.id::text = $4 AND s.family_id = $1
         RETURNING id`,
        [fid, who, o.text, o.symptomId],
      );
      if (rows.length === 0) throw new HttpError(404, 'Registro não encontrado.');
      return;
    }
    case 'createQuestion':
      return query(
        `INSERT INTO medical_appointments (family_id, week_number, appointment_date, questions_to_ask, created_by, category, status, specialty)
         VALUES ($1, $2, NOW(), $3, $4, $5, 'pendente', $6)`,
        [fid, o.week, o.text, who, o.category, o.specialty],
      );
    case 'answerQuestion':
      return query(
        `UPDATE medical_appointments SET doctor_answer = $1, answered_at = NOW(), status = 'concluida' WHERE id::text = $2 AND family_id = $3`,
        [o.answer, o.id, fid],
      );
    case 'createMetric':
      if (o.weight === null && (o.systolic === null || o.diastolic === null)) throw new HttpError(400, 'Informe o peso ou a pressão.');
      return query(
        `INSERT INTO health_metrics_log (family_id, week_number, recorded_at, weight_kg, systolic_bp, diastolic_bp, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [fid, o.week, o.date, o.weight, o.systolic, o.diastolic, who],
      );
    case 'createConsultation':
      return query(
        `INSERT INTO consultations (family_id, scheduled_at, specialty, professional_name, location, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fid, o.scheduledAt, o.specialty, o.professional, o.location, who],
      );
    case 'delete': {
      if (o.kind === 'symptom') {
        await transaction(async client => {
          await client.query(
            'DELETE FROM partner_comments WHERE family_id = $1 AND symptom_id IN (SELECT id FROM symptoms_log WHERE id::text = $2 AND family_id = $1)',
            [fid, o.id],
          );
          await client.query('DELETE FROM symptoms_log WHERE id::text = $1 AND family_id = $2', [o.id, fid]);
        });
        return;
      }
      return query(`DELETE FROM ${DELETE_TABLE[o.kind]} WHERE id::text = $1 AND family_id = $2`, [o.id, fid]);
    }
  }
}

export const GET = endpoint(async request => {
  const member = await requireMember(request);
  return json(await fetchAll(member.familyId));
});

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Dados inválidos.');
  await apply(member, parsed.data);
  return json({ ok: true });
});
