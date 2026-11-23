import type { Metadata } from 'next'
import Link from 'next/link'
import { loginAction } from '@/lib/customerActions'

export const metadata: Metadata = {
  title: 'Log in',
  robots: { index: false, follow: true },
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Please enter your email and password.',
  invalid_credentials: 'Incorrect email or password.',
  account_created: 'Account created — please log in.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.' : null

  return (
    <div className="auth-split" style={{ flex: 1 }}>
      <div className="auth-pane">
        <div className="auth-form">
          <span className="kicker">Log in</span>
          <h1 style={{ fontSize: 38, letterSpacing: '-0.03em', margin: '10px 0 28px' }}>Welcome back.</h1>
          {errorMessage && <p className="form-note">{errorMessage}</p>}
          <form action={loginAction} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" className="input" type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input id="login-password" className="input" type="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span className="text-muted" style={{ fontSize: 13 }} title="Password reset is not available yet.">
                Forgot password?
              </span>
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '13px 16px', fontSize: 15 }}>
              Log in
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: 'var(--color-neutral-500)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 2, background: 'var(--color-divider)' }} />
            or
            <div style={{ flex: 1, height: 2, background: 'var(--color-divider)' }} />
          </div>
          <button type="button" className="btn btn-secondary btn-block" style={{ padding: '13px 16px', fontSize: 15 }} disabled title="Google sign-in is not connected yet.">
            Continue with Google
          </button>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--color-neutral-600)' }}>TODO: Google sign-in is not connected.</p>
          <p style={{ margin: '24px 0 0', fontSize: 13, color: 'var(--color-neutral-700)' }}>
            Don&apos;t have an account? <Link href="/register/">Create one</Link>
          </p>
        </div>
      </div>
      <div className="auth-pane" style={{ borderLeft: '2px solid var(--color-text)', background: 'var(--color-accent)', color: 'var(--color-bg)', gap: 20 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Why sign in</span>
        <h2 style={{ fontSize: 36, letterSpacing: '-0.02em', margin: 0, maxWidth: 360 }}>Save prompts, submit your own, track what works.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12, fontSize: 14 }}>
          <span>· Save prompts to come back to</span>
          <span>· Submit prompts you&apos;ve tested</span>
          <span>· Unlock Premium chains</span>
        </div>
      </div>
    </div>
  )
}
