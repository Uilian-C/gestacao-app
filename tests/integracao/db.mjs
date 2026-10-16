// Recria o banco de teste do zero: tabelas originais + todas as migrações.
// Só roda em banco local, para nunca apagar dados de verdade.
import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

const MIGRATIONS = new URL('../../db/migrations/', import.meta.url);

export function assertLocal(url) {
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Os testes apagam o banco. Recusado: ${host} não é um banco local.`);
  }
}

/** Devolve o código de convite que a migração 005 cria para a família antiga. */
export async function resetDatabase(url) {
  assertLocal(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await client.query(readFileSync(new URL('./base.sql', import.meta.url), 'utf8'));
    for (const file of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
      await client.query(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
    }
    const { rows } = await client.query('SELECT code FROM family_invites WHERE created_by IS NULL');
    return rows[0]?.code;
  } finally {
    await client.end();
  }
}
