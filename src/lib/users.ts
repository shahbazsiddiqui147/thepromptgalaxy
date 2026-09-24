import type { Queryable } from '@/db/pool'
import { hashPassword } from '@/lib/password'
import type { Role } from '@/lib/roles'

export type NewUser = {
  email: string
  password: string
  displayName: string
  handle: string
  role?: Role
}

export class UserInputError extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/

/** Returns a human-readable problem, or null when the input is acceptable. */
export function validateNewUser(input: NewUser): string | null {
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'Enter a valid email address.'
  if (input.password.length < 10) return 'Password must be at least 10 characters.'
  if (input.displayName.trim() === '' || input.displayName.trim().length > 80) {
    return 'Display name is required (at most 80 characters).'
  }
  if (!HANDLE_PATTERN.test(input.handle)) {
    return 'Handle must be 3-30 characters: lower-case letters, numbers, dots and underscores.'
  }
  return null
}

export async function createUser(db: Queryable, input: NewUser): Promise<number> {
  const problem = validateNewUser(input)
  if (problem) throw new UserInputError(problem)
  const passwordHash = await hashPassword(input.password)
  try {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, display_name, handle, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [input.email.trim(), passwordHash, input.displayName.trim(), input.handle, input.role ?? 'member'],
    )
    return rows[0].id
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new UserInputError('That email or handle is already in use.')
    }
    throw error
  }
}
