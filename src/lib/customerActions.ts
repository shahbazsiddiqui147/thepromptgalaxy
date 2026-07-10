'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-client'
import { CUSTOMER_COOKIE_NAME } from '@/lib/customerAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_TOKEN_EXPIRATION_SECONDS = 7200 // matches Payload's default auth.tokenExpiration

function isPlausibleEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}

async function setCustomerSessionCookie(token: string, exp?: number | null): Promise<void> {
  const cookieStore = await cookies()
  const maxAge = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : DEFAULT_TOKEN_EXPIRATION_SECONDS

  // A distinct, custom-named cookie — deliberately NOT Payload's own
  // "payload-token" cookie — so a customer session never collides with an
  // admin's /admin session on the same origin. See src/lib/customerAuth.ts
  // for the full explanation.
  cookieStore.set(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export async function signupAction(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!name || !email || !password) {
    redirect('/signup?error=missing_fields')
  }
  if (!isPlausibleEmail(email)) {
    redirect('/signup?error=invalid_email')
  }
  if (password.length < 8) {
    redirect('/signup?error=weak_password')
  }

  const payload = await getPayloadClient()

  try {
    await payload.create({
      collection: 'customers',
      data: { name, email, password },
    })
  } catch {
    // Most likely cause: duplicate email (unique constraint on the auth
    // collection's email field). We don't have a reliable typed error code
    // from the Local API here, so treat any create failure as "email taken"
    // — the alternative (a generic failure message) would be less useful
    // for the overwhelmingly common case.
    redirect('/signup?error=email_taken')
  }

  let token: string | undefined
  let exp: number | undefined
  try {
    const result = await payload.login({
      collection: 'customers',
      data: { email, password },
    })
    token = result.token
    exp = result.exp
  } catch {
    // Account was created but immediate login failed for some reason —
    // send them to log in manually rather than erroring the whole flow.
    redirect('/login?error=account_created')
  }

  if (!token) {
    redirect('/login?error=account_created')
  }

  await setCustomerSessionCookie(token, exp)
  redirect('/account')
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect('/login?error=missing_fields')
  }

  const payload = await getPayloadClient()

  let token: string | undefined
  let exp: number | undefined
  try {
    const result = await payload.login({
      collection: 'customers',
      data: { email, password },
    })
    token = result.token
    exp = result.exp
  } catch {
    redirect('/login?error=invalid_credentials')
  }

  if (!token) {
    redirect('/login?error=invalid_credentials')
  }

  await setCustomerSessionCookie(token, exp)
  redirect('/account')
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CUSTOMER_COOKIE_NAME)
  redirect('/login')
}
