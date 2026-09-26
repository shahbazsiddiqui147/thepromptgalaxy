import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { HubFilters, HubResults } from '@/components/site/HubResults'
import { getPool } from '@/db/pool'
import { getStyleHub } from '@/site/hubs'
import { buildHref, parseHubQuery, type SearchParams } from '@/site/query'

const load = cache((slug: string) => getStyleHub(getPool(), slug))

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const q = parseHubQuery(await searchParams)
  const hub = await load(slug)
  if (!hub) return {}
  const plain = !q.category && !q.price && q.sort === 'saved' && q.page === 1
  return {
    title: `${hub.style.name} prompts – ThePromptGalaxy`,
    description: `Tested prompts in the ${hub.style.name} art style, each with a real example output.`,
    alternates: { canonical: `/style/${slug}/` },
    robots: plain ? undefined : { index: false, follow: true },
  }
}

export default async function StylePage({ params, searchParams }: Props) {
  const { slug } = await params
  const q = parseHubQuery(await searchParams)
  const hub = await load(slug)
  if (!hub) notFound()
  const path = `/style/${slug}/`
  const category = hub.categories.find((c) => c.slug === q.category)
  const params2 = { category: category?.slug, price: q.price, sort: q.sort === 'newest' ? 'newest' : undefined }

  return (
    <>
      <div className="hub-head">
        <span className="kicker">Art style</span>
        <h1>{hub.style.name}{category ? ` · ${category.name}` : ''}</h1>
      </div>
      {hub.categories.length > 0 ? (
        <nav className="tabs-row" aria-label="Categories">
          <Link href={buildHref(path, {})} className={`tab-link${category ? '' : ' on'}`}>All categories</Link>
          {hub.categories.map((c) => (
            <Link key={c.id} href={buildHref(path, { category: c.slug })} className={`tab-link${category?.id === c.id ? ' on' : ''}`}>
              {c.name}
              <small>{c.count}</small>
            </Link>
          ))}
        </nav>
      ) : null}
      <HubFilters path={path} params={params2} showFit={false} />
      <HubResults filters={{ styleId: hub.style.id, categoryId: category?.id, price: q.price, sort: q.sort }} page={q.page} path={path} params={params2} />
    </>
  )
}
