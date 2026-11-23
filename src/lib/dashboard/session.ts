import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload-client'

/** Admin session only. Never call this from the public site layout — that layout must stay ISR-safe. */
export type DashboardUser = User

const FALLBACK_MAX_AGE = 60 * 60 * 2

export async function getDashboardUser(): Promise<DashboardUser | null> {
  const payload = await getPayloadClient()
  const name = `${payload.config.cookiePrefix}-token`
  const token = (await cookies()).get(name)?.value
  if (!token) return null

  try {
    const { user } = await payload.auth({ headers: new Headers({ cookie: `${name}=${token}` }) })
    if (!user || user.collection !== 'users') return null
    return user
  } catch {
    return null
  }
}

export async function requireDashboardUser(): Promise<DashboardUser> {
  const user = await getDashboardUser()
  if (!user) redirect('/dashboard/login/')
  return user
}

export async function setAdminSession(token: string, exp?: number | null): Promise<void> {
  const payload = await getPayloadClient()
  const name = `${payload.config.cookiePrefix}-token`
  const maxAge = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : FALLBACK_MAX_AGE
  const store = await cookies()
  store.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export async function clearAdminSession(): Promise<void> {
  const payload = await getPayloadClient()
  const name = `${payload.config.cookiePrefix}-token`
  const store = await cookies()
  store.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
