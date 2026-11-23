import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Premium',
  robots: { index: false, follow: true },
}

export default function PremiumPage() {
  return (
    <div className="page-pad" style={{ paddingTop: 56, paddingBottom: 80, maxWidth: 720 }}>
      <span className="kicker">Premium</span>
      <h1 style={{ fontSize: 48, letterSpacing: '-0.03em', margin: '12px 0 16px' }}>Premium is not open yet.</h1>
      <p style={{ margin: 0, fontSize: 16, color: 'var(--color-neutral-700)', maxWidth: 560 }}>
        There is no subscription to buy. Every published prompt is free to copy. This page is a placeholder for the design&apos;s Go Premium action.
      </p>
      <Link href="/browse/" className="btn btn-primary" style={{ marginTop: 24, padding: '13px 18px' }}>
        Browse prompts
      </Link>
    </div>
  )
}
