import { query } from './db.js';

/** Versão vigente dos Termos e da Política. Mudou o texto? Mude a versão e todos aceitam de novo. */
export const CONSENT_VERSION = '2026-10-16';

export async function hasConsent(userId: string) {
  const rows = await query('SELECT 1 FROM user_consents WHERE user_id = $1 AND version = $2', [userId, CONSENT_VERSION]);
  return rows.length > 0;
}
