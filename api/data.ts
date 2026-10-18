import { z } from 'zod';
import { query, transaction } from './_lib/db.js';
import { fetchAll } from './_lib/gestation.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';
import { mentioned } from './_lib/mentions.js';
import { notify, type PushPayload } from './_lib/push.js';
import { VISIBLE_TARGET } from './_lib/social.js';
import { deleteFiles } from './_lib/storage.js';

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

const taskFields = {
  title: text(300),
  assignee: z.enum(['mae', 'pai', 'casal']),
  priority: z.enum(['Alta', 'Média', 'Baixa']),
  dueDate: isoDate.nullish().or(z.literal('')).transform(v => v || null),
  notes: optionalText(2000),
};
const symptomFields = {
  name: text(100),
  intensity: z.number().int().min(1).max(5),
  category: text(30),
  notes: optionalText(2000),
  timeOfDay: z.string().max(12).nullish().transform(v => v || null),
};
const metricFields = { weight: nullableNum(20, 400), systolic: nullableInt(50, 260), diastolic: nullableInt(30, 180) };
const consultationFields = {
  scheduledAt: timestamp,
  specialty: text(30),
  professional: optionalText(120),
  location: optionalText(200),
  // Agendamento (migração 013): consulta, exame, ultrassom ou vacina; nome e item da jornada.
  kind: z.enum(['consulta', 'exame', 'ultrassom', 'vacina']).optional(),
  title: optionalText(120),
  planItem: z.string().regex(/^[a-z0-9-]{1,40}$/).nullish().transform(v => v || null),
  // Quem vai (migração 016): mãe, pai ou os dois. Sem a migração, fica de fora.
  attendees: z.enum(['mae', 'pai', 'casal']).nullish().transform(v => v ?? null),
};
const FOLDERS = ['momento', 'dia', 'ideia', 'carta', 'barriga'] as const;
const entryFields = {
  // Pode ficar vazio só na foto da barriga (a legenda é opcional); ver apply().
  body: z.string().trim().max(4000),
  visibility: z.enum(['private', 'shared']),
  remindOn: isoDate.nullish().transform(v => v || null),
  // Pasta do fichário (migração 012). Ao criar sem pasta, vai para "momento"; ao editar sem pasta, fica onde está.
  folder: z.enum(FOLDERS).optional(),
};

const listName = z.enum(['prenatal', 'mala']);
const itemFields = {
  title: text(200),
  bagGroup: z.enum(['mae', 'bebe', 'acompanhante']).nullish().transform(v => v ?? null),
  week: z.number().int().min(1).max(42).nullish().transform(v => v ?? null),
};
const targetType = z.enum(['entry', 'exam', 'symptom', 'task']);
const uuid = z.string().uuid();

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
  z.object({ op: z.literal('createTask'), week, ...taskFields }),
  z.object({ op: z.literal('updateTask'), id, ...taskFields }),
  z.object({ op: z.literal('toggleTask'), id, done: z.boolean() }),
  z.object({ op: z.literal('createSymptom'), week, date: isoDate, ...symptomFields }),
  // Editar pode trocar o dia (e a semana junto); sem eles, o dia fica como estava.
  z.object({ op: z.literal('updateSymptom'), id, week: week.optional(), date: isoDate.optional(), ...symptomFields }),
  z.object({ op: z.literal('createComment'), symptomId: id, text: text(2000) }),
  z.object({ op: z.literal('createQuestion'), week, text: text(2000), category: text(30), specialty: text(30) }),
  z.object({ op: z.literal('answerQuestion'), id, answer: text(4000) }),
  z.object({ op: z.literal('createMetric'), week, date: isoDate, ...metricFields }),
  z.object({ op: z.literal('updateMetric'), id, week: week.optional(), date: isoDate.optional(), ...metricFields }),
  z.object({ op: z.literal('createConsultation'), ...consultationFields }),
  z.object({ op: z.literal('updateConsultation'), id, ...consultationFields }),
  z.object({ op: z.literal('setCheck'), list: z.enum(['prenatal', 'mala']), itemId: z.string().regex(/^[a-z0-9-]{1,40}$/), done: z.boolean() }),
  z.object({ op: z.literal('createEntry'), date: isoDate, ...entryFields }),
  z.object({ op: z.literal('updateEntry'), id, ...entryFields }),
  z.object({ op: z.literal('deleteEntry'), id }),
  // Listas: itens do casal e itens da lista padrão que não se aplicam.
  z.object({ op: z.literal('addItem'), list: listName, ...itemFields }),
  z.object({ op: z.literal('updateItem'), id: uuid, ...itemFields }),
  z.object({ op: z.literal('deleteItem'), id: uuid }),
  z.object({ op: z.literal('hideItem'), list: listName, itemId: z.string().regex(/^[a-z0-9-]{1,40}$/), hidden: z.boolean() }),
  // Reações e conversa.
  z.object({ op: z.literal('react'), targetType, targetId: uuid, kind: z.enum(['abraco', 'forca', 'aqui', 'festa']), on: z.boolean() }),
  z.object({ op: z.literal('comment'), targetType: z.enum(['entry', 'exam']), targetId: uuid, body: text(1000) }),
  z.object({ op: z.literal('deleteComment'), id: uuid }),
  // Check-in do dia (migração 014): o humor de cada um; null apaga.
  z.object({ op: z.literal('checkin'), day: isoDate, mood: z.enum(['otima', 'bem', 'cansada', 'enjoada', 'ansiosa']).nullable() }),
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

