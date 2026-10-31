import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query } from './_lib/db.js';
import { fetchAll } from './_lib/gestation.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';
import { notify } from './_lib/push.js';
import { EXTENSION, FAMILY_QUOTA_BYTES, FILE_TYPES, MAX_FILE_BYTES, QUOTA_MESSAGE, base64Max, familyUsedBytes, isVideo, privateFileHeaders, type FileType } from './_lib/files.js';
import { deleteFiles, getFile, putFile, storageReady } from './_lib/storage.js';
import { serveVideo } from './_lib/videos.js';

// Exames e ultrassons: o registro (título, data, tipo) e as fotos ou PDFs.
// Os arquivos nunca têm endereço público: saem só por aqui, para quem é do
// espaço (e, se o exame for particular, só para quem enviou).

const MAX_FILES_PER_EXAM = 12;

const MIGRATION_HINT = 'Os exames ainda não estão ligados no servidor. Rode a migração db/migrations/010_exames.sql no Neon.';
const STORAGE_HINT = 'O armazenamento de arquivos ainda não está ligado. Crie o Blob (privado) na Vercel e conecte ao projeto.';

const id = z.string().uuid();
const ops = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('create'),
    kind: z.enum(['ultrassom', 'exame', 'outro']),
    title: z.string().trim().min(1).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    planItem: z.string().regex(/^[a-z0-9-]{1,40}$/).nullish().transform(v => v || null),
    notes: z.string().trim().max(2000).nullish().transform(v => v || null),
    visibility: z.enum(['private', 'shared']),
    // O agendamento de onde veio o resultado (migração 013), se houver.
    appointmentId: id.nullish().transform(v => v || null),
  }),
  z.object({
    op: z.literal('addFile'),
    examId: id,
    contentType: z.enum(Object.keys(FILE_TYPES) as [FileType, ...FileType[]]),
    // Base64: até 3 MB de arquivo cabem no limite de 4,5 MB por chamada da Vercel.
    data: z.string().min(8).max(base64Max(MAX_FILE_BYTES)),
  }),
  z.object({ op: z.literal('deleteFile'), id }),
  z.object({ op: z.literal('delete'), id }),
]);

async function ready() {
  const rows = await query<{ t: string | null }>("SELECT to_regclass('public.exam_files')::text AS t");
  if (!rows[0].t) throw new HttpError(503, MIGRATION_HINT);
}

