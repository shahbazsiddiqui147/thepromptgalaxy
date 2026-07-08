import Link from 'next/link'
import type { Metadata } from 'next'
import { getArtStyles } from '@/lib/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Art Styles',
  description: 'Browse every art style in The Prompt Galaxy — pick a look to see every prompt tagged with it.',
  alternates: { canonical: 'https://thepromptgalaxy.com/style/' },
}

export default async function StyleHubPage() {
  const styles = await getArtStyles()

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)' }}>Art Styles</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {styles.map((s) => (
          <Link
            key={s.id}
            href={`/style/${s.slug}/`}
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--paper)', textDecoration: 'none', fontSize: 13 }}
          >
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
