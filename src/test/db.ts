import path from 'node:path'
import pg from 'pg'
import '@/db/init-types'
import { runMigrations } from '@/db/migrate'

let pool: pg.Pool | null = null

export function testPool(): pg.Pool {
  if (!pool) {
    const url = process.env.TEST_DATABASE_URL
    if (!url) {
      throw new Error('TEST_DATABASE_URL is required to run database tests (see docs/dev-setup.md)')
    }
    const dbName = new URL(url).pathname
    if (!/test/i.test(dbName)) {
      throw new Error(`Refusing to run tests against "${dbName}": the database name must contain "test"`)
    }
    pool = new pg.Pool({ connectionString: url, max: 4 })
  }
  return pool
}

export async function dropEverything(): Promise<pg.Pool> {
  const p = testPool()
  await p.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  return p
}

export async function resetDb(): Promise<pg.Pool> {
  const p = await dropEverything()
  await runMigrations(p, path.resolve('src/db/migrations'))
  return p
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
