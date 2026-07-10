import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
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
    <div className="wrap" style={{ padding: '24px 24px 56px', maxWidth: 420 }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 40px)', margin: '12px 0' }}>
        Log in
      </h1>
      <p style={{ color: 'var(--fade)', fontSize: 14, marginBottom: 24 }}>
        Welcome back. Log in to view your saved prompts.
      </p>

      {errorMessage && (
        <p
          className="mono"
          style={{
            background: 'var(--ink-panel)',
            border: `1px solid ${error === 'account_created' ? 'var(--steel)' : 'var(--rust)'}`,
            color: 'var(--paper)',
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 12.5,
            marginBottom: 20,
          }}
        >
          {errorMessage}
        </p>
      )}

      <form action={loginAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.1em' }}>
            EMAIL
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.1em' }}>
            PASSWORD
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>
        <button
          type="submit"
          className="mono"
          style={{
            marginTop: 8,
            background: 'var(--amber)',
            color: 'var(--ink)',
            border: 'none',
            borderRadius: 4,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Log in
        </button>
      </form>

      <p className="mono" style={{ color: 'var(--fade)', fontSize: 12, marginTop: 20 }}>
        New here?{' '}
        <Link href="/signup" style={{ color: 'var(--amber)' }}>
          Create an account
        </Link>
      </p>
    </div>
  )
}

const inputStyle: CSSProperties = {
  background: 'var(--ink-panel)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '9px 12px',
  color: 'var(--paper)',
  fontSize: 14,
}