/** O exame, se esta pessoa pode vê-lo: do mesmo espaço e compartilhado, ou particular dela. */
async function visibleExam(m: Member, examId: string) {
  const rows = await query<{ id: string; visibility: string }>(
    `SELECT id::text AS id, visibility FROM exams WHERE id::text = $1 AND family_id = $2 AND (visibility = 'shared' OR user_id = $3)`,
    [examId, m.familyId, m.userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Exame não encontrado.');
  return rows[0];
}

async function notifyPartners(m: Member) {
  const rows = await query<{ user_id: string; name: string | null }>(
    `SELECT m.user_id, (SELECT split_part(u.name, ' ', 1) FROM "user" u WHERE u.id = $2) AS name
     FROM family_members m WHERE m.family_id = $1 AND m.user_id <> $2`,
    [m.familyId, m.userId],
  );
  if (rows.length === 0) return;
  const who = rows[0].name || (m.role === 'mae' ? 'A mãe' : 'O pai');
  // Sem o nome do exame: a notificação aparece na tela bloqueada.
  await notify(rows.map(r => r.user_id), 'parceiro', { title: `${who} guardou um exame`, body: 'Toque para ver em Cuidados, na parte de exames.', url: '/?aba=exames', tag: 'parceiro-exame' });
}

/** Arquivo de um exame: GET /api/exames?arquivo=<id> (num vídeo, &capa=1 traz a imagem de capa). */
export const GET = endpoint(async request => {
  const member = await requireMember(request);
  const params = new URL(request.url).searchParams;
  const fileId = params.get('arquivo') ?? '';
  if (!id.safeParse(fileId).success) throw new HttpError(400, 'Arquivo inválido.');
  await ready();
  const rows = await query<{ path: string; content_type: string; size_bytes: number }>(
    `SELECT f.path, f.content_type, f.size_bytes FROM exam_files f JOIN exams e ON e.id = f.exam_id
     WHERE f.id::text = $1 AND f.family_id = $2 AND (e.visibility = 'shared' OR e.user_id = $3)`,
    [fileId, member.familyId, member.userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Arquivo não encontrado.');
  if (isVideo(rows[0].content_type)) {
    if (params.get('capa') !== '1') return serveVideo(request, { path: rows[0].path, size: rows[0].size_bytes, type: rows[0].content_type }, 'exame');
    const cover = await getFile(`${rows[0].path}capa`);
    if (!cover) throw new HttpError(404, 'Capa não encontrada.');
    return new Response(cover.body as BodyInit, { headers: privateFileHeaders('image/jpeg', 'capa') });
  }
  const file = await getFile(rows[0].path);
  if (!file) throw new HttpError(404, 'Arquivo não encontrado.');
  return new Response(file.body as BodyInit, { headers: privateFileHeaders(rows[0].content_type, 'exame') });
});

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await ready();
  const o = parsed.data;
  const fid = member.familyId;

  switch (o.op) {
    case 'create': {
      if (o.appointmentId) {
        const own = await query('SELECT 1 FROM consultations WHERE id::text = $1 AND family_id = $2', [o.appointmentId, fid]);
        if (!own[0]) throw new HttpError(404, 'Agendamento não encontrado.');
      }
      const values = [fid, member.userId, member.role, o.kind, o.title, o.date, o.planItem, o.notes, o.visibility];
      const rows = o.appointmentId
        ? await query<{ id: string }>(
            `INSERT INTO exams (family_id, user_id, author_role, kind, title, exam_date, plan_item, notes, visibility, appointment_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id::text AS id`,
            [...values, o.appointmentId],
          ).catch(err => {
            // Antes da migração 013 o resultado grava sem a ligação com o agendamento.
            if ((err as { code?: string }).code !== '42703') throw err;
            return null;
          })
        : null;
      const created =
        rows ??
        (await query<{ id: string }>(
          `INSERT INTO exams (family_id, user_id, author_role, kind, title, exam_date, plan_item, notes, visibility)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id::text AS id`,
          values,
        ));
      if (o.visibility === 'shared') await notifyPartners(member).catch(err => console.error('Aviso ao parceiro não enviado', err));
      return json({ ok: true, id: created[0].id });
    }
    case 'addFile': {
      if (!storageReady()) throw new HttpError(503, STORAGE_HINT);
      await visibleExam(member, o.examId);
      const bytes = Buffer.from(o.data, 'base64');
      if (bytes.length === 0) throw new HttpError(400, 'Arquivo vazio.');
      if (bytes.length > MAX_FILE_BYTES) throw new HttpError(413, 'Arquivo grande demais (máximo 3 MB). Para PDFs, tente salvar em tamanho menor.');
      if (!FILE_TYPES[o.contentType](bytes)) throw new HttpError(415, 'Envie uma foto (JPG, PNG ou WebP) ou um PDF.');
      const [usage] = await query<{ files: number }>('SELECT COUNT(*)::int AS files FROM exam_files WHERE exam_id::text = $1', [o.examId]);
      if (usage.files >= MAX_FILES_PER_EXAM) throw new HttpError(409, `Cada exame guarda até ${MAX_FILES_PER_EXAM} arquivos.`);
      if ((await familyUsedBytes(fid)) + bytes.length > FAMILY_QUOTA_BYTES) throw new HttpError(409, QUOTA_MESSAGE);

      const path = `familias/${fid}/${randomUUID()}.${EXTENSION[o.contentType]}`;
      await putFile(path, bytes, o.contentType);
      try {
        const rows = await query<{ id: string }>(
          `INSERT INTO exam_files (exam_id, family_id, path, content_type, size_bytes) VALUES ($1, $2, $3, $4, $5) RETURNING id::text AS id`,
          [o.examId, fid, path, o.contentType, bytes.length],
        );
        return json({ ok: true, id: rows[0].id });
      } catch (err) {
        // O exame foi apagado no meio do envio: não deixa o arquivo solto.
        await deleteFiles([path]).catch(() => undefined);
        throw err;
      }
    }
    case 'deleteFile': {
      const rows = await query<{ path: string }>(
        `DELETE FROM exam_files f USING exams e
         WHERE f.exam_id = e.id AND f.id::text = $1 AND f.family_id = $2 AND (e.visibility = 'shared' OR e.user_id = $3)
         RETURNING f.path`,
        [o.id, fid, member.userId],
      );
      if (!rows[0]) throw new HttpError(404, 'Arquivo não encontrado.');
      await deleteFiles(rows.map(r => r.path)).catch(err => console.error('Arquivo não apagado do armazenamento', err));
      break;
    }
    case 'delete': {
      await visibleExam(member, o.id);
      const files = await query<{ path: string }>('SELECT path FROM exam_files WHERE exam_id::text = $1 AND family_id = $2', [o.id, fid]);
      await query('DELETE FROM exams WHERE id::text = $1 AND family_id = $2', [o.id, fid]);
      await query("DELETE FROM reactions WHERE family_id = $1 AND target_type = 'exam' AND target_id::text = $2", [fid, o.id]).catch(() => undefined);
      await query("DELETE FROM comments WHERE family_id = $1 AND target_type = 'exam' AND target_id::text = $2", [fid, o.id]).catch(() => undefined);
      await deleteFiles(files.map(f => f.path)).catch(err => console.error('Arquivos não apagados do armazenamento', err));
      break;
    }
  }
  return json({ ok: true, data: await fetchAll(fid, member.userId) });
});
