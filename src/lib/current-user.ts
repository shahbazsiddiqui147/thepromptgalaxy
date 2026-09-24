import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import type { Role } from '@/lib/roles'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { readSessionToken } from '@/lib/session-cookie'

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken()
  if (!token) return null
  return getSessionUser(getPool(), token)
})

/** Redirects to the login page unless the visitor is signed in with one of the given roles. */
export async function requireUser(roles: readonly Role[]): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login/')
  if (!roles.includes(user.role)) redirect('/login/?denied=1')
  return user
}
