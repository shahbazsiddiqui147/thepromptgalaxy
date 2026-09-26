import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { HubFilters, HubResults } from '@/components/site/HubResults'
import { getPool } from '@/db/pool'
import { getToolHub } from '@/site/hubs'
import { buildHref, parseHubQuery, type SearchParams } from '@/site/query'

const load = cache((slug: string) => getToolHub(getPool(), slug))

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const q = parseHubQuery(await searchParams)
  const hub = await load(slug)
  if (!hub) return {}
  const plain = !q.category && !q.fit && !q.price && q.sort === 'saved' && q.page === 1
  return {
    title: `${hub.tool.seoTitle || `${hub.tool.name} prompts`} – ThePromptGalaxy`,
    description: hub.tool.seoDescription || `Prompts tested on ${hub.tool.name}, each with a real example output.`,
    alternates: { canonical: `/tool/${slug}/` },
    robots: plain ? undefined : { index: false, follow: true },
  }
}

export default async function ToolPage({ params, searchParams }: Props) {
  const { slug } = await params
  const q = parseHubQuery(await searchParams)
  const hub = await load(slug)
  if (!hub) notFound()
  const path = `/tool/${slug}/`
  const category = hub.categories.find((c) => c.slug === q.category)
  const params2 = { category: category?.slug, fit: q.fit, price: q.price, sort: q.sort === 'newest' ? 'newest' : undefined }

  return (
    <>
      <div className="hub-head">
        <span className="kicker">By tool{hub.tool.vendor ? ` · ${hub.tool.vendor}` : ''}</span>
        <h1>{hub.tool.name}{category ? ` for ${category.name}` : ''}</h1>
        {category ? (
          <p style={{ marginTop: 12 }}>
            <Link href={`/category/${category.slug}/?tool=${hub.tool.slug}`}>All {category.name} prompts on {hub.tool.name} →</Link>
          </p>
        ) : null}
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
      <HubFilters path={path} params={params2} showFit />
      <HubResults
        filters={{ toolId: hub.tool.id, categoryId: category?.id, greatFitOnly: q.fit, price: q.price, sort: q.sort }}
        page={q.page}
        path={path}
        params={params2}
      />
    </>
  )
}
