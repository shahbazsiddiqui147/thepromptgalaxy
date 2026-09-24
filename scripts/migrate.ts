import path from 'node:path'
import { getPool } from '../src/db/pool'
import { runMigrations } from '../src/db/migrate'

const pool = getPool()
try {
  const ran = await runMigrations(pool, path.resolve('src/db/migrations'))
  console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'No pending migrations')
} finally {
  await pool.end()
}
