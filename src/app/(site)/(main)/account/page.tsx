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
    <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 56, maxWidth: 560 }}>
      <span className="kicker">Account</span>
      <h1 style={{ fontSize: 40, letterSpacing: '-0.03em', margin: '10px 0 20px' }}>{customer.name}</h1>
      <p style={{ marginTop: 0, color: 'var(--color-neutral-700)' }}>{customer.email}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/account/collection/" className="btn btn-primary">
          My collection
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary">
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}
