import { createHash, randomBytes } from 'node:crypto'
import type { Queryable } from '@/db/pool'
import type { Role } from '@/lib/roles'

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

export type SessionUser = {
  id: number
  email: string
  displayName: string
  handle: string
  role: Role
  isPremium: boolean
}

export type UserRow = {
  id: number
  email: string
  display_name: string
  handle: string
  role: Role
  is_premium: boolean
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    handle: row.handle,
    role: row.role,
    isPremium: row.is_premium,
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(
  db: Queryable,
  userId: number,
  meta: { ip?: string; userAgent?: string } = {},
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await db.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [hashToken(token), userId, expiresAt, meta.ip ?? null, meta.userAgent ?? null],
  )
  return { token, expiresAt }
}

export async function getSessionUser(
  db: Queryable,
  token: string,
  now: Date = new Date(),
): Promise<SessionUser | null> {
  const { rows } = await db.query<UserRow>(
    `SELECT u.id, u.email, u.display_name, u.handle, u.role, u.is_premium
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > $2 AND u.is_disabled = false`,
    [hashToken(token), now],
  )
  return rows[0] ? toSessionUser(rows[0]) : null
}

export async function destroySession(db: Queryable, token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
}
