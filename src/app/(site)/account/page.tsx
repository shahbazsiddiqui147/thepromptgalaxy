import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentCustomer } from '@/lib/customerAuth'
import { logoutAction } from '@/lib/customerActions'

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: true },
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/login')

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px', maxWidth: 420 }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 40px)', margin: '12px 0' }}>
        Account
      </h1>

      <div
        style={{
          background: 'var(--ink-panel)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '18px 20px',
          marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{customer.name}</p>
        <p className="mono" style={{ color: 'var(--fade)', fontSize: 13, margin: 0 }}>
          {customer.email}
        </p>
      </div>

      <Link
        href="/account/collection"
        className="mono"
        style={{
          display: 'inline-block',
          background: 'var(--ink-panel)',
          color: 'var(--amber)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '9px 16px',
          fontSize: 13,
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        My Collection
      </Link>

      <form action={logoutAction}>
        <button
          type="submit"
          className="mono"
          style={{
            background: 'var(--ink-panel)',
            color: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '9px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </form>
    </div>
  )
}
