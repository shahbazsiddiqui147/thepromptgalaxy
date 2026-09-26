import type { Queryable } from '@/db/pool'
import { CARD_JOINS, CARD_SELECT } from '@/site/cards'
import type { Card } from '@/site/types'

export type PublicPrompt = {
  id: number
  slug: string
  title: string
  summary: string
  category: { id: number; name: string; slug: string }
  author: string | null
  saveCount: number
  publishedAt: Date
  updatedAt: Date
  isPremium: boolean
  isChain: boolean
  /** null for premium prompts: the text is never sent to the browser. */
  promptText: string | null
  steps: { label: string; text: string | null; exampleMediaId: number | null }[]
  referenceRequired: boolean
  referenceNote: string
  exampleMediaId: number | null
  quickAnswer: string
  articleHtml: string
  tools: { id: number; name: string; slug: string; fit: 'great' | 'good'; isPrimary: boolean }[]
  styles: { id: number; name: string; slug: string }[]
  faqs: { question: string; answer: string }[]
  similar: Card[]
  seoTitle: string
  seoDescription: string
}

type Base = Omit<PublicPrompt, 'category' | 'promptText' | 'steps' | 'tools' | 'styles' | 'faqs' | 'similar'> & {
  categoryId: number
  categoryName: string
  categorySlug: string
  rawText: string
}

export async function getPublicPrompt(db: Queryable, slug: string): Promise<PublicPrompt | null> {
  const { rows } = await db.query<Base>(
    `SELECT p.id, p.slug, p.title, p.summary, p.category_id AS "categoryId", c.name AS "categoryName", c.slug AS "categorySlug",
            u.handle AS author, p.save_count AS "saveCount", p.published_at AS "publishedAt", p.updated_at AS "updatedAt",
            p.is_premium AS "isPremium", p.is_chain AS "isChain", p.prompt_text AS "rawText",
            p.reference_required AS "referenceRequired", p.reference_note AS "referenceNote",
            p.example_media_id AS "exampleMediaId", p.quick_answer AS "quickAnswer", p.article_html AS "articleHtml",
            p.seo_title AS "seoTitle", p.seo_description AS "seoDescription"
       FROM prompts p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN users u ON u.id = p.author_id
      WHERE p.slug = $1 AND p.status = 'published' AND c.is_active`,
    [slug],
  )
  const base = rows[0]
  if (!base) return null

  const [tools, styles, steps, faqs, similar] = await Promise.all([
    db.query<PublicPrompt['tools'][number]>(
      `SELECT t.id, t.name, t.slug, pt.fit, pt.is_primary AS "isPrimary"
         FROM prompt_tools pt JOIN tools t ON t.id = pt.tool_id
        WHERE pt.prompt_id = $1 AND t.is_active ORDER BY pt.is_primary DESC, t.sort_order, t.name`,
      [base.id],
    ),
    db.query<PublicPrompt['styles'][number]>(
      `SELECT s.id, s.name, s.slug FROM prompt_styles ps JOIN styles s ON s.id = ps.style_id
        WHERE ps.prompt_id = $1 AND s.is_active ORDER BY s.sort_order, s.name`,
      [base.id],
    ),
    db.query<{ label: string; text: string; exampleMediaId: number | null }>(
      `SELECT label, text, example_media_id AS "exampleMediaId" FROM prompt_steps WHERE prompt_id = $1 ORDER BY position`,
      [base.id],
    ),
    db.query<PublicPrompt['faqs'][number]>('SELECT question, answer FROM prompt_faqs WHERE prompt_id = $1 ORDER BY position', [base.id]),
    db.query<Card>(
      `SELECT ${CARD_SELECT} FROM similar_prompts sp
         JOIN prompts p ON p.id = sp.similar_id ${CARD_JOINS}
        WHERE sp.prompt_id = $1 AND p.status = 'published' AND c.is_active
        ORDER BY sp.position`,
      [base.id],
    ),
  ])

  const { categoryId, categoryName, categorySlug, rawText, ...rest } = base
  return {
    ...rest,
    category: { id: categoryId, name: categoryName, slug: categorySlug },
    promptText: base.isPremium ? null : rawText,
    steps: steps.rows.map((s) => ({ label: s.label, text: base.isPremium ? null : s.text, exampleMediaId: s.exampleMediaId })),
    tools: tools.rows,
    styles: styles.rows,
    faqs: faqs.rows,
    similar: similar.rows,
  }
}
