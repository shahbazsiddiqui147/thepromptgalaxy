import type { Queryable } from '@/db/pool'
import { getNav } from '@/site/hubs'

export const MAX_LISTED_PROMPTS = 200

/**
 * A machine-readable overview of the site for AI crawlers and answer engines (see llmstxt.org).
 * Lists only published, active content, most-saved prompts first, capped so the file stays a
 * reasonable size; the full list is always available at /sitemap.xml.
 */
export async function getLlmsText(db: Queryable, siteUrl: string): Promise<string> {
  const [nav, categories, tools, prompts] = await Promise.all([
    getNav(db),
    db.query<{ slug: string; name: string }>('SELECT slug, name FROM categories WHERE is_active ORDER BY sort_order, name'),
    db.query<{ slug: string; name: string }>('SELECT slug, name FROM tools WHERE is_active ORDER BY sort_order, name'),
    db.query<{ slug: string; title: string; summary: string }>(
      `SELECT p.slug, p.title, p.summary FROM prompts p JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published' AND c.is_active
        ORDER BY p.save_count DESC, p.id DESC LIMIT $1`,
      [MAX_LISTED_PROMPTS],
    ),
  ])

  const lines: string[] = [
    '# ThePromptGalaxy',
    '',
    `> ${nav.totals.prompts} tested AI prompts across ${nav.totals.tools} tools and ${nav.totals.categories} categories. Every prompt shows a real example output before you copy it.`,
    '',
  ]

  if (categories.rows.length > 0) {
    lines.push('## Categories')
    for (const c of categories.rows) lines.push(`- [${c.name}](${siteUrl}/category/${c.slug}/)`)
    lines.push('')
  }
  if (tools.rows.length > 0) {
    lines.push('## Tools')
    for (const t of tools.rows) lines.push(`- [${t.name}](${siteUrl}/tool/${t.slug}/)`)
    lines.push('')
  }
  if (prompts.rows.length > 0) {
    lines.push('## Prompts')
    for (const p of prompts.rows) {
      lines.push(`- [${p.title}](${siteUrl}/prompt/${p.slug}/)${p.summary ? `: ${p.summary}` : ''}`)
    }
    lines.push('')
  }
  lines.push(`Full, up-to-date list: ${siteUrl}/sitemap.xml`)
  return lines.join('\n')
}
