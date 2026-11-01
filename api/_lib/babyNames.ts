import { query } from './db.js';
import { HttpError } from './http.js';

// As ideias de nome do bebê (migração 026): quem sugeriu e quem curtiu.
// Antes da migração, a lista vem nula e o app esconde a parte de sugerir.

export interface NameIdea {
  id: string;
  name: string;
  author_role: 'mae' | 'pai' | 'familia';
  author_id: string;
  mine: boolean;
  created_at: string;
  likes: Array<{ user_id: string; author_role: 'mae' | 'pai' | 'familia'; mine: boolean }>;
  /** O porquê do nome (migração 027). */
  note: string | null;
  /** Para quem é o nome e se está na lista final (migração 035). */
  for_sex: 'menina' | 'menino' | 'ambos';
  finalist: boolean;
  /** A conversa sobre o nome (migração 027). */
  comments: Array<{ id: string; user_id: string; author_role: 'mae' | 'pai' | 'familia'; body: string; mine: boolean; created_at: string }>;
}

/** Até quantas ideias um espaço guarda. */
const MAX_IDEAS = 80;

export const NAMES_MISSING = 'As sugestões de nome ainda não estão ligadas no servidor. Rode a migração db/migrations/026_nomes_do_bebe.sql no Neon.';

const missing = (err: unknown) => {
  if ((err as { code?: string }).code === '42P01') throw new HttpError(503, NAMES_MISSING);
  throw err;
};

const IDEA_SQL = (withComments: boolean) => `
  SELECT i.id::text AS id, i.name, i.author_role, i.user_id AS author_id, i.user_id = $2 AS mine, i.created_at::text AS created_at,
         to_jsonb(i) ->> 'note' AS note,
         COALESCE(to_jsonb(i) ->> 'for_sex', 'ambos') AS for_sex, COALESCE((to_jsonb(i) ->> 'finalist')::boolean, false) AS finalist,
         COALESCE((SELECT json_agg(json_build_object('user_id', l.user_id, 'author_role', l.author_role, 'mine', l.user_id = $2) ORDER BY l.created_at)
                   FROM baby_name_likes l WHERE l.idea_id = i.id), '[]') AS likes,
         ${
           withComments
             ? `COALESCE((SELECT json_agg(json_build_object('id', c.id, 'user_id', c.user_id, 'author_role', c.author_role, 'body', c.body, 'mine', c.user_id = $2, 'created_at', c.created_at) ORDER BY c.created_at)
                FROM baby_name_comments c WHERE c.idea_id = i.id), '[]')`
             : `'[]'::json`
         } AS comments
  FROM baby_name_ideas i WHERE i.family_id = $1 ORDER BY i.created_at`;

/** As ideias, com curtidas e conversa (sem a conversa antes da migração 027; nulo antes da 026). */
export async function fetchNameIdeas(fid: string, userId: string): Promise<NameIdea[] | null> {
  return query<NameIdea>(IDEA_SQL(true), [fid, userId])
    .catch(() => query<NameIdea>(IDEA_SQL(false), [fid, userId]))
    .catch(() => null);
}

const CADERNO_MISSING = 'As anotações e a conversa sobre os nomes ainda não estão ligadas no servidor. Rode a migração db/migrations/027_caderno_do_nome.sql no Neon.';
const cadernoMissing = (err: unknown) => {
  const code = (err as { code?: string }).code;
  if (code === '42P01' || code === '42703') throw new HttpError(503, CADERNO_MISSING);
  throw err;
};

async function ideaOf(fid: string, id: string) {
  const idea = await query('SELECT 1 FROM baby_name_ideas WHERE id = $1 AND family_id = $2', [id, fid]).catch(missing);
  if (idea.length === 0) throw new HttpError(404, 'Nome não encontrado.');
}

