import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { changePassword, login } from '@/lib/auth'
import { destroySession, getSessionUser, SESSION_TTL_MS } from '@/lib/session'
import { createUser } from '@/lib/users'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
let userId: number

beforeEach(async () => {
  pool = await resetDb()
  userId = await createUser(pool, {
    email: 'owner@example.com',
    password: 'a-long-password',
    displayName: 'Owner',
    handle: 'owner',
    role: 'admin',
  })
})
afterAll(closeTestPool)

describe('login', () => {
  it('returns a working session for the right credentials', async () => {
    const result = await login(pool, 'OWNER@example.com', 'a-long-password')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const user = await getSessionUser(pool, result.token)
    expect(user).toMatchObject({ id: userId, email: 'owner@example.com', role: 'admin', handle: 'owner' })
    const { rows } = await pool.query('SELECT last_login_at FROM users WHERE id = $1', [userId])
    expect(rows[0].last_login_at).not.toBeNull()
  })

  it('rejects a wrong password and an unknown email the same way', async () => {
    expect(await login(pool, 'owner@example.com', 'wrong-password-1')).toEqual({ ok: false })
    expect(await login(pool, 'nobody@example.com', 'a-long-password')).toEqual({ ok: false })
  })

  it('rejects a disabled user', async () => {
    await pool.query('UPDATE users SET is_disabled = true WHERE id = $1', [userId])
    expect(await login(pool, 'owner@example.com', 'a-long-password')).toEqual({ ok: false })
  })
})

describe('changePassword', () => {
  it('changes the password so only the new one logs in', async () => {
    expect(await changePassword(pool, userId, 'a-long-password', 'a-brand-new-password')).toEqual({ ok: true })
    expect(await login(pool, 'owner@example.com', 'a-long-password')).toEqual({ ok: false })
    expect((await login(pool, 'owner@example.com', 'a-brand-new-password')).ok).toBe(true)
  })

  it('rejects a wrong current password and leaves the password unchanged', async () => {
    expect(await changePassword(pool, userId, 'not-my-password', 'a-brand-new-password')).toEqual({
      ok: false,
      error: 'Current password is incorrect.',
    })
    expect((await login(pool, 'owner@example.com', 'a-long-password')).ok).toBe(true)
  })

  it('rejects a short new password and one that equals the current one', async () => {
    expect(await changePassword(pool, userId, 'a-long-password', 'short')).toEqual({
      ok: false,
      error: 'New password must be at least 10 characters.',
    })
    expect(await changePassword(pool, userId, 'a-long-password', 'a-long-password')).toEqual({
      ok: false,
      error: 'New password must be different from the current one.',
    })
  })

  it('signs out every other session but keeps the current one', async () => {
    const current = await login(pool, 'owner@example.com', 'a-long-password')
    const other = await login(pool, 'owner@example.com', 'a-long-password')
    if (!current.ok || !other.ok) throw new Error('login failed')
    await changePassword(pool, userId, 'a-long-password', 'a-brand-new-password', current.token)
    expect(await getSessionUser(pool, current.token)).not.toBeNull()
    expect(await getSessionUser(pool, other.token)).toBeNull()
  })
})

describe('sessions', () => {
  it('stops working after expiry', async () => {
    const result = await login(pool, 'owner@example.com', 'a-long-password')
    if (!result.ok) throw new Error('login failed')
    const later = new Date(Date.now() + SESSION_TTL_MS + 1000)
    expect(await getSessionUser(pool, result.token, later)).toBeNull()
  })

  it('stops working after destroySession', async () => {
    const result = await login(pool, 'owner@example.com', 'a-long-password')
    if (!result.ok) throw new Error('login failed')
    await destroySession(pool, result.token)
    expect(await getSessionUser(pool, result.token)).toBeNull()
  })

  it('does not store the raw token', async () => {
    const result = await login(pool, 'owner@example.com', 'a-long-password')
    if (!result.ok) throw new Error('login failed')
    const { rows } = await pool.query('SELECT token_hash FROM sessions')
    expect(rows[0].token_hash).not.toBe(result.token)
  })
})
