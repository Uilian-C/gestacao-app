import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query } from './_lib/db.js';
import { fetchAll } from './_lib/gestation.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';
import { notify } from './_lib/push.js';
import { deleteFiles, getFile, putFile, storageReady } from './_lib/storage.js';

// Exames e ultrassons: o registro (título, data, tipo) e as fotos ou PDFs.
// Os arquivos nunca têm endereço público: saem só por aqui, para quem é do
// espaço (e, se o exame for particular, só para quem enviou).

/** Tamanho máximo de cada arquivo. O app reduz as fotos antes de enviar; isto vale para PDFs. */
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_FILES_PER_EXAM = 12;
/** Espaço total por família, para os custos de armazenamento não escaparem. */
const FAMILY_QUOTA_BYTES = 200 * 1024 * 1024;

const MIGRATION_HINT = 'Os exames ainda não estão ligados no servidor. Rode a migração db/migrations/010_exames.sql no Neon.';
const STORAGE_HINT = 'O armazenamento de arquivos ainda não está ligado. Crie o Blob (privado) na Vercel e conecte ao projeto.';

const TYPES = {
  'image/jpeg': (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b: Buffer) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
  'application/pdf': (b: Buffer) => b.toString('latin1', 0, 5) === '%PDF-',
} as const;
type FileType = keyof typeof TYPES;
const EXTENSION: Record<FileType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

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
  }),
  z.object({
    op: z.literal('addFile'),
    examId: id,
    contentType: z.enum(Object.keys(TYPES) as [FileType, ...FileType[]]),
    // Base64: até 3 MB de arquivo cabem no limite de 4,5 MB por chamada da Vercel.
    data: z.string().min(8).max(Math.ceil((MAX_FILE_BYTES * 4) / 3) + 8),
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

/** Arquivo de um exame: GET /api/exames?arquivo=<id> */
export const GET = endpoint(async request => {
  const member = await requireMember(request);
  const fileId = new URL(request.url).searchParams.get('arquivo') ?? '';
  if (!id.safeParse(fileId).success) throw new HttpError(400, 'Arquivo inválido.');
  await ready();
  const rows = await query<{ path: string; content_type: string }>(
    `SELECT f.path, f.content_type FROM exam_files f JOIN exams e ON e.id = f.exam_id
     WHERE f.id::text = $1 AND f.family_id = $2 AND (e.visibility = 'shared' OR e.user_id = $3)`,
    [fileId, member.familyId, member.userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Arquivo não encontrado.');
  const file = await getFile(rows[0].path);
  if (!file) throw new HttpError(404, 'Arquivo não encontrado.');
  const type = rows[0].content_type;
  return new Response(file.body as BodyInit, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `inline; filename="exame.${EXTENSION[type as FileType] ?? 'bin'}"`,
      // Só o navegador de quem pediu guarda uma cópia, e por pouco tempo.
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      // Fotos abertas sozinhas não executam nada. (Nos PDFs isso desligaria o leitor de PDF do navegador.)
      ...(type === 'application/pdf' ? {} : { 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
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
      const rows = await query<{ id: string }>(
        `INSERT INTO exams (family_id, user_id, author_role, kind, title, exam_date, plan_item, notes, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id::text AS id`,
        [fid, member.userId, member.role, o.kind, o.title, o.date, o.planItem, o.notes, o.visibility],
      );
      if (o.visibility === 'shared') await notifyPartners(member).catch(err => console.error('Aviso ao parceiro não enviado', err));
      return json({ ok: true, id: rows[0].id });
    }
    case 'addFile': {
      if (!storageReady()) throw new HttpError(503, STORAGE_HINT);
      await visibleExam(member, o.examId);
      const bytes = Buffer.from(o.data, 'base64');
      if (bytes.length === 0) throw new HttpError(400, 'Arquivo vazio.');
      if (bytes.length > MAX_FILE_BYTES) throw new HttpError(413, 'Arquivo grande demais (máximo 3 MB). Para PDFs, tente salvar em tamanho menor.');
      if (!TYPES[o.contentType](bytes)) throw new HttpError(415, 'Envie uma foto (JPG, PNG ou WebP) ou um PDF.');
      const [usage] = await query<{ files: number; used: string }>(
        `SELECT (SELECT COUNT(*)::int FROM exam_files WHERE exam_id::text = $1) AS files,
                (SELECT COALESCE(SUM(size_bytes), 0)::text FROM exam_files WHERE family_id = $2) AS used`,
        [o.examId, fid],
      );
      if (usage.files >= MAX_FILES_PER_EXAM) throw new HttpError(409, `Cada exame guarda até ${MAX_FILES_PER_EXAM} arquivos.`);
      if (Number(usage.used) + bytes.length > FAMILY_QUOTA_BYTES) throw new HttpError(409, 'O espaço de arquivos de vocês está cheio. Apaguem arquivos que não precisam mais.');

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
      await deleteFiles(files.map(f => f.path)).catch(err => console.error('Arquivos não apagados do armazenamento', err));
      break;
    }
  }
  return json({ ok: true, data: await fetchAll(fid, member.userId) });
});
