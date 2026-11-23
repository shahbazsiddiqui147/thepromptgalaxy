import type { Metadata } from 'next'
import Link from 'next/link'
import { signupAction } from '@/lib/customerActions'

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: true },
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Please fill in your name, email, and password.',
  invalid_email: 'That email address doesn’t look right.',
  weak_password: 'Password must be at least 8 characters.',
  email_taken: 'An account with that email already exists.',
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.' : null

  return (
    <div className="auth-split" style={{ flex: 1 }}>
      <div className="auth-pane" style={{ borderRight: '2px solid var(--color-text)', background: 'var(--color-surface)', gap: 20 }}>
        <span className="kicker">Join free</span>
        <h2 style={{ fontSize: 36, letterSpacing: '-0.02em', margin: 0, maxWidth: 360 }}>Tested prompts. Free to browse and save.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12, fontSize: 14 }}>
          <span>· Save prompts across every tool</span>
          <span>· Submit prompts you&apos;ve tested</span>
          <span>· Upgrade to Premium any time</span>
        </div>
      </div>
      <div className="auth-pane">
        <div className="auth-form">
          <span className="kicker">Create account</span>
          <h1 style={{ fontSize: 38, letterSpacing: '-0.03em', margin: '10px 0 28px' }}>Get started.</h1>
          {errorMessage && <p className="form-note">{errorMessage}</p>}
          <form action={signupAction} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label htmlFor="register-name">Display name</label>
              <input id="register-name" className="input" type="text" name="name" placeholder="Your display name" required autoComplete="nickname" />
            </div>
            <div className="field">
              <label htmlFor="register-email">Email</label>
              <input id="register-email" className="input" type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="register-password">Password</label>
              <input id="register-password" className="input" type="password" name="password" placeholder="At least 8 characters" required autoComplete="new-password" minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '13px 16px', fontSize: 15 }}>
              Create account
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
          <p style={{ margin: '24px 0 0', fontSize: 12, color: 'var(--color-neutral-600)' }}>
            By creating an account you agree to our <Link href="/privacy/">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
