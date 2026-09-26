import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import { normalizePath, resolveRedirect } from '@/site/redirects'

export const dynamic = 'force-dynamic'

/** Only reached for paths no other route handles: serve a recorded redirect, otherwise the 404 page. */
export default async function CatchAllPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const hit = await resolveRedirect(getPool(), normalizePath(path))
  if (!hit) notFound()
  if (hit.status === 302) redirect(hit.to)
  permanentRedirect(hit.to)
}
