import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '@/db/migrate'
import { closeTestPool, dropEverything } from '@/test/db'

async function makeDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'galaxy-mig-'))
  for (const [name, sql] of Object.entries(files)) {
    await writeFile(path.join(dir, name), sql)
  }
  return dir
}

describe('runMigrations', () => {
  beforeEach(async () => {
    await dropEverything()
  })
  afterAll(closeTestPool)

  it('applies pending files in name order and records them', async () => {
    const pool = await dropEverything()
    const dir = await makeDir({
      '002_b.sql': 'CREATE TABLE b (id int);',
      '001_a.sql': 'CREATE TABLE a (id int);',
    })
    try {
      const ran = await runMigrations(pool, dir)
      expect(ran).toEqual(['001_a.sql', '002_b.sql'])
      const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name')
      expect(rows.map((r) => r.name)).toEqual(['001_a.sql', '002_b.sql'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('skips files that were already applied', async () => {
    const pool = await dropEverything()
    const dir = await makeDir({ '001_a.sql': 'CREATE TABLE a (id int);' })
    try {
      await runMigrations(pool, dir)
      const second = await runMigrations(pool, dir)
      expect(second).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('rolls back a failing file and does not record it', async () => {
    const pool = await dropEverything()
    const dir = await makeDir({
      '001_ok.sql': 'CREATE TABLE ok_table (id int);',
      '002_bad.sql': 'CREATE TABLE half_table (id int); SELECT * FROM does_not_exist;',
    })
    try {
      await expect(runMigrations(pool, dir)).rejects.toThrow(/002_bad\.sql/)
      const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name')
      expect(rows.map((r) => r.name)).toEqual(['001_ok.sql'])
      const half = await pool.query(`SELECT to_regclass('half_table') AS t`)
      expect(half.rows[0].t).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
