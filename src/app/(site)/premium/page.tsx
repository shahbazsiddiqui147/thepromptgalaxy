import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Go Premium – ThePromptGalaxy',
  robots: { index: false, follow: true },
}

export default function PremiumPage() {
  return (
    <div className="hero">
      <span className="kicker">Premium</span>
      <h1>Premium is coming soon.</h1>
      <p style={{ maxWidth: 560, marginTop: 16 }}>
        Premium prompts and chains will unlock here. Free prompts stay free.
      </p>
      <p>
        <Link href="/" className="btn btn-secondary">Back to all prompts</Link>
      </p>
    </div>
  )
}
