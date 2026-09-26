import type { Queryable } from '@/db/pool'

export type PublicPage = { slug: string; title: string; bodyHtml: string; seoTitle: string; seoDescription: string; updatedAt: Date }

export async function getPublishedPage(db: Queryable, slug: string): Promise<PublicPage | null> {
  const { rows } = await db.query<PublicPage>(
    `SELECT slug, title, body_html AS "bodyHtml", seo_title AS "seoTitle", seo_description AS "seoDescription", updated_at AS "updatedAt"
       FROM pages WHERE slug = $1 AND is_published`,
    [slug],
  )
  return rows[0] ?? null
}

export async function listFooterPages(db: Queryable): Promise<{ slug: string; title: string }[]> {
  const { rows } = await db.query<{ slug: string; title: string }>(
    'SELECT slug, title FROM pages WHERE is_published AND show_in_footer ORDER BY sort_order, title',
  )
  return rows
}
