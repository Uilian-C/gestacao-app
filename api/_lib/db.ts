import pg from 'pg';

// Só o servidor conhece a conexão com o banco (DATABASE_URL, sem o prefixo VITE_):
// ela nunca vai para o navegador.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Os dados do espaço são lidos em 14 consultas em paralelo.
  max: 14,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, values);
  return result.rows as T[];
}

/** Executa várias consultas numa transação, com a mesma conexão. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
