import { z } from 'zod';
import { query } from './_lib/db.js';
import { FAMILY_QUOTA_BYTES, MAX_VIDEO_BYTES, QUOTA_MESSAGE, VIDEO_CHUNK_BYTES, base64Max, familyUsedBytes, sniffVideo } from './_lib/files.js';
import { fetchAll } from './_lib/gestation.js';
import { HttpError, endpoint, json, readJson, requireMember, type Member } from './_lib/http.js';
import { deleteFiles, fileSize, putFile, readBytes, storageReady } from './_lib/storage.js';

// Vídeos do diário e dos exames (o ultrassom em vídeo). O celular manda o vídeo
// em pedaços de 2,5 MB (o limite da Vercel é 4,5 MB por chamada) e, no fim,
// pede para juntar: aqui se confere se todos os pedaços chegaram e se é mesmo
// um vídeo, e só então ele aparece no registro. Junto vai uma imagem do vídeo
// (a capa), usada nas listas. Tudo fica numa pasta "video-<id>/" no mesmo
// armazenamento privado das fotos; tocar é por /api/fotos ou /api/exames.

const MAX_PHOTOS_PER_ENTRY = 4;
const MAX_FILES_PER_EXAM = 12;
const MAX_POSTER_BYTES = 200 * 1024;
const MAX_CHUNKS = Math.ceil(MAX_VIDEO_BYTES / VIDEO_CHUNK_BYTES);

const STORAGE_HINT = 'O armazenamento de arquivos ainda não está ligado. Crie o Blob (privado) na Vercel e conecte ao projeto.';
const TOO_BIG = `O vídeo passa de ${MAX_VIDEO_BYTES / 1024 / 1024} MB. Corte um trecho menor no celular e tente de novo.`;

const id = z.string().uuid();
const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('part'), upload: id, index: z.number().int().min(0).max(MAX_CHUNKS - 1), data: z.string().min(4).max(base64Max(VIDEO_CHUNK_BYTES)) }),
  z.object({
    op: z.literal('finish'),
    upload: id,
    target: z.enum(['entry', 'exam']),
    parentId: id,
    size: z.number().int().min(1),
    poster: z.string().min(8).max(base64Max(MAX_POSTER_BYTES)).nullish(),
  }),
  z.object({ op: z.literal('discard'), upload: id }),
]);

const folderOf = (m: Member, upload: string) => `familias/${m.familyId}/video-${upload}/`;

/** Onde o vídeo entra, se esta pessoa pode pôr: o próprio registro do diário ou um exame que ela vê. */
async function parent(m: Member, target: 'entry' | 'exam', parentId: string) {
  if (target === 'entry') {
    const rows = await query('SELECT 1 FROM journal_entries WHERE id::text = $1 AND family_id = $2 AND user_id = $3', [parentId, m.familyId, m.userId]);
    if (!rows[0]) throw new HttpError(404, 'Registro não encontrado.');
    const [usage] = await query<{ files: number }>('SELECT COUNT(*)::int AS files FROM journal_files WHERE entry_id::text = $1', [parentId]);
    if (usage.files >= MAX_PHOTOS_PER_ENTRY) throw new HttpError(409, `Cada registro guarda até ${MAX_PHOTOS_PER_ENTRY} fotos ou vídeos.`);
    return;
  }
  const rows = await query('SELECT 1 FROM exams WHERE id::text = $1 AND family_id = $2 AND (visibility = \'shared\' OR user_id = $3)', [parentId, m.familyId, m.userId]);
  if (!rows[0]) throw new HttpError(404, 'Exame não encontrado.');
  const [usage] = await query<{ files: number }>('SELECT COUNT(*)::int AS files FROM exam_files WHERE exam_id::text = $1', [parentId]);
  if (usage.files >= MAX_FILES_PER_EXAM) throw new HttpError(409, `Cada exame guarda até ${MAX_FILES_PER_EXAM} arquivos.`);
}

/** Todos os pedaços chegaram, cada um do tamanho certo? */
async function complete(folder: string, size: number) {
  const total = Math.ceil(size / VIDEO_CHUNK_BYTES);
  const sizes = await Promise.all(Array.from({ length: total }, (_, i) => fileSize(`${folder}${i}`)));
  return sizes.every((s, i) => s === (i < total - 1 ? VIDEO_CHUNK_BYTES : size - (total - 1) * VIDEO_CHUNK_BYTES));
}

export const POST = endpoint(async request => {
  const member = await requireMember(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const o = parsed.data;
  if (!storageReady()) throw new HttpError(503, STORAGE_HINT);
  const folder = folderOf(member, o.upload);

  switch (o.op) {
    case 'part': {
      const bytes = Buffer.from(o.data, 'base64');
      if (bytes.length === 0 || bytes.length > VIDEO_CHUNK_BYTES) throw new HttpError(400, 'Pedaço do vídeo inválido.');
      // O primeiro pedaço já diz se é vídeo: assim não se envia o resto à toa.
      if (o.index === 0 && !sniffVideo(bytes)) throw new HttpError(415, 'Envie um vídeo (MP4 ou MOV).');
      await putFile(`${folder}${o.index}`, bytes, 'application/octet-stream');
      return json({ ok: true });
    }
    case 'discard': {
      await deleteFiles([folder]).catch(err => console.error('Vídeo não apagado do armazenamento', err));
      return json({ ok: true });
    }
    case 'finish': {
      try {
        if (o.size > MAX_VIDEO_BYTES) throw new HttpError(413, TOO_BIG);
        await parent(member, o.target, o.parentId);
        if (!(await complete(folder, o.size))) throw new HttpError(409, 'O vídeo não chegou inteiro. Tente enviar de novo.');
        const type = sniffVideo((await readBytes(`${folder}0`)) ?? Buffer.alloc(0));
        if (!type) throw new HttpError(415, 'Envie um vídeo (MP4 ou MOV).');
        const poster = o.poster ? Buffer.from(o.poster, 'base64') : null;
        if (poster && !(poster[0] === 0xff && poster[1] === 0xd8)) throw new HttpError(415, 'A capa do vídeo precisa ser JPG.');
        // Os pedaços ainda não contam no espaço da família: a conta soma o vídeo agora.
        // (size_bytes é o tamanho do vídeo em si, usado para tocar aos trechos; a capa é pequena e fica de fora.)
        if ((await familyUsedBytes(member.familyId)) + o.size > FAMILY_QUOTA_BYTES) throw new HttpError(409, QUOTA_MESSAGE);
        if (poster) await putFile(`${folder}capa`, poster, 'image/jpeg');

        if (o.target === 'entry') {
          await query(
            `INSERT INTO journal_files (entry_id, family_id, path, thumb_path, content_type, size_bytes) VALUES ($1, $2, $3, $4, $5, $6)`,
            [o.parentId, member.familyId, folder, poster ? `${folder}capa` : null, type, o.size],
          );
          return json({ ok: true, data: await fetchAll(member.familyId, member.userId) });
        }
        const rows = await query<{ id: string }>(
          `INSERT INTO exam_files (exam_id, family_id, path, content_type, size_bytes) VALUES ($1, $2, $3, $4, $5) RETURNING id::text AS id`,
          [o.parentId, member.familyId, folder, type, o.size],
        );
        return json({ ok: true, id: rows[0].id });
      } catch (err) {
        // Não deixa pedaços soltos ocupando o espaço da família.
        await deleteFiles([folder]).catch(() => undefined);
        throw err;
      }
    }
  }
});