/** O porquê do nome: só quem sugeriu escreve (o casal também pode). */
export async function noteNameIdea(fid: string, userId: string, id: string, note: string | null, couple: boolean) {
  const rows = await query('UPDATE baby_name_ideas SET note = $3 WHERE id = $1 AND family_id = $2 AND ($4 OR user_id = $5) RETURNING id', [id, fid, note, couple, userId]).catch(cadernoMissing);
  if (rows.length === 0) throw new HttpError(404, 'Nome não encontrado.');
}

export async function commentNameIdea(fid: string, userId: string, role: string, id: string, body: string) {
  await ideaOf(fid, id);
  await query('INSERT INTO baby_name_comments (idea_id, user_id, author_role, body) VALUES ($1, $2, $3, $4)', [id, userId, role, body]).catch(cadernoMissing);
}

export async function deleteNameComment(fid: string, userId: string, id: string) {
  const rows = await query(
    `DELETE FROM baby_name_comments c USING baby_name_ideas i WHERE c.id = $1 AND c.idea_id = i.id AND i.family_id = $2 AND c.user_id = $3 RETURNING c.id`,
    [id, fid, userId],
  ).catch(cadernoMissing);
  if (rows.length === 0) throw new HttpError(404, 'Comentário não encontrado.');
}

/** O nome escolhido e quando (a data vai para o livro); antes da migração 027, só o nome. */
export async function setBabyName(fid: string, name: string | null) {
  await query('UPDATE families SET baby_name = $2, baby_name_at = CASE WHEN $3 THEN NOW() ELSE NULL END WHERE id = $1', [fid, name, name !== null]).catch(err => {
    if ((err as { code?: string }).code === '42703') return query('UPDATE families SET baby_name = $2 WHERE id = $1', [fid, name]);
    throw err;
  });
}

export async function addNameIdea(fid: string, userId: string, role: string, name: string, note?: string | null, forSex?: 'menina' | 'menino' | 'ambos' | null) {
  const [count] = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM baby_name_ideas WHERE family_id = $1', [fid]).catch(missing);
  if (count.n >= MAX_IDEAS) throw new HttpError(409, 'Já são muitas ideias de nome. Que tal tirar algumas antes?');
  const rows = await query<{ id: string }>(
    `INSERT INTO baby_name_ideas (family_id, name, user_id, author_role) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING RETURNING id::text AS id`,
    [fid, name, userId, role],
  ).catch(missing);
  if (rows[0] && note) await query('UPDATE baby_name_ideas SET note = $2 WHERE id = $1', [rows[0].id, note]).catch(() => undefined);
  if (rows[0] && forSex && forSex !== 'ambos') await query('UPDATE baby_name_ideas SET for_sex = $2 WHERE id = $1', [rows[0].id, forSex]).catch(() => undefined);
  // Quem sugere já curte o nome que sugeriu.
  if (rows[0]) await query('INSERT INTO baby_name_likes (idea_id, user_id, author_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [rows[0].id, userId, role]);
  return rows.length > 0;
}

export async function likeNameIdea(fid: string, userId: string, role: string, id: string, on: boolean) {
  const idea = await query('SELECT 1 FROM baby_name_ideas WHERE id = $1 AND family_id = $2', [id, fid]).catch(missing);
  if (idea.length === 0) throw new HttpError(404, 'Nome não encontrado.');
  if (on) await query('INSERT INTO baby_name_likes (idea_id, user_id, author_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, userId, role]);
  else await query('DELETE FROM baby_name_likes WHERE idea_id = $1 AND user_id = $2', [id, userId]);
}

/** O casal tira qualquer ideia; um familiar, só as que ele mesmo sugeriu. */
export async function deleteNameIdea(fid: string, userId: string, id: string, couple: boolean) {
  const rows = await query(
    `DELETE FROM baby_name_ideas WHERE id = $1 AND family_id = $2 AND ($3 OR user_id = $4) RETURNING id`,
    [id, fid, couple, userId],
  ).catch(missing);
  if (rows.length === 0) throw new HttpError(404, 'Nome não encontrado.');
}
