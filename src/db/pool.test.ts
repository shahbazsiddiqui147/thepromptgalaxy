import { afterAll, describe, expect, it } from 'vitest'
import { withTransaction } from '@/db/pool'
import { closeTestPool, resetDb } from '@/test/db'

afterAll(closeTestPool)

describe('withTransaction', () => {
  it('commits on success and rolls back when the callback throws', async () => {
    const pool = await resetDb()
    await withTransaction(pool, (tx) => tx.query(`INSERT INTO audit_log (entity, action) VALUES ('t', 'ok')`))
    await expect(
      withTransaction(pool, async (tx) => {
        await tx.query(`INSERT INTO audit_log (entity, action) VALUES ('t', 'bad')`)
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    const { rows } = await pool.query('SELECT action FROM audit_log ORDER BY id')
    expect(rows.map((r) => r.action)).toEqual(['ok'])
  })
})
