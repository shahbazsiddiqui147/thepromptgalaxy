'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { clearAdminSession, getDashboardUser, setAdminSession } from '@/lib/dashboard/session'
import { isNextRedirect, safeNextPath } from '@/lib/dashboard/http'
import { getPayloadClient } from '@/lib/payload-client'

function loginError(code: string, nextPath: string): never {
  const search = new URLSearchParams({ error: code })
  if (nextPath !== '/dashboard/') search.set('next', nextPath)
  redirect(`/dashboard/login/?${search.toString()}`)
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const nextPath = safeNextPath(formData.get('next'))

  if (!email || !password) loginError('missing', nextPath)

  const payload = await getPayloadClient()
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    if (!result.token || result.user?.collection !== 'users') loginError('invalid', nextPath)
    await setAdminSession(result.token, result.exp)
  } catch (error) {
    if (isNextRedirect(error)) throw error
    loginError('invalid', nextPath)
  }

  redirect(nextPath)
}

function sessionIdFromToken(token: string): string | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { sid?: unknown }
    return typeof payload.sid === 'string' ? payload.sid : null
  } catch {
    return null
  }
}

export async function logoutAction(): Promise<void> {
  const payload = await getPayloadClient()
  const name = `${payload.config.cookiePrefix}-token`
  const token = (await cookies()).get(name)?.value
  const user = await getDashboardUser()
  if (user && token) {
    const sid = sessionIdFromToken(token)
    try {
      const current = await payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
      if (Array.isArray(current.sessions)) {
        const sessions = current.sessions.filter((session) => session.id !== sid)
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { sessions },
          depth: 0,
          user,
          overrideAccess: false,
        })
      }
    } catch {
      // The cookie is still cleared below, which ends this browser session.
    }
  }
  await clearAdminSession()
  redirect('/dashboard/login/')
}
