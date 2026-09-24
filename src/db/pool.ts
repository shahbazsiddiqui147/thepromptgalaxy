import pg from 'pg'
import '@/db/init-types'
import { requireEnv } from '@/lib/env'

/** Anything that can run a query: the pool, or a client inside a transaction. */
export type Queryable = Pick<pg.Pool, 'query'>

const globalForPool = globalThis as unknown as { __galaxyPool?: pg.Pool }

export function getPool(): pg.Pool {
  if (!globalForPool.__galaxyPool) {
    globalForPool.__galaxyPool = new pg.Pool({
      connectionString: requireEnv('DATABASE_URL'),
      max: 10,
    })
  }
  return globalForPool.__galaxyPool
}

export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (tx: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