async function requireVisible(m: Member, type: keyof typeof VISIBLE_TARGET, targetId: string) {
  const rows = await query(VISIBLE_TARGET[type], [m.familyId, m.userId, targetId]);
  if (rows.length === 0) throw new HttpError(404, 'Registro não encontrado.');
}

/** Reações e conversa de um registro que foi apagado saem junto. */
async function dropSocial(fid: string, type: 'entry' | 'exam' | 'symptom' | 'task', targetIds: string[]) {
  if (targetIds.length === 0) return;
  await query('DELETE FROM reactions WHERE family_id = $1 AND target_type = $2 AND target_id::text = ANY($3)', [fid, type, targetIds]).catch(() => undefined);
  if (type === 'entry' || type === 'exam') await query('DELETE FROM comments WHERE family_id = $1 AND target_type = $2 AND target_id::text = ANY($3)', [fid, type, targetIds]).catch(() => undefined);
}

/** Edição: 404 quando o registro não é do espaço (ou, no caso dos momentos, de quem edita). */
/**
 * Grava um registro do diário com a pasta. Antes da migração 012 a coluna não
 * existe: os registros de "momento" ainda gravam (sem ela); as outras pastas pedem a migração.
 */
async function withFolder(folder: string, write: () => Promise<Array<{ id: string }>>, legacy: () => Promise<Array<{ id: string }>>) {
  try {
    return await write();
  } catch (err) {
    if ((err as { code?: string }).code !== '42703') throw err;
    if (folder !== 'momento') throw new HttpError(503, 'As pastas do diário ainda não estão ligadas no servidor. Rode a migração db/migrations/012_fichario.sql no Neon.');
    return legacy();
  }
}

/**
 * Grava um agendamento com tipo, nome e item da jornada. Antes da migração 013
 * essas colunas não existem: consultas ainda gravam (sem elas); exames, ultrassons e vacinas pedem a migração.
 */
async function withAppointment(kind: string | undefined, write: () => Promise<Array<{ id: string }>>, legacy: () => Promise<Array<{ id: string }>>) {
  try {
    return await write();
  } catch (err) {
    if ((err as { code?: string }).code !== '42703') throw err;
    if (kind && kind !== 'consulta') throw new HttpError(503, 'Os agendamentos de exames ainda não estão ligados no servidor. Rode a migração db/migrations/013_agendamentos.sql no Neon.');
    return legacy();
  }
}

