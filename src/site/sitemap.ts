import type { Queryable } from '@/db/pool'

export type SitemapEntry = { path: string; lastModified?: Date }

/** Every URL that should be indexed: home, hubs, indexable category x tool combos and published prompts and pages. */
export async function getSitemapEntries(db: Queryable): Promise<SitemapEntry[]> {
  const [categories, tools, styles, combos, prompts, pages] = await Promise.all([
    db.query<{ slug: string }>('SELECT slug FROM categories WHERE is_active ORDER BY sort_order, slug'),
    db.query<{ slug: string }>('SELECT slug FROM tools WHERE is_active ORDER BY sort_order, slug'),
    db.query<{ slug: string }>('SELECT slug FROM styles WHERE is_active ORDER BY sort_order, slug'),
    db.query<{ category: string; tool: string }>(
      `SELECT c.slug AS category, t.slug AS tool FROM category_tools ct
         JOIN categories c ON c.id = ct.category_id JOIN tools t ON t.id = ct.tool_id
        WHERE ct.is_indexable AND c.is_active AND t.is_active ORDER BY c.slug, t.slug`,
    ),
    db.query<{ slug: string; updatedAt: Date }>(
      `SELECT p.slug, p.updated_at AS "updatedAt" FROM prompts p JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published' AND c.is_active ORDER BY p.published_at DESC, p.id DESC`,
    ),
    db.query<{ slug: string; updatedAt: Date }>(
      'SELECT slug, updated_at AS "updatedAt" FROM pages WHERE is_published ORDER BY sort_order, slug',
    ),
  ])
  return [
    { path: '/' },
    ...categories.rows.map((r) => ({ path: `/category/${r.slug}/` })),
    ...tools.rows.map((r) => ({ path: `/tool/${r.slug}/` })),
    ...styles.rows.map((r) => ({ path: `/style/${r.slug}/` })),
    ...combos.rows.map((r) => ({ path: `/category/${r.category}/?tool=${r.tool}` })),
    ...pages.rows.map((r) => ({ path: `/${r.slug}/`, lastModified: r.updatedAt })),
    ...prompts.rows.map((r) => ({ path: `/prompt/${r.slug}/`, lastModified: r.updatedAt })),
  ]
}
