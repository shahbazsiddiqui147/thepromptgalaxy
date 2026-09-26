import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { HubFilters, HubResults } from '@/components/site/HubResults'
import { getPool } from '@/db/pool'
import { getCategoryHub, getComboMeta } from '@/site/hubs'
import { buildHref, parseHubQuery, type SearchParams } from '@/site/query'

const load = cache((slug: string) => getCategoryHub(getPool(), slug))

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const q = parseHubQuery(await searchParams)
  const hub = await load(slug)
  if (!hub) return {}
  const path = `/category/${slug}/`
  const tool = hub.tools.find((t) => t.slug === q.tool)
  const combo = tool ? await getComboMeta(getPool(), hub.category.id, tool.id) : null
  const plain = !q.style && !q.fit && !q.price && q.sort === 'saved' && q.page === 1
  const indexableCombo = Boolean(tool && combo?.isIndexable && plain)
  const index = plain && (!tool || indexableCombo)
  const title = combo?.seoTitle || (tool ? `${hub.category.name} prompts for ${tool.name}` : hub.category.seoTitle || `${hub.category.name} prompts`)
  const description = combo?.seoDescription || hub.category.seoDescription || hub.category.description || `Tested ${hub.category.name} prompts with real example outputs.`
  return {
    title: `${title} – ThePromptGalaxy`,
    description,
    alternates: { canonical: indexableCombo && tool ? buildHref(path, { tool: tool.slug }) : path },
    robots: index ? undefined : { index: false, follow: true },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const q = parseHubQuery(await searchParams)
  const hub = await load(slug)
  if (!hub) notFound()
  const path = `/category/${slug}/`
  const tool = hub.tools.find((t) => t.slug === q.tool)
  const style = hub.category.supportsStyles ? hub.styles.find((s) => s.slug === q.style) : undefined
  const combo = tool ? await getComboMeta(getPool(), hub.category.id, tool.id) : null
  const params2 = { tool: tool?.slug, style: style?.slug, fit: tool ? q.fit : false, price: q.price, sort: q.sort === 'newest' ? 'newest' : undefined }

  return (
    <>
      <div className="hub-head">
        <span className="kicker">By category</span>
        <h1>{hub.category.name}{tool ? ` on ${tool.name}` : ''}</h1>
        {combo?.intro ? <p>{combo.intro}</p> : hub.category.description ? <p>{hub.category.description}</p> : null}
        {tool ? (
          <p style={{ marginTop: 12 }}>
            <Link href={`/tool/${tool.slug}/`}>All {tool.name} prompts →</Link>
          </p>
        ) : null}
      </div>

      {hub.tools.length > 0 ? (
        <nav className="tabs-row" aria-label="Tools">
          <Link href={buildHref(path, { style: style?.slug })} className={`tab-link${tool ? '' : ' on'}`}>All tools</Link>
          {hub.tools.map((t) => (
            <Link key={t.id} href={buildHref(path, { tool: t.slug, style: style?.slug })} className={`tab-link${tool?.id === t.id ? ' on' : ''}`}>
              {t.name}
              <small>{t.count}</small>
            </Link>
          ))}
        </nav>
      ) : null}

      {hub.styles.length > 0 ? (
        <div className="filter-row">
          <span className="sep">Style:</span>
          <Link href={buildHref(path, { ...params2, style: undefined })} className={`tag tag-neutral${style ? '' : ' on'}`}>Any</Link>
          {hub.styles.map((s) => (
            <Link key={s.id} href={buildHref(path, { ...params2, style: s.slug })} className={`tag tag-neutral${style?.id === s.id ? ' on' : ''}`}>
              {s.name} ({s.count})
            </Link>
          ))}
        </div>
      ) : null}

      <HubFilters path={path} params={params2} showFit={Boolean(tool)} />
      <HubResults
        filters={{ categoryId: hub.category.id, toolId: tool?.id, styleId: style?.id, greatFitOnly: tool ? q.fit : false, price: q.price, sort: q.sort }}
        page={q.page}
        path={path}
        params={params2}
      />
    </>
  )
}
