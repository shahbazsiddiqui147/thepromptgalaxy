import type { MetadataRoute } from 'next'
import { getPool } from '@/db/pool'
import { getSitemapEntries } from '@/site/sitemap'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? 'https://thepromptgalaxy.com'
  const entries = await getSitemapEntries(getPool())
  return entries.map((entry) => ({ url: `${base}${entry.path}`, lastModified: entry.lastModified }))
}
