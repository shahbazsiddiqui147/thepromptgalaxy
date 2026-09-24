import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser, UserInputError, validateNewUser } from '@/lib/users'
import { closeTestPool, resetDb } from '@/test/db'

const valid = {
  email: 'Owner@Example.com',
  password: 'a-long-password',
  displayName: 'Owner',
  handle: 'owner',
  role: 'admin' as const,
}

describe('validateNewUser', () => {
  it('accepts a valid user', () => {
    expect(validateNewUser(valid)).toBeNull()
  })
  it('rejects a bad email, a short password and a bad handle', () => {
    expect(validateNewUser({ ...valid, email: 'nope' })).toMatch(/email/i)
    expect(validateNewUser({ ...valid, password: 'short' })).toMatch(/10 characters/)
    expect(validateNewUser({ ...valid, handle: 'A B' })).toMatch(/handle/i)
    expect(validateNewUser({ ...valid, displayName: '  ' })).toMatch(/name/i)
  })
})

describe('createUser', () => {
  let pool: Awaited<ReturnType<typeof resetDb>>
  beforeEach(async () => {
    pool = await resetDb()
  })
  afterAll(closeTestPool)

  it('stores a hashed password and the role', async () => {
    const id = await createUser(pool, valid)
    const { rows } = await pool.query('SELECT email, password_hash, role FROM users WHERE id = $1', [id])
    expect(rows[0].role).toBe('admin')
    expect(rows[0].password_hash.startsWith('scrypt$')).toBe(true)
    expect(rows[0].password_hash).not.toContain('a-long-password')
  })

  it('rejects a duplicate email regardless of case', async () => {
    await createUser(pool, valid)
    await expect(createUser(pool, { ...valid, email: 'owner@example.COM', handle: 'other' })).rejects.toBeInstanceOf(
      UserInputError,
    )
  })

  it('rejects a duplicate handle', async () => {
    await createUser(pool, valid)
    await expect(createUser(pool, { ...valid, email: 'b@example.com' })).rejects.toBeInstanceOf(UserInputError)
  })
})
