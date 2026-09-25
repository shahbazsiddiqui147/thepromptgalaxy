import type { Queryable } from '@/db/pool'
import { isSlugTaken, slugify, uniqueSlug } from '@/lib/slug'
import { publishProblems } from '@/prompts/input'
import type { PromptInput, PromptStatus } from '@/prompts/types'
import { writeAudit } from '@/registry/audit'
import { recordSlugChange } from '@/registry/redirects'

export type PromptForEdit = PromptInput & { id: number; publishedAt: Date | null }
export type SavePromptResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> }
export type PromptListItem = {
  id: number
  title: string
  slug: string
  status: PromptStatus
  categoryName: string
  primaryToolName: string | null
  updatedAt: Date
}

const SLUG_TAKEN: SavePromptResult = { ok: false, errors: { slug: 'This slug is already in use.' } }

type PgError = { code?: string; constraint?: string; message?: string }

function mapWriteError(error: unknown): SavePromptResult | null {
  const e = error as PgError
  if (e.code === '23503') {
    const c = e.constraint ?? ''
    if (c.includes('prompt_tools')) return { ok: false, errors: { tools: 'One of the chosen tools is not available for this category.' } }
    if (c.includes('prompt_styles')) return { ok: false, errors: { styles: 'One of the chosen styles is not available for this category.' } }
    if (c.includes('similar')) return { ok: false, errors: { similar: 'A similar prompt no longer exists.' } }
    if (c.includes('media')) return { ok: false, errors: { exampleMediaId: 'An image no longer exists. Upload it again.' } }
    return { ok: false, errors: { _: 'A related record no longer exists. Reload the page and try again.' } }
  }
  if (e.code === '23514') return { ok: false, errors: { styles: e.message ?? 'This category does not support styles.' } }
  if (e.code === '23505' && (e.constraint ?? '').includes('slug')) return SLUG_TAKEN
  return null
}

/**
 * Creates (id = null) or updates a prompt and replaces its child rows. Call it inside a transaction:
 * on a returned error the caller's transaction must not be committed with partial work; because a failed
 * statement aborts the transaction, COMMIT then behaves as a rollback and nothing is stored.
 */
