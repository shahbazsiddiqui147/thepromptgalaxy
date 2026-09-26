import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { cache } from 'react'
import { getPool } from '@/db/pool'
import { getPublishedPage } from '@/site/pages'
import { normalizePath, resolveRedirect } from '@/site/redirects'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ path: string[] }> }

/** Editable pages live at /slug/ (one segment). */
const loadPage = cache(async (path: string[]) => (path.length === 1 ? getPublishedPage(getPool(), path[0].toLowerCase()) : null))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params
  const page = await loadPage(path)
  if (!page) return {}
  return {
    title: `${page.seoTitle || page.title} – ThePromptGalaxy`,
    description: page.seoDescription || undefined,
    alternates: { canonical: `/${page.slug}/` },
  }
}

/** Reached only for paths no other route handles: an editable page, a recorded redirect, or the 404 page. */
export default async function CatchAllPage({ params }: Props) {
  const { path } = await params
  const page = await loadPage(path)
  if (page) {
    return (
      <>
        <div className="hub-head">
          <h1>{page.title}</h1>
        </div>
        <div className="article" style={{ paddingTop: 24 }} dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
      </>
    )
  }
  const hit = await resolveRedirect(getPool(), normalizePath(path))
  if (!hit) notFound()
  if (hit.status === 302) redirect(hit.to)
  permanentRedirect(hit.to)
}
