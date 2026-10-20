import { z } from 'zod';
import { query } from './_lib/db.js';
import { HttpError, endpoint, json, readJson, requireUser } from './_lib/http.js';

// Conteúdo do app (migração 021): mensagem do dia e leituras da semana.
// Quem está logado lê o que está publicado. Quem está em ADMIN_EMAILS (variável
// de ambiente, e-mails separados por vírgula) vê também os rascunhos e edita.

const admins = () =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

const isAdmin = (email: string | null | undefined) => !!email && admins().includes(email.toLowerCase());

const COLUMNS = `id::text AS id, kind, title, body, week_from AS "weekFrom", week_to AS "weekTo", audience, source, minutes, status, updated_at::text AS "updatedAt"`;

function missing(err: unknown): never {
  if ((err as { code?: string }).code === '42P01') throw new HttpError(503, 'O conteúdo ainda não está ligado no servidor. Rode a migração db/migrations/021_conteudo.sql no Neon.');
  throw err;
}

/** GET /api/conteudo → o que está publicado (e, para quem administra, os rascunhos também). */
export const GET = endpoint(async request => {
  const user = await requireUser(request);
  const admin = isAdmin(user.email);
  try {
    const items = await query(`SELECT ${COLUMNS} FROM content_items ${admin ? '' : "WHERE status = 'publicado'"} ORDER BY kind, week_from, created_at`);
    return json({ items, admin, available: true });
  } catch (err) {
    if ((err as { code?: string }).code === '42P01') return json({ items: [], admin, available: false });
    throw err;
  }
});

const fields = {
  kind: z.enum(['mensagem', 'leitura']),
  title: z.string().trim().max(120).nullish().transform(v => v || null),
  body: z.string().trim().min(1).max(6000),
  weekFrom: z.number().int().min(1).max(42),
  weekTo: z.number().int().min(1).max(42),
  audience: z.enum(['casal', 'mae', 'pai']),
  source: z.string().trim().max(300).nullish().transform(v => v || null),
  minutes: z.number().int().min(1).max(30).nullish().transform(v => v ?? null),
  status: z.enum(['rascunho', 'publicado']),
};
const ops = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create'), ...fields }),
  z.object({ op: z.literal('update'), id: z.string().uuid(), ...fields }),
  z.object({ op: z.literal('delete'), id: z.string().uuid() }),
]);

/** POST /api/conteudo → criar, editar ou apagar um texto (só quem administra). */
export const POST = endpoint(async request => {
  const user = await requireUser(request);
  if (!isAdmin(user.email)) throw new HttpError(403, 'Só quem administra o conteúdo pode editar.');
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Confira os campos do texto.');
  const o = parsed.data;
  if (o.op === 'delete') {
    await query('DELETE FROM content_items WHERE id = $1', [o.id]).catch(missing);
    return json({ ok: true });
  }
  if (o.weekTo < o.weekFrom) throw new HttpError(400, 'A semana final precisa vir depois da inicial.');
  if (o.kind === 'leitura' && !o.title) throw new HttpError(400, 'Toda leitura precisa de um título.');
  const values = [o.kind, o.title, o.body, o.weekFrom, o.weekTo, o.audience, o.source, o.minutes, o.status];
  const rows =
    o.op === 'create'
      ? await query(
          `INSERT INTO content_items (kind, title, body, week_from, week_to, audience, source, minutes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${COLUMNS}`,
          values,
        ).catch(missing)
      : await query(
          `UPDATE content_items SET kind = $1, title = $2, body = $3, week_from = $4, week_to = $5, audience = $6, source = $7, minutes = $8, status = $9, updated_at = NOW()
           WHERE id = $10 RETURNING ${COLUMNS}`,
          [...values, o.id],
        ).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Texto não encontrado.');
  return json({ item: rows[0] });
});
