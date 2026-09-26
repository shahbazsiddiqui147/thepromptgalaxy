import type { Queryable } from '@/db/pool'
import { CARD_JOINS, CARD_SELECT } from '@/site/cards'
import type { Card } from '@/site/types'

export type Counted = { slug: string; name: string; count: number }
export type Totals = { prompts: number; categories: number; tools: number }

const PUBLISHED = `p.status = 'published'`

export async function getNav(db: Queryable): Promise<{ categories: Counted[]; tools: Counted[]; totals: Totals }> {
  const [categories, tools, prompts] = await Promise.all([
    db.query<Counted>(
      `SELECT c.slug, c.name, (SELECT count(*)::int FROM prompts p WHERE p.category_id = c.id AND ${PUBLISHED}) AS count
         FROM categories c WHERE c.is_active ORDER BY c.sort_order, c.name`,
    ),
    db.query<Counted>(
      `SELECT t.slug, t.name,
              (SELECT count(DISTINCT p.id)::int FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
                 JOIN categories c ON c.id = p.category_id
                WHERE pt.tool_id = t.id AND ${PUBLISHED} AND c.is_active) AS count
         FROM tools t WHERE t.is_active ORDER BY t.sort_order, t.name`,
    ),
    db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM prompts p JOIN categories c ON c.id = p.category_id WHERE ${PUBLISHED} AND c.is_active`,
    ),
  ])
  return {
    categories: categories.rows,
    tools: tools.rows,
    totals: { prompts: prompts.rows[0].n, categories: categories.rows.length, tools: tools.rows.length },
  }
}

export type HomeData = {
  categories: (Counted & { id: number })[]
  tools: (Counted & { id: number })[]
  pairCounts: { categoryId: number; toolId: number; count: number }[]
  styles: { slug: string; name: string }[]
  mostSaved: Card[]
  totals: Totals
}

export async function getHome(db: Queryable): Promise<HomeData> {
  const [nav, ids, pairs, styles, mostSaved] = await Promise.all([
    getNav(db),
    Promise.all([
      db.query<{ id: number; slug: string }>('SELECT id, slug FROM categories WHERE is_active'),
      db.query<{ id: number; slug: string }>('SELECT id, slug FROM tools WHERE is_active'),
    ]),
    db.query<{ categoryId: number; toolId: number; count: number }>(
      `SELECT pt.category_id AS "categoryId", pt.tool_id AS "toolId", count(*)::int AS count
         FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
         JOIN categories c ON c.id = pt.category_id JOIN tools t ON t.id = pt.tool_id
        WHERE ${PUBLISHED} AND c.is_active AND t.is_active GROUP BY 1, 2`,
    ),
    db.query<{ slug: string; name: string }>(`SELECT slug, name FROM styles WHERE is_active ORDER BY sort_order, name`),
    db.query<Card>(
      `SELECT ${CARD_SELECT} FROM prompts p ${CARD_JOINS} WHERE ${PUBLISHED} AND c.is_active
        ORDER BY p.save_count DESC, p.published_at DESC, p.id DESC LIMIT 4`,
    ),
  ])
  const [catIds, toolIds] = ids
  const catId = new Map(catIds.rows.map((r) => [r.slug, r.id]))
  const toolId = new Map(toolIds.rows.map((r) => [r.slug, r.id]))
  return {
    categories: nav.categories.map((c) => ({ ...c, id: catId.get(c.slug) as number })),
    tools: nav.tools.map((t) => ({ ...t, id: toolId.get(t.slug) as number })),
    pairCounts: pairs.rows,
    styles: styles.rows,
    mostSaved: mostSaved.rows,
    totals: nav.totals,
  }
}

export type CategoryHub = {
  category: { id: number; slug: string; name: string; description: string; supportsStyles: boolean; seoTitle: string; seoDescription: string }
  tools: { id: number; slug: string; name: string; count: number; isIndexable: boolean }[]
  styles: { id: number; slug: string; name: string; count: number }[]
}

export async function getCategoryHub(db: Queryable, slug: string): Promise<CategoryHub | null> {
  const { rows } = await db.query<CategoryHub['category']>(
    `SELECT id, slug, name, description, supports_styles AS "supportsStyles", seo_title AS "seoTitle", seo_description AS "seoDescription"
       FROM categories WHERE slug = $1 AND is_active`,
    [slug],
  )
  const category = rows[0]
  if (!category) return null
  const [tools, styles] = await Promise.all([
    db.query<CategoryHub['tools'][number]>(
      `SELECT t.id, t.slug, t.name, ct.is_indexable AS "isIndexable",
              (SELECT count(*)::int FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
                WHERE pt.category_id = ct.category_id AND pt.tool_id = t.id AND ${PUBLISHED}) AS count
         FROM category_tools ct JOIN tools t ON t.id = ct.tool_id
        WHERE ct.category_id = $1 AND t.is_active ORDER BY ct.sort_order, t.sort_order, t.name`,
      [category.id],
    ),
    category.supportsStyles
      ? db.query<CategoryHub['styles'][number]>(
          `SELECT s.id, s.slug, s.name,
                  (SELECT count(*)::int FROM prompt_styles ps JOIN prompts p ON p.id = ps.prompt_id
                    WHERE ps.category_id = cs.category_id AND ps.style_id = s.id AND ${PUBLISHED}) AS count
             FROM category_styles cs JOIN styles s ON s.id = cs.style_id
            WHERE cs.category_id = $1 AND s.is_active ORDER BY cs.sort_order, s.sort_order, s.name`,
          [category.id],
        )
      : Promise.resolve({ rows: [] as CategoryHub['styles'] }),
  ])
  return { category, tools: tools.rows, styles: styles.rows }
}

export type ToolHub = {
  tool: { id: number; slug: string; name: string; vendor: string; seoTitle: string; seoDescription: string }
  categories: { id: number; slug: string; name: string; count: number }[]
}

export async function getToolHub(db: Queryable, slug: string): Promise<ToolHub | null> {
  const { rows } = await db.query<ToolHub['tool']>(
    `SELECT id, slug, name, vendor, seo_title AS "seoTitle", seo_description AS "seoDescription" FROM tools WHERE slug = $1 AND is_active`,
    [slug],
  )
  const tool = rows[0]
  if (!tool) return null
  const categories = await db.query<ToolHub['categories'][number]>(
    `SELECT c.id, c.slug, c.name,
            (SELECT count(*)::int FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
              WHERE pt.category_id = c.id AND pt.tool_id = $1 AND ${PUBLISHED}) AS count
       FROM category_tools ct JOIN categories c ON c.id = ct.category_id
      WHERE ct.tool_id = $1 AND c.is_active ORDER BY c.sort_order, c.name`,
    [tool.id],
  )
  return { tool, categories: categories.rows }
}

export type StyleHub = {
  style: { id: number; slug: string; name: string }
  categories: { id: number; slug: string; name: string; count: number }[]
}

export async function getStyleHub(db: Queryable, slug: string): Promise<StyleHub | null> {
  const { rows } = await db.query<StyleHub['style']>(`SELECT id, slug, name FROM styles WHERE slug = $1 AND is_active`, [slug])
  const style = rows[0]
  if (!style) return null
  const categories = await db.query<StyleHub['categories'][number]>(
    `SELECT c.id, c.slug, c.name,
            (SELECT count(*)::int FROM prompt_styles ps JOIN prompts p ON p.id = ps.prompt_id
              WHERE ps.category_id = c.id AND ps.style_id = $1 AND ${PUBLISHED}) AS count
       FROM category_styles cs JOIN categories c ON c.id = cs.category_id
      WHERE cs.style_id = $1 AND c.is_active AND c.supports_styles ORDER BY c.sort_order, c.name`,
    [style.id],
  )
  return { style, categories: categories.rows }
}

export type ComboMeta = { seoTitle: string; seoDescription: string; intro: string; isIndexable: boolean }

export async function getComboMeta(db: Queryable, categoryId: number, toolId: number): Promise<ComboMeta | null> {
  const { rows } = await db.query<ComboMeta>(
    `SELECT seo_title AS "seoTitle", seo_description AS "seoDescription", intro, is_indexable AS "isIndexable"
       FROM category_tools WHERE category_id = $1 AND tool_id = $2`,
    [categoryId, toolId],
  )
  return rows[0] ?? null
}