/** Quem vai ao agendamento (migração 016). Antes dela, o app nem mostra a pergunta. */
async function setAttendees(id: string, attendees: string | null) {
  try {
    await query('UPDATE consultations SET attendees = $1 WHERE id::text = $2', [attendees, id]);
  } catch (err) {
    if ((err as { code?: string }).code !== '42703') throw err;
  }
}

function checkinMissing(err: unknown): never {
  if ((err as { code?: string }).code === '42P01') throw new HttpError(503, 'O check-in do dia ainda não está ligado no servidor. Rode a migração db/migrations/014_checkin.sql no Neon.');
  throw err;
}

/** Sintoma e medição são do que já aconteceu: o dia não pode estar no futuro (folga de um dia pelo fuso). */
function notInFuture(iso: string) {
  const limit = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (iso > limit) throw new HttpError(400, 'Escolha um dia que já passou (ou hoje).');
}

async function updated(sql: string, values: unknown[]) {
  const rows = await query(`${sql} RETURNING id`, values);
  if (rows.length === 0) throw new HttpError(404, 'Registro não encontrado.');
}

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
    case 'updateTask':
      return updated(
        `UPDATE partner_tasks SET task_title = $1, assigned_to = $2, priority = $3, due_date = $4, notes = $5 WHERE id::text = $6 AND family_id = $7`,
        [o.title, o.assignee, o.priority, o.dueDate, o.notes, o.id, fid],
      );
    case 'toggleTask':
      return query('UPDATE partner_tasks SET is_completed = $1 WHERE id::text = $2 AND family_id = $3', [o.done, o.id, fid]);
    case 'createSymptom':
      notInFuture(o.date);
      return query(
        `INSERT INTO symptoms_log (family_id, week_number, log_date, symptom_name, intensity, created_by, category, notes, time_of_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [fid, o.week, o.date, o.name, o.intensity, who, o.category, o.notes, o.timeOfDay],
      );
    case 'updateSymptom':
      if (o.date) notInFuture(o.date);
      return updated(
        `UPDATE symptoms_log SET symptom_name = $1, intensity = $2, category = $3, notes = $4, time_of_day = $5,
                log_date = COALESCE($8::date, log_date), week_number = COALESCE($9::int, week_number)
         WHERE id::text = $6 AND family_id = $7`,
        [o.name, o.intensity, o.category, o.notes, o.timeOfDay, o.id, fid, o.date ?? null, o.week ?? null],
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
      notInFuture(o.date);
      if (o.weight === null && (o.systolic === null || o.diastolic === null)) throw new HttpError(400, 'Informe o peso ou a pressão.');
      return query(
        `INSERT INTO health_metrics_log (family_id, week_number, recorded_at, weight_kg, systolic_bp, diastolic_bp, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [fid, o.week, o.date, o.weight, o.systolic, o.diastolic, who],
      );
    case 'updateMetric':
      if (o.weight === null && (o.systolic === null || o.diastolic === null)) throw new HttpError(400, 'Informe o peso ou a pressão.');
      if (o.date) notInFuture(o.date);
      return updated(
        `UPDATE health_metrics_log SET weight_kg = $1, systolic_bp = $2, diastolic_bp = $3,
                recorded_at = COALESCE($6::date, recorded_at), week_number = COALESCE($7::int, week_number)
         WHERE id::text = $4 AND family_id = $5`,
        [o.weight, o.systolic, o.diastolic, o.id, fid, o.date ?? null, o.week ?? null],
      );
    case 'updateConsultation': {
      const update = (full: boolean) =>
        query<{ id: string }>(
          `UPDATE consultations SET scheduled_at = $1, specialty = $2, professional_name = $3, location = $4
           ${full ? ', kind = COALESCE($7, kind), title = $8, plan_item = $9' : ''}
           WHERE id::text = $5 AND family_id = $6 RETURNING id::text AS id`,
          [o.scheduledAt, o.specialty, o.professional, o.location, o.id, fid, ...(full ? [o.kind ?? null, o.title, o.planItem] : [])],
        );
      const rows = await withAppointment(o.kind, () => update(true), () => update(false));
      if (rows.length === 0) throw new HttpError(404, 'Registro não encontrado.');
      await setAttendees(rows[0].id, o.attendees);
      return rows;
    }
    case 'createConsultation': {
      const insert = (full: boolean) =>
        query<{ id: string }>(
          `INSERT INTO consultations (family_id, scheduled_at, specialty, professional_name, location, created_by${full ? ', kind, title, plan_item' : ''})
           VALUES ($1, $2, $3, $4, $5, $6${full ? ', $7, $8, $9' : ''}) RETURNING id::text AS id`,
          [fid, o.scheduledAt, o.specialty, o.professional, o.location, who, ...(full ? [o.kind ?? 'consulta', o.title, o.planItem] : [])],
        );
      const rows = await withAppointment(o.kind, () => insert(true), () => insert(false));
      await setAttendees(rows[0].id, o.attendees);
      return rows;
    }
    case 'createEntry': {
      if (!o.body && o.folder !== 'barriga') throw new HttpError(400, 'Escreva alguma coisa para guardar.');
      const insert = (folder: boolean) =>
        query<{ id: string }>(
          `INSERT INTO journal_entries (family_id, user_id, author_role, entry_date, body, visibility, remind_on${folder ? ', folder' : ''})
           VALUES ($1, $2, $3, $4, $5, $6, $7${folder ? ', $8' : ''}) RETURNING id::text AS id`,
          [fid, m.userId, who, o.date, o.body, o.visibility, o.remindOn, ...(folder ? [o.folder ?? 'momento'] : [])],
        );
      return withFolder(o.folder ?? 'momento', () => insert(true), () => insert(false));
    }
    case 'updateEntry': {
      // Cada um edita só os próprios registros.
      if (!o.body && o.folder !== 'barriga') throw new HttpError(400, 'Escreva alguma coisa para guardar.');
      const update = (folder: boolean) =>
        query<{ id: string }>(
          `UPDATE journal_entries SET body = $1, visibility = $2, remind_on = $3${folder ? ', folder = COALESCE($7, folder)' : ''}
           WHERE id::text = $4 AND family_id = $5 AND user_id = $6 RETURNING id::text AS id`,
          [o.body, o.visibility, o.remindOn, o.id, fid, m.userId, ...(folder ? [o.folder ?? null] : [])],
        );
      const rows = await withFolder(o.folder ?? 'momento', () => update(true), () => update(false));
      if (rows.length === 0) throw new HttpError(404, 'Registro não encontrado.');
      return rows;
    }
    case 'deleteEntry': {
      // Cada um apaga só os próprios registros; as fotos saem do armazenamento junto.
      const photos = await query<{ path: string; thumb_path: string | null }>(
        `SELECT f.path, f.thumb_path FROM journal_files f JOIN journal_entries e ON e.id = f.entry_id WHERE e.id::text = $1 AND e.family_id = $2 AND e.user_id = $3`,
        [o.id, fid, m.userId],
      ).catch(() => []);
      const rows = await query('DELETE FROM journal_entries WHERE id::text = $1 AND family_id = $2 AND user_id = $3 RETURNING id', [o.id, fid, m.userId]);
      if (rows.length === 0) throw new HttpError(404, 'Registro não encontrado.');
      await deleteFiles(photos.flatMap(p => [p.path, ...(p.thumb_path ? [p.thumb_path] : [])])).catch(err => console.error('Fotos não apagadas do armazenamento', err));
      return dropSocial(fid, 'entry', [o.id]);
    }
    case 'addItem':
      return query(`INSERT INTO checklist_items (family_id, list, title, bag_group, week, created_by) VALUES ($1, $2, $3, $4, $5, $6)`, [fid, o.list, o.title, o.bagGroup, o.week, who]);
    case 'updateItem':
      return updated(`UPDATE checklist_items SET title = $1, bag_group = COALESCE($2, bag_group), week = $3 WHERE id = $4 AND family_id = $5`, [o.title, o.bagGroup, o.week, o.id, fid]);
    case 'deleteItem': {
      const rows = await query('DELETE FROM checklist_items WHERE id = $1 AND family_id = $2 RETURNING list', [o.id, fid]);
      if (rows.length === 0) throw new HttpError(404, 'Item não encontrado.');
      return query('DELETE FROM checklist WHERE family_id = $1 AND item_id = $2', [fid, o.id]);
    }
    case 'hideItem':
      if (!o.hidden) return query('DELETE FROM checklist_hidden WHERE family_id = $1 AND list = $2 AND item_id = $3', [fid, o.list, o.itemId]);
      return query('INSERT INTO checklist_hidden (family_id, list, item_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [fid, o.list, o.itemId]);
    case 'react': {
      await requireVisible(m, o.targetType, o.targetId);
      if (!o.on) return query('DELETE FROM reactions WHERE target_type = $1 AND target_id = $2 AND user_id = $3 AND kind = $4', [o.targetType, o.targetId, m.userId, o.kind]);
      return query(
        `INSERT INTO reactions (family_id, target_type, target_id, user_id, author_role, kind) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING kind`,
        [fid, o.targetType, o.targetId, m.userId, who, o.kind],
      );
    }
    case 'comment':
      await requireVisible(m, o.targetType, o.targetId);
      return query(`INSERT INTO comments (family_id, target_type, target_id, user_id, author_role, body) VALUES ($1, $2, $3, $4, $5, $6)`, [fid, o.targetType, o.targetId, m.userId, who, o.body]);
    case 'deleteComment': {
      // Cada um apaga só o que escreveu.
      const rows = await query('DELETE FROM comments WHERE id = $1 AND family_id = $2 AND user_id = $3 RETURNING id', [o.id, fid, m.userId]);
      if (rows.length === 0) throw new HttpError(404, 'Comentário não encontrado.');
      return;
    }
    case 'checkin':
      if (o.mood === null) return query('DELETE FROM checkins WHERE user_id = $1 AND day = $2', [m.userId, o.day]).catch(checkinMissing);
      // (xmax = 0) diz se a linha é nova: só o primeiro check-in do dia avisa a outra pessoa.
      return query<{ inserted: boolean }>(
        `INSERT INTO checkins (family_id, user_id, author_role, day, mood) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, day) DO UPDATE SET mood = EXCLUDED.mood, family_id = EXCLUDED.family_id, updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [fid, m.userId, who, o.day, o.mood],
      ).catch(checkinMissing);
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
        return dropSocial(fid, 'symptom', [o.id]);
      }
      if (o.kind === 'task') {
        await query('DELETE FROM partner_tasks WHERE id::text = $1 AND family_id = $2', [o.id, fid]);
        return dropSocial(fid, 'task', [o.id]);
      }
      return query(`DELETE FROM ${DELETE_TABLE[o.kind]} WHERE id::text = $1 AND family_id = $2`, [o.id, fid]);
    }
  }
}

// Aviso para a outra pessoa do espaço. Sem detalhes de saúde no texto: a
// notificação aparece na tela bloqueada; o conteúdo fica dentro do app.
function partnerMessage(o: Op): Omit<PushPayload, 'title'> & { action: string } | null {
  switch (o.op) {
    case 'createSymptom':
      return { action: 'registrou um sintoma', body: 'Toque para ver e deixar um carinho.', url: '/?aba=saude', tag: 'parceiro-diario' };
    case 'createMetric':
      return { action: 'registrou uma medição', body: 'Peso ou pressão: veja em Cuidados, na parte de saúde.', url: '/?aba=saude', tag: 'parceiro-medicao' };
    case 'createConsultation':
      return { action: APPOINTMENT_TEXT[o.kind ?? 'consulta'], body: 'Toque para ver data, hora e endereço.', url: '/?aba=proximos', tag: 'parceiro-consulta' };
    case 'createQuestion':
      return { action: 'anotou uma dúvida para a consulta', body: 'Toque para ver a lista de perguntas.', url: '/?aba=duvidas', tag: 'parceiro-duvida' };
    case 'createTask':
      return { action: 'criou uma tarefa', body: o.title.length > 80 ? `${o.title.slice(0, 79)}…` : o.title, url: '/?aba=agenda', tag: 'parceiro-tarefa' };
    case 'createEntry':
      return o.visibility === 'shared' ? { action: ENTRY_TEXT[o.folder ?? 'momento'], body: 'Toque para ver no diário.', url: '/?aba=diario', tag: 'parceiro-momento' } : null;
    case 'checkin':
      return o.mood ? { action: 'contou como está hoje', body: 'Toque para ver no Início.', url: '/', tag: 'checkin' } : null;
    case 'react':
      return o.on ? { action: REACTION_TEXT[o.kind], body: 'Toque para ver.', url: REACTION_URL[o.targetType], tag: `reacao-${o.targetId}` } : null;
    case 'comment':
      return { action: o.targetType === 'exam' ? 'comentou num exame' : 'comentou num momento', body: 'Toque para ver a conversa.', url: o.targetType === 'exam' ? '/?aba=exames' : '/?aba=diario', tag: `conversa-${o.targetId}` };
    default:
      return null;
  }
}

const APPOINTMENT_TEXT = { consulta: 'agendou uma consulta', exame: 'agendou um exame', ultrassom: 'agendou um ultrassom', vacina: 'agendou uma vacina' } as const;

const REACTION_URL = { exam: '/?aba=exames', task: '/?aba=agenda', symptom: '/?aba=saude', entry: '/?aba=diario' } as const;

const ENTRY_TEXT = {
  momento: 'guardou um momento',
  dia: 'escreveu no diário',
  ideia: 'anotou uma ideia no diário',
  carta: 'escreveu uma carta para o bebê',
  barriga: 'guardou uma foto da barriga',
} as const;

const REACTION_TEXT = { abraco: 'mandou um abraço', forca: 'mandou força', aqui: 'disse: estou aqui', festa: 'comemorou com você' } as const;

/** O que o registro era antes da edição: para avisar só o que mudou (marcação nova, tarefa passada, chamado para a consulta). */
type Before = { body?: string; assignee?: string; attendees?: string | null } | null;

async function before(m: Member, o: Op): Promise<Before> {
  if (o.op === 'updateEntry') {
    const rows = await query<{ body: string }>('SELECT body FROM journal_entries WHERE id::text = $1 AND family_id = $2', [o.id, m.familyId]);
    return rows[0] ? { body: rows[0].body } : null;
  }
  if (o.op === 'updateTask') {
    const rows = await query<{ assignee: string }>('SELECT assigned_to AS assignee FROM partner_tasks WHERE id::text = $1 AND family_id = $2', [o.id, m.familyId]);
    return rows[0] ? { assignee: rows[0].assignee } : null;
  }
  if (o.op === 'updateConsultation') {
    const rows = await query<{ attendees: string | null }>("SELECT to_jsonb(c)->>'attendees' AS attendees FROM consultations c WHERE id::text = $1 AND family_id = $2", [o.id, m.familyId]);
    return rows[0] ? { attendees: rows[0].attendees } : null;
  }
  return null;
}

interface Partner {
  user_id: string;
  role: string;
  first: string;
}

const goes = (attendees: string | null | undefined, role: string) => attendees === 'casal' || attendees === role;

/** Quem foi marcado (ou chamado) nesta gravação, e o que o aviso diz para essa pessoa. */
function tagged(o: Op, partners: Partner[], prev: Before): { people: Partner[]; action: string; url: string } | null {
  switch (o.op) {
    case 'createEntry':
      return o.visibility === 'shared' ? { people: mentioned(partners, o.body), action: 'marcou você no diário', url: '/?aba=diario' } : null;
    case 'updateEntry':
      return o.visibility === 'shared' && prev ? { people: mentioned(partners, o.body, prev.body), action: 'marcou você no diário', url: '/?aba=diario' } : null;
    case 'comment':
      return { people: mentioned(partners, o.body), action: o.targetType === 'exam' ? 'marcou você num exame' : 'marcou você num comentário', url: o.targetType === 'exam' ? '/?aba=exames' : '/?aba=diario' };
    case 'createTask':
      return { people: partners.filter(p => p.role === o.assignee), action: 'passou uma tarefa para você', url: '/?aba=tarefas' };
    case 'updateTask':
      return prev && prev.assignee !== o.assignee ? { people: partners.filter(p => p.role === o.assignee), action: 'passou uma tarefa para você', url: '/?aba=tarefas' } : null;
    case 'createConsultation':
      return { people: partners.filter(p => goes(o.attendees, p.role)), action: `${APPOINTMENT_TEXT[o.kind ?? 'consulta']} e quer você junto`, url: '/?aba=proximos' };
    case 'updateConsultation':
      return prev ? { people: partners.filter(p => goes(o.attendees, p.role) && !goes(prev.attendees, p.role)), action: 'chamou você para ir junto', url: '/?aba=proximos' } : null;
    default:
      return null;
  }
}

async function notifyPartners(m: Member, o: Op, prev: Before) {
  const rows = await query<Partner & { me: boolean }>(
    `SELECT m.user_id, m.role, split_part(u.name, ' ', 1) AS first, m.user_id = $2 AS me
     FROM family_members m JOIN "user" u ON u.id = m.user_id WHERE m.family_id = $1`,
    [m.familyId, m.userId],
  );
  const partners = rows.filter(r => !r.me);
  if (partners.length === 0) return;
  const who = rows.find(r => r.me)?.first || (m.role === 'mae' ? 'A mãe' : 'O pai');
  const tag = tagged(o, partners, prev);
  const marked = new Set((tag?.people ?? []).map(p => p.user_id));
  const message = partnerMessage(o);
  const rest = partners.filter(p => !marked.has(p.user_id)).map(p => p.user_id);
  await Promise.all([
    // Quem foi marcado recebe um aviso só, o da marcação.
    marked.size && tag
      ? notify([...marked], 'parceiro', { title: `${who} ${tag.action}`, body: 'Toque para ver.', url: tag.url, tag: `marcado-${o.op}-${Date.now()}` })
      : undefined,
    message && rest.length ? notify(rest, 'parceiro', { body: message.body, url: message.url, tag: message.tag, title: `${who} ${message.action}` }) : undefined,
  ]);
}

export const GET = endpoint(async request => {
  const member = await requireMember(request);
  return json(await fetchAll(member.familyId, member.userId));
});

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Dados inválidos.');
  const prev = await before(member, parsed.data);
  const result = await apply(member, parsed.data);
  const repeated =
    (parsed.data.op === 'react' && parsed.data.on && Array.isArray(result) && result.length === 0) ||
    // Trocar a resposta do check-in no mesmo dia não avisa de novo.
    (parsed.data.op === 'checkin' && !(Array.isArray(result) && (result[0] as { inserted?: boolean } | undefined)?.inserted));
  // O registro novo do diário volta com o id, para o app enviar as fotos dele em seguida.
  const createdId = parsed.data.op === 'createEntry' && Array.isArray(result) ? (result[0] as { id?: string } | undefined)?.id : undefined;
  // Já devolve os dados atualizados: o app não precisa de uma segunda chamada para recarregar.
  // O aviso para a outra pessoa sai ao mesmo tempo; se falhar, o registro continua salvo.
  const [data] = await Promise.all([
    fetchAll(member.familyId, member.userId),
    repeated ? undefined : notifyPartners(member, parsed.data, prev).catch(err => console.error('Aviso ao parceiro não enviado', err)),
  ]);
  return json({ ok: true, data, ...(createdId ? { id: createdId } : {}) });
});
