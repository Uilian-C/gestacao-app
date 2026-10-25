import webpush from 'web-push';
import { query } from './db.js';

// Notificações no celular (Web Push). Cada aparelho que ativou guarda uma
// "inscrição" no navegador; o servidor envia o aviso cifrado para o serviço
// de push do fabricante (Google, Apple, Mozilla), que entrega no aparelho.

export type NotifyKind = 'consultas' | 'momentos' | 'jornada' | 'parceiro';
export const NOTIFY_KINDS: NotifyKind[] = ['consultas', 'momentos', 'jornada', 'parceiro'];

export interface PushPayload {
  title: string;
  body: string;
  /** Tela que abre ao tocar (ex.: /?aba=consultas). */
  url: string;
  /** Avisos com a mesma etiqueta se substituem no aparelho. */
  tag?: string;
}

// Só serviços de push conhecidos: o servidor nunca envia para um endereço qualquer.
const PUSH_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'push.apple.com', 'push.services.mozilla.com', 'notify.windows.com'];

export function isPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (process.env.PUSH_ALLOW_ANY_HOST === '1') return true; // só para testes locais
  return url.protocol === 'https:' && PUSH_HOSTS.some(h => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

let keys: Promise<{ publicKey: string; privateKey: string }> | null = null;

/**
 * Chaves do Web Push. Se não houver nas variáveis de ambiente, o servidor gera
 * um par na primeira vez e guarda no banco: nada para configurar à mão.
 */
export function vapidKeys() {
  keys ??= (async () => {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    }
    const generated = webpush.generateVAPIDKeys();
    // Se duas instâncias gerarem ao mesmo tempo, vale a primeira gravada.
    await query("INSERT INTO app_secrets (name, value) VALUES ('vapid', $1) ON CONFLICT (name) DO NOTHING", [JSON.stringify(generated)]);
    const rows = await query<{ value: string }>("SELECT value FROM app_secrets WHERE name = 'vapid'");
    return JSON.parse(rows[0].value) as { publicKey: string; privateKey: string };
  })().catch(err => {
    keys = null;
    throw err;
  });
  return keys;
}

const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:uilianc.oliveira@gmail.com';

interface Subscription {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  best_time?: string | null;
}

async function deliver(sub: Subscription, payload: PushPayload) {
  const { publicKey, privateKey } = await vapidKeys();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
      vapidDetails: { subject: SUBJECT, publicKey, privateKey },
      TTL: 60 * 60 * 12,
      timeout: 8000,
    });
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // O aparelho cancelou ou a inscrição venceu: some da lista.
    if (status === 404 || status === 410) await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
    else console.error('Falha ao enviar notificação', status ?? err);
    return false;
  }
}

// ---- O orçamento dos avisos (migração 030) ----
// Aviso demais vira ruído, e ruído vira notificação desligada. Os de cuidado
// (consulta, lembrete, tarefa) chegam sempre. As novidades ("jornada": semana
// nova, véspera) chegam no horário que cada pessoa escolheu, no máximo uma por
// dia. Os da outra pessoa ("parceiro") nunca de madrugada: ficam no app.

export type BestTime = 'manha' | 'tarde' | 'noite';
const WINDOW: Record<BestTime, [number, number]> = { manha: [8, 12], tarde: [12, 18], noite: [18, 22] };
const ZONE = 'America/Sao_Paulo';

/** A hora (0 a 23) e o dia em São Paulo. */
export function localClock(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return { hour, day };
}

/** A novidade pode sair agora para quem escolheu esse horário (sem escolha, de manhã). */
export const inBestTime = (best: string | null | undefined, hour: number) => {
  const [from, to] = WINDOW[(best as BestTime) in WINDOW ? (best as BestTime) : 'manha'];
  return hour >= from && hour < to;
};

/** Madrugada: das 22h às 7h. */
export const quietHour = (hour: number) => hour >= 22 || hour < 7;

/** Nos testes, a hora não importa (LEMBRETES_QUALQUER_HORA=1). */
const anyHour = () => process.env.LEMBRETES_QUALQUER_HORA === '1';

/**
 * Envia para todos os aparelhos das pessoas que querem esse tipo de aviso.
 * Com `key`, cada pessoa recebe aquele aviso uma vez só, mesmo que o envio rode de novo.
 */
export async function notify(userIds: string[], kind: NotifyKind | null, payload: PushPayload, key?: string): Promise<number> {
  if (userIds.length === 0) return 0;
  const subs = await query<Subscription>(
    `SELECT s.endpoint, s.user_id, s.p256dh, s.auth, to_jsonb(p) ->> 'best_time' AS best_time
     FROM push_subscriptions s
     LEFT JOIN notification_prefs p ON p.user_id = s.user_id
     WHERE s.user_id = ANY($1::text[])
       AND ($2::text IS NULL
            OR ($2 = 'consultas' AND COALESCE(p.consultas, true))
            OR ($2 = 'momentos' AND COALESCE(p.momentos, true))
            OR ($2 = 'jornada' AND COALESCE(p.jornada, true))
            OR ($2 = 'parceiro' AND COALESCE(p.parceiro, true)))`,
    [userIds, kind],
  );
  const { hour, day } = localClock();
  let targets = subs;
  if (kind === 'parceiro' && quietHour(hour) && !anyHour()) return 0;
  // As novidades esperam o horário de cada um (o envio roda de novo mais tarde e o aviso sai na hora certa).
  if (kind === 'jornada' && !anyHour()) targets = targets.filter(s => inBestTime(s.best_time, hour));
  if (key) {
    const users = [...new Set(targets.map(s => s.user_id))];
    if (users.length === 0) return 0;
    const fresh = await query<{ user_id: string }>(
      `INSERT INTO notification_log (user_id, key) SELECT u, $2 FROM unnest($1::text[]) AS u
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [users, key],
    );
    const allowed = new Set(fresh.map(r => r.user_id));
    targets = targets.filter(s => allowed.has(s.user_id));
  }
  // No máximo uma novidade por dia para cada pessoa.
  if (kind === 'jornada' && targets.length) {
    const users = [...new Set(targets.map(s => s.user_id))];
    const fresh = await query<{ user_id: string }>(
      `INSERT INTO notification_log (user_id, key) SELECT u, $2 FROM unnest($1::text[]) AS u
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [users, `novidade:${day}`],
    );
    const allowed = new Set(fresh.map(r => r.user_id));
    targets = targets.filter(s => allowed.has(s.user_id));
  }
  const results = await Promise.all(targets.map(s => deliver(s, payload)));
  return results.filter(Boolean).length;
}
