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
    <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 56 }}>
      <span className="kicker">Styles</span>
      <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '-0.03em', margin: '8px 0 20px' }}>Art styles</h1>
      <p style={{ margin: '0 0 20px', maxWidth: 640, color: 'var(--color-neutral-700)' }}>
        Styles are a third filter. Open one to see every prompt tagged with that look.
      </p>
      <div style={{ borderTop: '2px solid var(--color-text)' }}>
        {styles.length === 0 && <p className="empty-state">No art styles published yet.</p>}
        {styles.map((style, index) => (
          <Link key={style.id} href={`/style/${style.slug}/`} className="door-row" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent)' }}>{String(index + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{style.name}</span>
            <span />
            <span>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
