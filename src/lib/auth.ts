import type { Queryable } from '@/db/pool'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, toSessionUser, type SessionUser, type UserRow } from '@/lib/session'

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
