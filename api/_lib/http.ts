import { auth, trustedOrigins } from './auth.js';
import { query } from './db.js';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function isSameSite(request: Request, origin: string) {
  const host = new URL(origin).host;
  const own = [new URL(request.url).host, request.headers.get('host'), request.headers.get('x-forwarded-host')];
  return own.includes(host) || trustedOrigins.includes(new URL(origin).origin);
}

/** Envolve um endpoint: bloqueia chamadas de outros sites e transforma erros em respostas. */
export function endpoint(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      if (request.method !== 'GET') {
        const origin = request.headers.get('origin');
        if (origin && !isSameSite(request, origin)) throw new HttpError(403, 'Origem não permitida.');
        if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Envie JSON.');
      }
      return await fn(request);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'Erro interno.' }, 500);
    }
  };
}

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, 'Faça login para continuar.');
  return session.user;
}

export type Role = 'mae' | 'pai';
export interface Member {
  userId: string;
  familyId: string;
  role: Role;
}

export async function findMembership(userId: string): Promise<Member | null> {
  const rows = await query<{ family_id: string; role: Role }>('SELECT family_id::text AS family_id, role FROM family_members WHERE user_id = $1', [userId]);
  return rows[0] ? { userId, familyId: rows[0].family_id, role: rows[0].role } : null;
}

/** Usuário logado e o espaço dele. Toda leitura e gravação de dados passa por aqui. */
export async function requireMember(request: Request): Promise<Member> {
  const user = await requireUser(request);
  const member = await findMembership(user.id);
  if (!member) throw new HttpError(403, 'Você ainda não faz parte de um espaço.');
  return member;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}
