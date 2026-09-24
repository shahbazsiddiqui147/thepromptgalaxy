import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type pg from 'pg'

/**
 * Applies every *.sql file in `dir` (sorted by name) that is not yet recorded in
 * schema_migrations. Each file runs in its own transaction. Returns the names applied.
 */
export async function runMigrations(pool: pg.Pool, dir: string): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.name))
  const ran: string[] = []

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(dir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      ran.push(file)
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`)
    } finally {
      client.release()
    }
  }
  return ran
}
