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
}

/** Até quantas ideias um espaço guarda. */
const MAX_IDEAS = 80;

export const NAMES_MISSING = 'As sugestões de nome ainda não estão ligadas no servidor. Rode a migração db/migrations/026_nomes_do_bebe.sql no Neon.';

const missing = (err: unknown) => {
  if ((err as { code?: string }).code === '42P01') throw new HttpError(503, NAMES_MISSING);
  throw err;
};

export async function fetchNameIdeas(fid: string, userId: string): Promise<NameIdea[] | null> {
  return query<NameIdea>(
    `SELECT i.id::text AS id, i.name, i.author_role, i.user_id AS author_id, i.user_id = $2 AS mine, i.created_at::text AS created_at,
            COALESCE((SELECT json_agg(json_build_object('user_id', l.user_id, 'author_role', l.author_role, 'mine', l.user_id = $2) ORDER BY l.created_at)
                      FROM baby_name_likes l WHERE l.idea_id = i.id), '[]') AS likes
     FROM baby_name_ideas i WHERE i.family_id = $1 ORDER BY i.created_at`,
    [fid, userId],
  ).catch(() => null);
}

export async function addNameIdea(fid: string, userId: string, role: string, name: string) {
  const [count] = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM baby_name_ideas WHERE family_id = $1', [fid]).catch(missing);
  if (count.n >= MAX_IDEAS) throw new HttpError(409, 'Já são muitas ideias de nome. Que tal tirar algumas antes?');
  const rows = await query<{ id: string }>(
    `INSERT INTO baby_name_ideas (family_id, name, user_id, author_role) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING RETURNING id::text AS id`,
    [fid, name, userId, role],
  ).catch(missing);
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
