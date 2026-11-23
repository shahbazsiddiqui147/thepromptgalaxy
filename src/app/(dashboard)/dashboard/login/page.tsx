import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loginAction } from '@/lib/dashboard/actions/auth'
import { one, safeNextPath } from '@/lib/dashboard/http'
import { getDashboardUser } from '@/lib/dashboard/session'
import { SubmitButton } from '@/components/dashboard/ui'

export const metadata: Metadata = { title: 'Log in' }

const ERRORS: Record<string, string> = {
  missing: 'Enter your email and password.',
  invalid: 'That email and password did not match an admin account.',
}

export default async function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>
}) {
  const user = await getDashboardUser()
  const params = await searchParams
  const nextPath = safeNextPath(one(params.next))
  if (user) redirect(nextPath)

  const error = ERRORS[one(params.error)] ?? null

  return (
    <main className="dash-login">
      <div className="dash-login-form">
        <p className="dash-kicker">The Prompt Galaxy</p>
        <h1 style={{ fontSize: 44, letterSpacing: '-0.04em', margin: '0 0 8px' }}>Admin login</h1>
        <p className="dash-lead">Sign in with your Payload admin account. Customer accounts stay on the public site.</p>
        {error ? (
          <p className="dash-error" role="alert">
            {error}
          </p>
        ) : null}
        <form action={loginAction} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20, maxWidth: 420 }}>
          <input type="hidden" name="next" value={nextPath} />
          <div className="field">
            <label htmlFor="admin-email">Email</label>
            <input id="admin-email" className="input" name="email" type="email" autoComplete="username" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" className="input" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Signing in…">
            Log in
          </SubmitButton>
        </form>
        <p className="dash-hint">
          <Link href="/">Back to the site</Link>
        </p>
      </div>
      <aside className="dash-login-aside">
        <p className="dash-kicker" style={{ color: '#fff' }}>
          Studio
        </p>
        <h2>Prompts, media, and settings without the Payload maze.</h2>
        <p>The original admin is still at /admin if you need it.</p>
      </aside>
    </main>
  )
}
