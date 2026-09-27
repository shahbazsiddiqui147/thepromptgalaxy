import type { Metadata } from 'next'
import Link from 'next/link'
import { getPool } from '@/db/pool'
import { getStylesIndex } from '@/site/hubs'

export const metadata: Metadata = {
  title: 'Art styles – ThePromptGalaxy',
  description: 'Browse tested AI prompts by art style.',
  alternates: { canonical: '/style/' },
}

export default async function StylesIndexPage() {
  const styles = await getStylesIndex(getPool())
  return (
    <>
      <div className="hub-head">
        <span className="kicker">Art styles</span>
        <h1>Browse by style</h1>
        <p>Styles are a third filter, scoped within a category. Pick one to see what it looks like across categories.</p>
      </div>
      {styles.length === 0 ? (
        <p className="empty">No styles yet.</p>
      ) : (
        <div className="chips" style={{ paddingTop: 24 }}>
          {styles.map((s) => (
            <Link key={s.slug} href={`/style/${s.slug}/`} className="tag tag-neutral">
              {s.name} <span style={{ marginLeft: 6, opacity: 0.7 }}>{s.count}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
