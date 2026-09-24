import type { Queryable } from '@/db/pool'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, hashToken, toSessionUser, type SessionUser, type UserRow } from '@/lib/session'

export type LoginResult = { ok: true; token: string; expiresAt: Date; user: SessionUser } | { ok: false }

let dummyHash: Promise<string> | null = null

/** Verifying against a throwaway hash for unknown emails keeps timing similar to a real check. */
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-password')
  return dummyHash
}

export async function login(
  db: Queryable,
  email: string,
  password: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<LoginResult> {
  const { rows } = await db.query<UserRow & { password_hash: string }>(
    `SELECT id, email, password_hash, display_name, handle, role, is_premium
       FROM users WHERE lower(email) = lower($1) AND is_disabled = false`,
    [email.trim()],
  )
  const row = rows[0]
  const valid = await verifyPassword(password, row ? row.password_hash : await getDummyHash())
  if (!row || !valid) return { ok: false }

  const { token, expiresAt } = await createSession(db, row.id, meta)
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [row.id])
  return { ok: true, token, expiresAt, user: toSessionUser(row) }
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string }

/**
 * Changes a user's password after checking the current one. Every session of the user except
 * `keepToken` (the session making the request) is signed out.
 */
export async function changePassword(
  db: Queryable,
  userId: number,
  currentPassword: string,
  newPassword: string,
  keepToken?: string,
): Promise<ChangePasswordResult> {
  const { rows } = await db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId])
  if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
    return { ok: false, error: 'Current password is incorrect.' }
  }
  if (newPassword.length < 10) return { ok: false, error: 'New password must be at least 10 characters.' }
  if (newPassword === currentPassword) return { ok: false, error: 'New password must be different from the current one.' }

  await db.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
    await hashPassword(newPassword),
    userId,
  ])
  await db.query('DELETE FROM sessions WHERE user_id = $1 AND ($2::text IS NULL OR token_hash <> $2)', [
    userId,
    keepToken ? hashToken(keepToken) : null,
  ])
  return { ok: true }
}
