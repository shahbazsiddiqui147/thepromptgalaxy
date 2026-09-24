'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import { login } from '@/lib/auth'
import { safeNextPath } from '@/lib/safe-next'
import { destroySession } from '@/lib/session'
import { clearSessionCookie, readSessionToken, setSessionCookie } from '@/lib/session-cookie'

export type LoginState = { error?: string }

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNextPath(String(formData.get('next') ?? ''))

  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const result = await login(getPool(), email, password, {
    ip: forwarded || undefined,
    userAgent: requestHeaders.get('user-agent') ?? undefined,
  })
  if (!result.ok) return { error: 'Email or password is incorrect.' }

  await setSessionCookie(result.token, result.expiresAt)
  redirect(next)
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken()
  if (token) await destroySession(getPool(), token)
  await clearSessionCookie()
  redirect('/login/')
}
