import { betterAuth } from 'better-auth';
import { pool } from './db.js';

const env = process.env;
const vercelOrigins = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter((host): host is string => !!host)
  .map(host => `https://${host}`);

/** Endereços de onde o app pode chamar a API. */
export const trustedOrigins = [...vercelOrigins, ...(env.BETTER_AUTH_URL ? [new URL(env.BETTER_AUTH_URL).origin] : [])];

/**
 * Endereço público usado nos retornos do login (ex.: Google). Em produção é
 * sempre o domínio oficial, nunca o endereço interno de cada publicação.
 */
function publicUrl() {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/+$/, '');
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_BRANCH_URL) return `https://${env.VERCEL_BRANCH_URL}`;
  return env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
}

export const googleEnabled = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const emailEnabled = !!(env.RESEND_API_KEY && env.EMAIL_FROM);

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) console.error('Falha ao enviar e-mail', res.status, await res.text());
}

export const auth = betterAuth({
  appName: 'Nossa Gestação',
  baseURL: publicUrl(),
  secret: env.BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    // "Esqueci minha senha" só funciona quando há um serviço de e-mail configurado.
    sendResetPassword: emailEnabled
      ? async ({ user, url }) => {
          await sendEmail(
            user.email,
            'Redefinir sua senha · Nossa Gestação',
            `<p>Olá, ${user.name || ''}!</p><p>Para criar uma nova senha, abra este link (vale por 1 hora):</p><p><a href="${url}">Criar nova senha</a></p><p>Se não foi você, ignore este e-mail.</p>`,
          );
        }
      : undefined,
  },
  socialProviders: googleEnabled
    ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, prompt: 'select_account' } }
    : {},
  account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
  // Na Vercel, o IP real de quem acessa chega nestes cabeçalhos (usado no limite de tentativas).
  advanced: { ipAddress: { ipAddressHeaders: ['x-vercel-forwarded-for', 'x-forwarded-for'] } },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  // Guardado no banco porque cada chamada pode cair numa instância diferente do servidor.
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 300, max: 3 },
    },
  },
});
