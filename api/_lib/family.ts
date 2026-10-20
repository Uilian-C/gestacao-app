import { query } from './db.js';
import { findMembership, type SpaceMember } from './http.js';

/** Vagas de familiares quando a migração 023 ainda não rodou (sem a coluna, nenhuma). */
const NO_SLOTS = 0;

/**
 * Quem faz parte do espaço, com o papel e a foto de perfil (migração 015) de cada um.
 * O casal fica em `members`; os familiares (migração 023), em `relatives`, com o
 * parentesco. Familiar não recebe o e-mail de ninguém.
 */
export async function familyState(userId: string, known?: SpaceMember | null) {
  const member = known === undefined ? await findMembership(userId) : known;
  if (!member) return null;
  const [people, space] = await Promise.all([
    query<{ user_id: string; name: string; email: string; role: string; relation: string | null; joined_at: string; photo: string | null }>(
      `SELECT m.user_id, u.name, u.email, m.role, to_jsonb(m)->>'relation' AS relation, m.joined_at::text AS joined_at,
              CASE WHEN to_jsonb(m)->>'avatar_path' IS NOT NULL THEN to_jsonb(m)->>'avatar_updated_at' END AS photo
       FROM family_members m JOIN "user" u ON u.id = m.user_id
       WHERE m.family_id = $1 ORDER BY m.joined_at`,
      [member.familyId],
    ),
    query<{ slots: string | null }>(`SELECT to_jsonb(f)->>'family_slots' AS slots FROM families f WHERE f.id = $1`, [member.familyId]),
  ]);
  const relative = member.role === 'familia';
  const person = (m: (typeof people)[number]) => ({
    userId: m.user_id,
    name: m.name,
    email: relative && m.user_id !== userId ? '' : m.email,
    role: m.role,
    me: m.user_id === userId,
    photo: m.photo,
  });
  return {
    role: member.role,
    members: people.filter(m => m.role !== 'familia').map(person),
    relatives: people.filter(m => m.role === 'familia').map(m => ({ ...person(m), relation: m.relation, joinedAt: m.joined_at })),
    slots: space[0]?.slots == null ? NO_SLOTS : Number(space[0].slots),
  };
}
