import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query } from './_lib/db.js';
import { FAMILY_QUOTA_BYTES, FILE_TYPES, MAX_FILE_BYTES, QUOTA_MESSAGE, base64Max, familyUsedBytes, privateFileHeaders } from './_lib/files.js';
import { fetchAll } from './_lib/gestation.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';
import { deleteFiles, getFile, putFile, storageReady } from './_lib/storage.js';

// Fotos do diário (a barriga semana a semana, o enxoval, o quarto...).
// Quem vê a foto é quem vê o registro: do espaço, ou só quem escreveu se for
// particular. Só quem escreveu o registro põe ou tira fotos. Cada foto vem com
// uma miniatura feita no celular, usada nas listas para não pesar.

const MAX_PHOTOS_PER_ENTRY = 4;
const MAX_THUMB_BYTES = 200 * 1024;

const MIGRATION_HINT = 'As fotos do diário ainda não estão ligadas no servidor. Rode a migração db/migrations/012_fichario.sql no Neon.';
const STORAGE_HINT = 'O armazenamento de arquivos ainda não está ligado. Crie o Blob (privado) na Vercel e conecte ao projeto.';

const id = z.string().uuid();
const ops = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add'),
    entryId: id,
    // A foto já reduzida (JPG) e a miniatura dela.
    data: z.string().min(8).max(base64Max(MAX_FILE_BYTES)),
    thumb: z.string().min(8).max(base64Max(MAX_THUMB_BYTES)).nullish(),
  }),
  z.object({ op: z.literal('delete'), id }),
]);

async function ready() {
  const rows = await query<{ t: string | null }>("SELECT to_regclass('public.journal_files')::text AS t");
  if (!rows[0].t) throw new HttpError(503, MIGRATION_HINT);
}

function jpeg(base64: string, max: number) {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0 || bytes.length > max || !FILE_TYPES['image/jpeg'](bytes)) throw new HttpError(415, 'Envie uma foto (JPG).');
  return bytes;
}

/** Foto de um registro: GET /api/fotos?id=<foto>[&mini=1] */
export const GET = endpoint(async request => {
  const member = await requireMember(request);
  const params = new URL(request.url).searchParams;
  const fileId = params.get('id') ?? '';
  if (!id.safeParse(fileId).success) throw new HttpError(400, 'Foto inválida.');
  await ready();
  const rows = await query<{ path: string; thumb_path: string | null; content_type: string }>(
    `SELECT f.path, f.thumb_path, f.content_type FROM journal_files f JOIN journal_entries e ON e.id = f.entry_id
     WHERE f.id::text = $1 AND f.family_id = $2 AND (e.visibility = 'shared' OR e.user_id = $3)`,
    [fileId, member.familyId, member.userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Foto não encontrada.');
  const path = params.get('mini') === '1' && rows[0].thumb_path ? rows[0].thumb_path : rows[0].path;
  const file = await getFile(path);
  if (!file) throw new HttpError(404, 'Foto não encontrada.');
  return new Response(file.body as BodyInit, { headers: privateFileHeaders(rows[0].content_type, 'foto') });
});

async function ownEntry(m: Member, entryId: string) {
  const rows = await query('SELECT 1 FROM journal_entries WHERE id::text = $1 AND family_id = $2 AND user_id = $3', [entryId, m.familyId, m.userId]);
  if (!rows[0]) throw new HttpError(404, 'Registro não encontrado.');
}

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  await ready();
  const o = parsed.data;
  const fid = member.familyId;

  switch (o.op) {
    case 'add': {
      if (!storageReady()) throw new HttpError(503, STORAGE_HINT);
      await ownEntry(member, o.entryId);
      const photo = jpeg(o.data, MAX_FILE_BYTES);
      const thumb = o.thumb ? jpeg(o.thumb, MAX_THUMB_BYTES) : null;
      const [usage] = await query<{ files: number }>('SELECT COUNT(*)::int AS files FROM journal_files WHERE entry_id::text = $1', [o.entryId]);
      if (usage.files >= MAX_PHOTOS_PER_ENTRY) throw new HttpError(409, `Cada registro guarda até ${MAX_PHOTOS_PER_ENTRY} fotos.`);
      const size = photo.length + (thumb?.length ?? 0);
      if ((await familyUsedBytes(fid)) + size > FAMILY_QUOTA_BYTES) throw new HttpError(409, QUOTA_MESSAGE);

      const name = randomUUID();
      const path = `familias/${fid}/${name}.jpg`;
      const thumbPath = thumb ? `familias/${fid}/${name}-mini.jpg` : null;
      await putFile(path, photo, 'image/jpeg');
      if (thumb) await putFile(thumbPath!, thumb, 'image/jpeg');
      try {
        await query(
          `INSERT INTO journal_files (entry_id, family_id, path, thumb_path, content_type, size_bytes) VALUES ($1, $2, $3, $4, 'image/jpeg', $5)`,
          [o.entryId, fid, path, thumbPath, size],
        );
      } catch (err) {
        // O registro foi apagado no meio do envio: não deixa a foto solta.
        await deleteFiles([path, ...(thumbPath ? [thumbPath] : [])]).catch(() => undefined);
        throw err;
      }
      break;
    }
    case 'delete': {
      const rows = await query<{ path: string; thumb_path: string | null }>(
        `DELETE FROM journal_files f USING journal_entries e
         WHERE f.entry_id = e.id AND f.id::text = $1 AND f.family_id = $2 AND e.user_id = $3
         RETURNING f.path, f.thumb_path`,
        [o.id, fid, member.userId],
      );
      if (!rows[0]) throw new HttpError(404, 'Foto não encontrada.');
      await deleteFiles(rows.flatMap(r => [r.path, ...(r.thumb_path ? [r.thumb_path] : [])])).catch(err => console.error('Foto não apagada do armazenamento', err));
      break;
    }
  }
  return json({ ok: true, data: await fetchAll(fid, member.userId) });
});
