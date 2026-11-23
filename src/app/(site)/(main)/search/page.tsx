import type { Metadata } from 'next'
import Link from 'next/link'
import { PromptCard } from '@/components/PromptCard'
import { SearchForm } from '@/components/SearchForm'
import { catalogHref } from '@/lib/catalog'
import { getSaveCountMap, searchPrompts } from '@/lib/queries'
import { sortPromptCards, toPromptCard } from '@/lib/promptView'

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
}

function searchHref(
  term: string,
  params: { subject?: string | null; tool?: string | null; sort?: 'saved' | 'new' | null },
) {
  const base = catalogHref('/search/', params)
  if (!term) return base
  const joiner = base.includes('?') ? '&' : '?'
  return `${base}${joiner}q=${encodeURIComponent(term)}`
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; tool?: string; sort?: string }>
}) {
  const query = await searchParams
  const term = (Array.isArray(query.q) ? query.q[0] : query.q)?.trim() ?? ''
  const sort = query.sort === 'new' ? 'new' : 'saved'
  const [prompts, saveCounts] = await Promise.all([term ? searchPrompts(term) : Promise.resolve([]), getSaveCountMap()])
  const cards = prompts.flatMap((prompt) => {
    const card = toPromptCard(prompt, saveCounts[prompt.id] ?? 0, 'subject')
    return card ? [card] : []
  })

  const subjectCounts = new Map<string, { name: string; count: number }>()
  for (const card of cards) {
    const subject = subjectCounts.get(card.subjectSlug) ?? { name: card.subjectName, count: 0 }
    subject.count += 1
    subjectCounts.set(card.subjectSlug, subject)
  }

  const toolCounts = new Map<string, { id: number; name: string; count: number }>()
  for (const card of cards) {
    const prompt = prompts.find((item) => item.id === card.id)
    const entries = (prompt?.tools ?? []) as { tool?: { id?: number; name?: string; slug?: string | null } | number }[]
    const seen = new Set<string>()
    for (const entry of entries) {
      if (!entry.tool || typeof entry.tool === 'number' || !entry.tool.slug || entry.tool.id == null) continue
      if (seen.has(entry.tool.slug)) continue
      seen.add(entry.tool.slug)
      const current = toolCounts.get(entry.tool.slug) ?? { id: entry.tool.id, name: entry.tool.name ?? entry.tool.slug, count: 0 }
      current.count += 1
      toolCounts.set(entry.tool.slug, current)
    }
  }

  const activeSubject = query.subject && subjectCounts.has(query.subject) ? query.subject : null
  const activeTool = query.tool && toolCounts.has(query.tool) ? toolCounts.get(query.tool)! : null
  const filtered = sortPromptCards(
    cards.filter((card) => {
      if (activeSubject && card.subjectSlug !== activeSubject) return false
      if (activeTool && !card.toolIds.includes(activeTool.id)) return false
      return true
    }),
    sort,
  )

  const href = (next: { subject?: string | null; tool?: string | null; sort?: 'saved' | 'new' }) =>
    searchHref(term, {
      subject: next.subject === undefined ? activeSubject : next.subject,
      tool: next.tool === undefined ? (activeTool ? query.tool ?? null : null) : next.tool,
      sort: next.sort === undefined ? sort : next.sort,
    })

  return (
    <>
      <div className="page-pad" style={{ paddingTop: 32, paddingBottom: 32, borderBottom: '2px solid var(--color-text)', display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginBottom: 10 }}>
            {term ? `${filtered.length} results for "${term}"` : 'Search the library'}
          </div>
          <h1 style={{ fontSize: 44, letterSpacing: '-0.03em', margin: 0 }}>{term || 'Search'}</h1>
        </div>
        <SearchForm defaultValue={term} wide />
      </div>

      <div className="search-layout">
        <div className="search-facets">
          <FacetGroup
            label="Category"
            items={[...subjectCounts.entries()].map(([slug, item]) => ({
              key: slug,
              href: href({ subject: activeSubject === slug ? null : slug }),
              name: item.name,
              count: item.count,
              current: activeSubject === slug,
            }))}
          />
          <FacetGroup
            label="Tool"
            items={[...toolCounts.entries()].map(([slug, tool]) => ({
              key: slug,
              href: href({ tool: activeTool && query.tool === slug ? null : slug }),
              name: tool.name,
              count: tool.count,
              current: query.tool === slug,
            }))}
          />
          <div>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Price</span>
            <p style={{ margin: '10px 0 0', color: 'var(--color-neutral-700)' }}>
              Every published prompt is free. Premium pricing is not available yet.
            </p>
          </div>
        </div>
        <div>
          <div style={{ padding: '16px 24px', borderBottom: '2px solid var(--color-divider)', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{filtered.length} prompts</span>
            <Link href={href({ sort: sort === 'saved' ? 'new' : 'saved' })} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
              Sort: {sort === 'saved' ? 'Most saved' : 'Newest'} ▾
            </Link>
          </div>
          <div className="card-grid-3" style={{ padding: 24 }}>
            {!term && <p className="empty-state">Enter a search term to find prompts.</p>}
            {term && filtered.length === 0 && <p className="empty-state">No prompts match this search.</p>}
            {filtered.map((card) => (
              <PromptCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function FacetGroup({
  label,
  items,
}: {
  label: string
  items: { key: string; href: string; name: string; count: number; current: boolean }[]
}) {
  return (
    <div>
      <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && <span style={{ color: 'var(--color-neutral-600)' }}>None yet</span>}
        {items.map((item) => (
          <Link key={item.key} href={item.href} className="facet">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="facet-box" style={{ background: item.current ? 'var(--color-accent)' : 'transparent' }} />
              {item.name}
            </span>
            <span style={{ color: 'var(--color-neutral-600)' }}>{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
