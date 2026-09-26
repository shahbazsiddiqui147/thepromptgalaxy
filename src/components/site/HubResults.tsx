import Link from 'next/link'
import { PromptCard } from '@/components/site/PromptCard'
import { Pager } from '@/components/site/Pager'
import { getPool } from '@/db/pool'
import { listCards } from '@/site/cards'
import { buildHref } from '@/site/query'
import type { CardFilters } from '@/site/types'

export const PAGE_SIZE = 24

type Params = Record<string, string | number | boolean | null | undefined>

/** Filter links: every option is a plain link that keeps the other parameters and resets to page 1. */
export function HubFilters({ path, params, showFit }: { path: string; params: Params; showFit: boolean }) {
  const href = (patch: Params) => buildHref(path, { ...params, page: undefined, ...patch })
  const price = params.price
  return (
    <div className="filter-row">
      {showFit ? (
        <Link href={href({ fit: !params.fit })} className={`tag tag-neutral${params.fit ? ' on' : ''}`}>
          Great fit only
        </Link>
      ) : null}
      <span className="sep">Price:</span>
      <Link href={href({ price: undefined })} className={`tag tag-neutral${!price ? ' on' : ''}`}>All</Link>
      <Link href={href({ price: 'free' })} className={`tag tag-neutral${price === 'free' ? ' on' : ''}`}>Free</Link>
      <Link href={href({ price: 'premium' })} className={`tag tag-neutral${price === 'premium' ? ' on' : ''}`}>Premium</Link>
      <span className="sep">Sort:</span>
      <Link href={href({ sort: undefined })} className={`tag tag-neutral${params.sort !== 'newest' ? ' on' : ''}`}>Most saved</Link>
      <Link href={href({ sort: 'newest' })} className={`tag tag-neutral${params.sort === 'newest' ? ' on' : ''}`}>Newest</Link>
    </div>
  )
}

export async function HubResults({
  filters,
  page,
  path,
  params,
}: {
  filters: Omit<CardFilters, 'limit' | 'offset'>
  page: number
  path: string
  params: Params
}) {
  const { cards, total } = await listCards(getPool(), { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (cards.length === 0) return <p className="empty">No prompts match these filters yet.</p>
  return (
    <>
      <p style={{ padding: '0 32px', margin: '0 0 16px', fontSize: 14, color: 'var(--color-neutral-700)' }}>
        {total} {total === 1 ? 'prompt' : 'prompts'}
      </p>
      <div className="grid-cards">
        {cards.map((card) => (
          <PromptCard key={card.id} card={card} />
        ))}
      </div>
      <Pager basePath={buildHref(path, { ...params, page: undefined })} page={page} pages={pages} />
    </>
  )
}