export async function savePrompt(
  db: Queryable,
  id: number | null,
  input: PromptInput,
  actorId: number | null,
): Promise<SavePromptResult> {
  if (input.status === 'published') {
    const problems = publishProblems(input)
    if (problems.length > 0) return { ok: false, errors: { _: `Cannot publish yet: ${problems.join(' ')}` } }
  }

  let existing: { slug: string; publishedAt: Date | null } | null = null
  if (id !== null) {
    const { rows } = await db.query<{ slug: string; publishedAt: Date | null }>(
      'SELECT slug, published_at AS "publishedAt" FROM prompts WHERE id = $1 FOR UPDATE',
      [id],
    )
    existing = rows[0] ?? null
    if (!existing) return { ok: false, errors: { _: 'Prompt not found.' } }
  }

  const locked = existing?.publishedAt != null
  let slug: string
  if (!existing) {
    if (input.slug) {
      if (await isSlugTaken(db, 'prompts', input.slug)) return SLUG_TAKEN
      slug = input.slug
    } else {
      slug = await uniqueSlug(db, 'prompts', slugify(input.title))
    }
  } else if (!locked) {
    slug = input.slug || existing.slug
    if (slug !== existing.slug && (await isSlugTaken(db, 'prompts', slug, id))) return SLUG_TAKEN
  } else if (input.changePublishedSlug && input.slug && input.slug !== existing.slug) {
    if (await isSlugTaken(db, 'prompts', input.slug, id)) return SLUG_TAKEN
    slug = input.slug
  } else {
    slug = existing.slug
  }

  const row = [
    slug,
    input.title,
    input.summary,
    input.categoryId,
    input.promptText,
    input.isChain,
    input.isPremium,
    input.referenceRequired,
    input.referenceNote,
    input.exampleMediaId,
    input.quickAnswer,
    input.articleHtml,
    input.seoTitle,
    input.seoDescription,
    input.status,
  ]

  try {
    let promptId: number
    if (existing && id !== null) {
      // Tool and style rows carry the category id, so they go first; the new ones are inserted after the update.
      await db.query('DELETE FROM prompt_tools WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM prompt_styles WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM prompt_steps WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM prompt_faqs WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM similar_prompts WHERE prompt_id = $1', [id])
      await db.query(
        `UPDATE prompts SET slug = $1, title = $2, summary = $3, category_id = $4, prompt_text = $5, is_chain = $6,
                is_premium = $7, reference_required = $8, reference_note = $9, example_media_id = $10,
                quick_answer = $11, article_html = $12, seo_title = $13, seo_description = $14, status = $15,
                published_at = CASE WHEN $15 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
                updated_at = now()
          WHERE id = $16`,
        [...row, id],
      )
      promptId = id
      if (locked && slug !== existing.slug) {
        await recordSlugChange(db, `/prompt/${existing.slug}/`, `/prompt/${slug}/`)
      }
    } else {
      const { rows } = await db.query<{ id: number }>(
        `INSERT INTO prompts (slug, title, summary, category_id, prompt_text, is_chain, is_premium, reference_required,
                reference_note, example_media_id, quick_answer, article_html, seo_title, seo_description, status,
                author_id, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                 CASE WHEN $15 = 'published' THEN now() ELSE NULL END)
         RETURNING id`,
        [...row, actorId],
      )
      promptId = rows[0].id
    }

    for (const tool of input.tools) {
      await db.query(
        'INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary, fit) VALUES ($1, $2, $3, $4, $5)',
        [promptId, input.categoryId, tool.toolId, tool.isPrimary, tool.fit],
      )
    }
    for (const styleId of input.styleIds) {
      await db.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [
        promptId,
        input.categoryId,
        styleId,
      ])
    }
    for (const [position, step] of input.steps.entries()) {
      await db.query(
        'INSERT INTO prompt_steps (prompt_id, position, label, text, example_media_id) VALUES ($1, $2, $3, $4, $5)',
        [promptId, position, step.label, step.text, step.exampleMediaId],
      )
    }
    for (const [position, faq] of input.faqs.entries()) {
      await db.query('INSERT INTO prompt_faqs (prompt_id, position, question, answer) VALUES ($1, $2, $3, $4)', [
        promptId,
        position,
        faq.question,
        faq.answer,
      ])
    }
    for (const [position, similarId] of input.similarIds.filter((s) => s !== promptId).entries()) {
      await db.query('INSERT INTO similar_prompts (prompt_id, similar_id, position) VALUES ($1, $2, $3)', [
        promptId,
        similarId,
        position,
      ])
    }

    await writeAudit(db, {
      userId: actorId,
      entity: 'prompts',
      entityId: promptId,
      action: existing ? 'update' : 'create',
      diff: { title: input.title, status: input.status, slug },
    })
    return { ok: true, id: promptId }
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

export async function getPromptForEdit(db: Queryable, id: number): Promise<PromptForEdit | null> {
  const { rows } = await db.query<PromptForEdit>(
    `SELECT id, slug, title, summary, category_id AS "categoryId", prompt_text AS "promptText", is_chain AS "isChain",
            is_premium AS "isPremium", reference_required AS "referenceRequired", reference_note AS "referenceNote",
            example_media_id AS "exampleMediaId", quick_answer AS "quickAnswer", article_html AS "articleHtml",
            seo_title AS "seoTitle", seo_description AS "seoDescription", status, published_at AS "publishedAt"
       FROM prompts WHERE id = $1`,
    [id],
  )
  const base = rows[0]
  if (!base) return null

  const [tools, styles, steps, faqs, similar] = await Promise.all([
    db.query<{ toolId: number; fit: 'great' | 'good'; isPrimary: boolean }>(
      `SELECT tool_id AS "toolId", fit, is_primary AS "isPrimary" FROM prompt_tools
        WHERE prompt_id = $1 ORDER BY is_primary DESC, tool_id`,
      [id],
    ),
    db.query<{ styleId: number }>('SELECT style_id AS "styleId" FROM prompt_styles WHERE prompt_id = $1 ORDER BY style_id', [id]),
    db.query<{ label: string; text: string; exampleMediaId: number | null }>(
      `SELECT label, text, example_media_id AS "exampleMediaId" FROM prompt_steps WHERE prompt_id = $1 ORDER BY position`,
      [id],
    ),
    db.query<{ question: string; answer: string }>(
      'SELECT question, answer FROM prompt_faqs WHERE prompt_id = $1 ORDER BY position',
      [id],
    ),
    db.query<{ similarId: number }>(
      'SELECT similar_id AS "similarId" FROM similar_prompts WHERE prompt_id = $1 ORDER BY position',
      [id],
    ),
  ])

  return {
    ...base,
    tools: tools.rows,
    styleIds: styles.rows.map((r) => r.styleId),
    steps: steps.rows,
    faqs: faqs.rows,
    similarIds: similar.rows.map((r) => r.similarId),
    changePublishedSlug: false,
  }
}

export async function listPrompts(
  db: Queryable,
  filters: { status?: string; categoryId?: number; q?: string; limit: number; offset: number },
): Promise<{ rows: PromptListItem[]; total: number }> {
  const escaped = filters.q ? filters.q.replace(/[\\%_]/g, '\\$&') : null
  const where = `WHERE ($1::text IS NULL OR p.status = $1)
                   AND ($2::bigint IS NULL OR p.category_id = $2)
                   AND ($3::text IS NULL OR p.title ILIKE '%' || $3 || '%')`
  const params = [filters.status ?? null, filters.categoryId ?? null, escaped]
  const [list, count] = await Promise.all([
    db.query<PromptListItem>(
      `SELECT p.id, p.title, p.slug, p.status, c.name AS "categoryName", t.name AS "primaryToolName",
              p.updated_at AS "updatedAt"
         FROM prompts p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN prompt_tools pt ON pt.prompt_id = p.id AND pt.is_primary
         LEFT JOIN tools t ON t.id = pt.tool_id
         ${where}
        ORDER BY p.updated_at DESC, p.id DESC LIMIT $4 OFFSET $5`,
      [...params, filters.limit, filters.offset],
    ),
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM prompts p ${where}`, params),
  ])
  return { rows: list.rows, total: count.rows[0].n }
}

export async function deletePrompt(
  db: Queryable,
  id: number,
  actorId: number | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { rows } = await db.query<{ status: PromptStatus }>('SELECT status FROM prompts WHERE id = $1', [id])
  if (!rows[0]) return { ok: false, reason: 'Prompt not found.' }
  if (rows[0].status !== 'draft' && rows[0].status !== 'archived') {
    return { ok: false, reason: 'Archive the prompt before deleting it.' }
  }
  await db.query('DELETE FROM prompts WHERE id = $1', [id])
  await writeAudit(db, { userId: actorId, entity: 'prompts', entityId: id, action: 'delete' })
  return { ok: true }
}

export async function similarCandidates(db: Queryable, excludeId: number | null): Promise<{ id: number; title: string }[]> {
  const { rows } = await db.query<{ id: number; title: string }>(
    `SELECT id, title FROM prompts WHERE status = 'published' AND ($1::bigint IS NULL OR id <> $1) ORDER BY title LIMIT 500`,
    [excludeId],
  )
  return rows
}
