import { ApiError } from '../api';
import { isIOS, isStandalone, limitedBrowser } from './pwa';

// Notificações neste aparelho: pedir permissão, inscrever no serviço de push
// do navegador e avisar o servidor.

export type NotifyKind = 'consultas' | 'momentos' | 'jornada' | 'parceiro';
export type NotifyPrefs = Record<NotifyKind, boolean>;

export interface PushStatus {
  publicKey: string;
  prefs: NotifyPrefs;
  endpoints: string[];
}

/**
 * ok: dá para ativar. ios-instalar: iPhone fora do app instalado (o Safari só
 * entrega notificações para apps na Tela de Início). outro-navegador: Edge no
 * Android ou navegador de rede social (abre, mas não entrega). sem-suporte: navegador antigo.
 */
export function pushSupport(): 'ok' | 'ios-instalar' | 'outro-navegador' | 'sem-suporte' {
  if (limitedBrowser()) return 'outro-navegador';
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (ok) return 'ok';
  if (isIOS() && !isStandalone()) return 'ios-instalar';
  return 'sem-suporte';
}

export const permission = (): NotificationPermission => ('Notification' in window ? Notification.permission : 'default');

async function call<T>(body?: unknown): Promise<T> {
  const res = await fetch('/api/push', {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'Falha na conexão.');
  return data as T;
}

export const pushStatus = () => call<PushStatus>();
export const savePrefs = (prefs: NotifyPrefs) => call<{ prefs: NotifyPrefs }>({ op: 'prefs', ...prefs });
export const sendTest = () => call<{ sent: number }>({ op: 'test' });

async function registration() {
  return navigator.serviceWorker.getRegistration('/').then(r => r ?? navigator.serviceWorker.register('/sw.js'));
}

/** Endereço deste aparelho no serviço de push, se já estiver ativo. */
export async function currentEndpoint(): Promise<string | null> {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/** Pede permissão e ativa neste aparelho. Devolve false se a pessoa não permitir. */
export async function enablePush(publicKey: string): Promise<boolean> {
  const result = await Notification.requestPermission();
  if (result !== 'granted') return false;
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // Inscrição feita com outra chave (ex.: servidor trocou de chave): refaz.
  if (sub && sub.options.applicationServerKey) {
    const current = new Uint8Array(sub.options.applicationServerKey);
    const wanted = keyBytes(publicKey);
    if (current.length !== wanted.length || current.some((b, i) => b !== wanted[i])) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await call({ op: 'subscribe', subscription: sub.toJSON() });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await call({ op: 'unsubscribe', endpoint: sub.endpoint });
  await sub.unsubscribe();
}
