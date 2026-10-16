import { z } from 'zod';
import { query, transaction } from './_lib/db.js';
import { fetchAll } from './_lib/gestation.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';

// Toda consulta filtra por family_id = espaço de quem está logado. O autor dos
// registros vem do login (papel no espaço), nunca do que o navegador envia.

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
  z.object({ op: z.literal('setCheck'), list: z.enum(['prenatal', 'mala']), itemId: z.string().regex(/^[a-z0-9-]{1,40}$/), done: z.boolean() }),
  z.object({
    op: z.literal('createEntry'),
    date: isoDate,
    body: text(2000),
    visibility: z.enum(['private', 'shared']),
    remindOn: isoDate.nullish().transform(v => v || null),
  }),
  z.object({ op: z.literal('deleteEntry'), id }),
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
    case 'createEntry':
      return query(
        `INSERT INTO journal_entries (family_id, user_id, author_role, entry_date, body, visibility, remind_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [fid, m.userId, who, o.date, o.body, o.visibility, o.remindOn],
      );
    case 'deleteEntry': {
      // Cada um apaga só os próprios momentos.
      const rows = await query('DELETE FROM journal_entries WHERE id::text = $1 AND family_id = $2 AND user_id = $3 RETURNING id', [o.id, fid, m.userId]);
      if (rows.length === 0) throw new HttpError(404, 'Momento não encontrado.');
      return;
    }
    case 'setCheck':
      if (!o.done) return query('DELETE FROM checklist WHERE family_id = $1 AND list = $2 AND item_id = $3', [fid, o.list, o.itemId]);
      return query(
        `INSERT INTO checklist (family_id, list, item_id, updated_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (family_id, list, item_id) DO NOTHING`,
        [fid, o.list, o.itemId, who],
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
  return json(await fetchAll(member.familyId, member.userId));
});

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Dados inválidos.');
  await apply(member, parsed.data);
  // Já devolve os dados atualizados: o app não precisa de uma segunda chamada para recarregar.
  return json({ ok: true, data: await fetchAll(member.familyId, member.userId) });
});
