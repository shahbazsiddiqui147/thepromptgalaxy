import type { Metadata } from 'next'
import { Pager } from '@/components/site/Pager'
import { PromptCard } from '@/components/site/PromptCard'
import { getPool } from '@/db/pool'
import { buildHref, type SearchParams } from '@/site/query'
import { cleanQuery, searchPrompts } from '@/site/search'

export const metadata: Metadata = {
  title: 'Search – ThePromptGalaxy',
  robots: { index: false, follow: true },
}

const PAGE_SIZE = 24

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const q = cleanQuery(raw)
  const pageNumber = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page)
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber, 500) : 1
  const { cards, total } = await searchPrompts(getPool(), q, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="hub-head">
        <span className="kicker">Search</span>
        <h1>{q ? `Results for “${q}”` : 'Search prompts'}</h1>
        <form action="/search/" method="get" role="search" style={{ marginTop: 16, maxWidth: 520 }}>
          <input type="search" name="q" className="input" defaultValue={q} placeholder="Try “headshot”, “Midjourney” or “sunset”" aria-label="Search prompts" maxLength={100} />
        </form>
      </div>
      {q === '' ? (
        <p className="empty">Type a word above to search titles, summaries, categories and tools.</p>
      ) : cards.length === 0 ? (
        <p className="empty">No prompts found for “{q}”. Try a shorter or different word.</p>
      ) : (
        <>
          <p style={{ padding: '16px 32px 0', margin: '0 0 16px', fontSize: 14, color: 'var(--color-neutral-700)' }}>
            {total} {total === 1 ? 'prompt' : 'prompts'}
          </p>
          <div className="grid-cards">
            {cards.map((card) => (
              <PromptCard key={card.id} card={card} />
            ))}
          </div>
          <Pager basePath={buildHref('/search/', { q })} page={page} pages={pages} />
        </>
      )}
    </>
  )
}
