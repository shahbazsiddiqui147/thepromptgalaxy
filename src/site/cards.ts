import type { Queryable } from '@/db/pool'
import type { Card, CardFilters } from '@/site/types'

/** Columns and joins shared by every query that produces a Card (aliases: p, c, u, t). */
export const CARD_SELECT = `
  p.id, p.slug, p.title, c.name AS "categoryName", c.slug AS "categorySlug", u.handle AS "authorHandle",
  p.save_count AS "saveCount", p.is_premium AS "isPremium", p.is_chain AS "isChain",
  (SELECT count(*)::int FROM prompt_steps st WHERE st.prompt_id = p.id) AS "stepCount",
  p.example_media_id AS "exampleMediaId", t.name AS "primaryToolName"`

export const CARD_JOINS = `
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN users u ON u.id = p.author_id
  LEFT JOIN prompt_tools pt ON pt.prompt_id = p.id AND pt.is_primary
  LEFT JOIN tools t ON t.id = pt.tool_id`

export async function listCards(db: Queryable, f: CardFilters): Promise<{ cards: Card[]; total: number }> {
  const params = [f.categoryId ?? null, f.toolId ?? null, f.styleId ?? null, f.greatFitOnly === true, f.price ?? null]
  const where = `
    WHERE p.status = 'published' AND c.is_active
      AND ($1::bigint IS NULL OR p.category_id = $1)
      AND ($2::bigint IS NULL OR EXISTS (
            SELECT 1 FROM prompt_tools x WHERE x.prompt_id = p.id AND x.tool_id = $2 AND (NOT $4::boolean OR x.fit = 'great')))
      AND ($3::bigint IS NULL OR EXISTS (SELECT 1 FROM prompt_styles s WHERE s.prompt_id = p.id AND s.style_id = $3))
      AND ($5::text IS NULL OR ($5 = 'premium' AND p.is_premium) OR ($5 = 'free' AND NOT p.is_premium))`
  const order = f.sort === 'newest' ? 'p.published_at DESC, p.id DESC' : 'p.save_count DESC, p.published_at DESC, p.id DESC'
  const [list, count] = await Promise.all([
    db.query<Card>(
      `SELECT ${CARD_SELECT} FROM prompts p ${CARD_JOINS} ${where} ORDER BY ${order} LIMIT $6 OFFSET $7`,
      [...params, f.limit, f.offset],
    ),
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM prompts p JOIN categories c ON c.id = p.category_id ${where}`, params),
  ])
  return { cards: list.rows, total: count.rows[0].n }
}
