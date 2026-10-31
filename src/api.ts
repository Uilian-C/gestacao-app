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
  /** Quando a foto de perfil mudou (migração 015); null sem foto. */
  photo?: string | null;
}

/** Um familiar do espaço (migração 023): avó, tio, madrinha... */
export interface Relative extends Omit<FamilyMember, 'role'> {
  role: 'familia';
  /** O parentesco, como aparece no Mural ("Avó", "Tio"). */
  relation: string | null;
  joinedAt: string;
}

export type SpaceRole = Author | 'familia';

export interface FamilyState {
  role: SpaceRole;
  /** O casal (mãe e pai). */
  members: FamilyMember[];
  /** Os familiares (migração 023). */
  relatives?: Relative[];
  /** Quantos familiares o espaço pode ter. */
  slots?: number;
}

/** O espaço visto pelo casal. */
export type CoupleFamilyState = FamilyState & { role: Author };

export const isCoupleFamily = (f: FamilyState): f is CoupleFamilyState => f.role !== 'familia';

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
  /** Exames: create, addFile, deleteFile, delete. Ver api/exames.ts. */
  exams: <T = { ok: true; id?: string; data?: unknown }>(op: string, payload: Record<string, unknown> = {}) => request<T>('/api/exames', { op, ...payload }),
  /** Fotos do diário: add, delete. Ver api/fotos.ts. */
  photos: (op: 'add' | 'delete', payload: Record<string, unknown>) => request<{ ok: true; data?: unknown }>('/api/fotos', { op, ...payload }),
  /** Vídeos do diário e dos exames, em pedaços: part, finish, discard. Ver api/videos.ts e lib/videos.ts. */
  videos: (op: 'part' | 'finish' | 'discard', payload: Record<string, unknown>) => request<{ ok: true; id?: string; data?: unknown }>('/api/videos', { op, ...payload }),
  /** Foto de perfil de quem está logado: trocar (data) ou tirar (null). */
  avatar: (data: string | null) => request<{ ok: true; family: FamilyState }>('/api/fotos', data ? { op: 'avatar', data } : { op: 'removeAvatar' }),
};

/** Endereço de uma foto, PDF ou vídeo de exame (só abre para quem é do espaço); `cover` pede a capa do vídeo. */
export const examFileUrl = (fileId: string, cover = false) => `/api/exames?arquivo=${encodeURIComponent(fileId)}${cover ? '&capa=1' : ''}`;

/** Endereço de uma foto (ou vídeo) do diário; `mini` pede a miniatura (listas), que num vídeo é a capa. */
export const photoUrl = (photoId: string, mini = false) => `/api/fotos?id=${encodeURIComponent(photoId)}${mini ? '&mini=1' : ''}`;

/** Uma imagem parada de um item do registro: a foto, ou a capa quando é vídeo. */
export const stillUrl = (p: { id: string; thumb: boolean; video?: boolean }, mini = false) => photoUrl(p.id, p.video ? p.thumb : mini && p.thumb);

/** Foto de perfil de alguém do espaço; `version` muda a cada troca, para não mostrar a antiga. */
export const avatarUrl = (userId: string, version: string) => `/api/fotos?perfil=${encodeURIComponent(userId)}&v=${encodeURIComponent(version)}`;
