import type { Queryable } from '@/db/pool'
import { CARD_JOINS, CARD_SELECT } from '@/site/cards'
import type { Card } from '@/site/types'

export const MAX_QUERY_LENGTH = 100

export function cleanQuery(raw: string | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)
}

/**
 * Searches published prompts: full-text match on title, summary and quick answer, plus a plain
 * substring match on the title, the category name and the tool names (so "mid" finds Midjourney).
 */
export async function searchPrompts(
  db: Queryable,
  rawQuery: string,
  page: { limit: number; offset: number },
): Promise<{ cards: Card[]; total: number }> {
  const q = cleanQuery(rawQuery)
  if (q === '') return { cards: [], total: 0 }
  const like = q.replace(/[\\%_]/g, '\\$&')
  const where = `
    WHERE p.status = 'published' AND c.is_active AND (
      p.search_vector @@ websearch_to_tsquery('english', $1)
      OR p.title ILIKE '%' || $2 || '%'
      OR c.name ILIKE '%' || $2 || '%'
      OR EXISTS (SELECT 1 FROM prompt_tools x JOIN tools tt ON tt.id = x.tool_id
                  WHERE x.prompt_id = p.id AND tt.is_active AND tt.name ILIKE '%' || $2 || '%'))`
  const [list, count] = await Promise.all([
    db.query<Card>(
      `SELECT ${CARD_SELECT} FROM prompts p ${CARD_JOINS} ${where}
        ORDER BY ts_rank(p.search_vector, websearch_to_tsquery('english', $1)) DESC, p.save_count DESC, p.id DESC
        LIMIT $3 OFFSET $4`,
      [q, like, page.limit, page.offset],
    ),
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM prompts p JOIN categories c ON c.id = p.category_id ${where}`, [q, like]),
  ])
  return { cards: list.rows, total: count.rows[0].n }
}
