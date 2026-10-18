import { query } from './db.js';
import { findMembership, type Member } from './http.js';

/** Quem faz parte do espaço, com o papel e a foto de perfil (migração 015) de cada um. */
export async function familyState(userId: string, known?: Member | null) {
  const member = known === undefined ? await findMembership(userId) : known;
  if (!member) return null;
  const members = await query<{ user_id: string; name: string; email: string; role: string; joined_at: string; photo: string | null }>(
    `SELECT m.user_id, u.name, u.email, m.role, m.joined_at::text AS joined_at,
            CASE WHEN to_jsonb(m)->>'avatar_path' IS NOT NULL THEN to_jsonb(m)->>'avatar_updated_at' END AS photo
     FROM family_members m JOIN "user" u ON u.id = m.user_id
     WHERE m.family_id = $1 ORDER BY m.joined_at`,
    [member.familyId],
  );
  return {
    role: member.role,
    members: members.map(m => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role, me: m.user_id === userId, photo: m.photo })),
  };
}
