import type { Author } from './types';

// Todo acesso a dados passa pelo servidor (/api), que confere o login e o
// espaço de quem chama. O navegador nunca fala direto com o banco.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'Falha na conexão.');
  return data as T;
}

export interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  role: Author;
  me: boolean;
}

export interface FamilyState {
  role: Author;
  members: FamilyMember[];
}

export interface Me {
  user: { id: string; name: string; email: string };
  /** Aceite dos Termos e da Política vigentes (LGPD). */
  consent: { version: string; accepted: boolean; previous: boolean };
  family: FamilyState | null;
  /** Os dados do espaço já vêm junto quando a pessoa pode vê-los: abrir o app é uma chamada só. */
  data?: unknown;
}

export const api = {
  config: () => request<{ google: boolean; passwordReset: boolean }>('/api/config'),
  data: <T>() => request<T>('/api/data'),
  /** Gravações: { op: 'createTask', ... }. Ver api/data.ts para a lista. */
  mutate: (op: string, payload: Record<string, unknown> = {}) => request<{ ok: true; data?: unknown }>('/api/data', { op, ...payload }),
  me: () => request<Me>('/api/family'),
  account: (op: 'deleteAccount' | 'deleteSpace', confirm: string) => request<{ ok: true }>('/api/account', { op, confirm }),
  family: <T = { ok: true; family: FamilyState | null }>(op: string, payload: Record<string, unknown> = {}) => request<T>('/api/family', { op, ...payload }),
};
