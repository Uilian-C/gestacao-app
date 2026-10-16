import { emailEnabled, googleEnabled } from './_lib/auth.js';
import { json } from './_lib/http.js';

/** O que a tela de login pode oferecer, conforme as chaves configuradas na Vercel. */
export function GET() {
  return json({ google: googleEnabled, passwordReset: emailEnabled });
}
