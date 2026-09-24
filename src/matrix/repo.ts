import type { Queryable } from '@/db/pool'
import { writeAudit } from '@/registry/audit'

export type MatrixCategory = { id: number; name: string; isActive: boolean; supportsStyles: boolean }
export type MatrixTool = { id: number; name: string; isActive: boolean }
export type MatrixStyle = { id: number; name: string; isActive: boolean }

export type ToolLink = {
  categoryId: number
  toolId: number
  sortOrder: number
  isFeatured: boolean
  isIndexable: boolean
  seoTitle: string
  seoDescription: string
  intro: string
  publishedCount: number
  usageCount: number
}

export type StyleLink = {
  categoryId: number
  styleId: number
  sortOrder: number
  publishedCount: number
  usageCount: number
}

export type ComboPatch = {
  sortOrder: number
  isFeatured: boolean
  isIndexable: boolean
  seoTitle: string
  seoDescription: string
  intro: string
}

export type ToggleResult = { ok: true } | { ok: false; reason: string }

const TOOL_LINK_SELECT = `
  SELECT ct.category_id AS "categoryId", ct.tool_id AS "toolId", ct.sort_order AS "sortOrder",
         ct.is_featured AS "isFeatured", ct.is_indexable AS "isIndexable",
         ct.seo_title AS "seoTitle", ct.seo_description AS "seoDescription", ct.intro,
         (SELECT count(*)::int FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
           WHERE pt.category_id = ct.category_id AND pt.tool_id = ct.tool_id AND p.status = 'published') AS "publishedCount",
         (SELECT count(*)::int FROM prompt_tools pt
           WHERE pt.category_id = ct.category_id AND pt.tool_id = ct.tool_id) AS "usageCount"
    FROM category_tools ct`

export async function getToolMatrix(
  db: Queryable,
): Promise<{ categories: MatrixCategory[]; tools: MatrixTool[]; links: ToolLink[] }> {
  const [categories, tools, links] = await Promise.all([
    db.query<MatrixCategory>(
      `SELECT id, name, is_active AS "isActive", supports_styles AS "supportsStyles"
         FROM categories ORDER BY sort_order, name`,
    ),
    db.query<MatrixTool>(`SELECT id, name, is_active AS "isActive" FROM tools ORDER BY sort_order, name`),
    db.query<ToolLink>(`${TOOL_LINK_SELECT} ORDER BY ct.category_id, ct.sort_order, ct.tool_id`),
  ])
  return { categories: categories.rows, tools: tools.rows, links: links.rows }
}

export async function getToolLink(
  db: Queryable,
  categoryId: number,
  toolId: number,
): Promise<(ToolLink & { categoryName: string; toolName: string }) | null> {
  const { rows } = await db.query<ToolLink & { categoryName: string; toolName: string }>(
    `SELECT link.*, c.name AS "categoryName", t.name AS "toolName"
       FROM (${TOOL_LINK_SELECT}) link
       JOIN categories c ON c.id = link."categoryId"
       JOIN tools t ON t.id = link."toolId"
      WHERE link."categoryId" = $1 AND link."toolId" = $2`,
    [categoryId, toolId],
  )
  return rows[0] ?? null
}

function pgCode(error: unknown): string | undefined {
  return (error as { code?: string }).code
}

export async function setToolLink(
  db: Queryable,
  categoryId: number,
  toolId: number,
  enabled: boolean,
  actorId: number | null,
): Promise<ToggleResult> {
  if (enabled) {
    try {
      await db.query(
        `INSERT INTO category_tools (category_id, tool_id, sort_order)
         VALUES ($1, $2, COALESCE((SELECT max(sort_order) + 1 FROM category_tools WHERE category_id = $1), 0))
         ON CONFLICT DO NOTHING`,
        [categoryId, toolId],
      )
    } catch (error) {
      if (pgCode(error) === '23503') return { ok: false, reason: 'Unknown category or tool.' }
      throw error
    }
  } else {
    const usage = await db.query<{ title: string }>(
      `SELECT p.title FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
        WHERE pt.category_id = $1 AND pt.tool_id = $2 ORDER BY p.title`,
      [categoryId, toolId],
    )
    if (usage.rows.length > 0) {
      const examples = usage.rows.slice(0, 5).map((r) => r.title).join(', ')
      return {
        ok: false,
        reason: `${usage.rows.length} prompt(s) use this pair (for example: ${examples}). Remove the tool from those prompts first, or deactivate the category or tool instead.`,
      }
    }
    await db.query('DELETE FROM category_tools WHERE category_id = $1 AND tool_id = $2', [categoryId, toolId])
  }
  await writeAudit(db, {
    userId: actorId,
    entity: 'category_tools',
    entityId: `${categoryId}:${toolId}`,
    action: enabled ? 'link' : 'unlink',
  })
  return { ok: true }
}

export async function updateCombo(
  db: Queryable,
  categoryId: number,
  toolId: number,
  patch: ComboPatch,
  actorId: number | null,
): Promise<ToggleResult> {
  const result = await db.query(
    `UPDATE category_tools
        SET sort_order = $3, is_featured = $4, is_indexable = $5,
            seo_title = $6, seo_description = $7, intro = $8, updated_at = now()
      WHERE category_id = $1 AND tool_id = $2`,
    [categoryId, toolId, patch.sortOrder, patch.isFeatured, patch.isIndexable, patch.seoTitle, patch.seoDescription, patch.intro],
  )
  if (result.rowCount === 0) return { ok: false, reason: 'That category and tool are not linked.' }
  await writeAudit(db, {
    userId: actorId,
    entity: 'category_tools',
    entityId: `${categoryId}:${toolId}`,
    action: 'update',
    diff: patch,
  })
  return { ok: true }
}

export async function getStyleMatrix(
  db: Queryable,
): Promise<{ categories: MatrixCategory[]; styles: MatrixStyle[]; links: StyleLink[] }> {
  const [categories, styles, links] = await Promise.all([
    db.query<MatrixCategory>(
      `SELECT id, name, is_active AS "isActive", supports_styles AS "supportsStyles"
         FROM categories ORDER BY sort_order, name`,
    ),
    db.query<MatrixStyle>(`SELECT id, name, is_active AS "isActive" FROM styles ORDER BY sort_order, name`),
    db.query<StyleLink>(
      `SELECT cs.category_id AS "categoryId", cs.style_id AS "styleId", cs.sort_order AS "sortOrder",
              (SELECT count(*)::int FROM prompt_styles ps JOIN prompts p ON p.id = ps.prompt_id
                WHERE ps.category_id = cs.category_id AND ps.style_id = cs.style_id AND p.status = 'published') AS "publishedCount",
              (SELECT count(*)::int FROM prompt_styles ps
                WHERE ps.category_id = cs.category_id AND ps.style_id = cs.style_id) AS "usageCount"
         FROM category_styles cs ORDER BY cs.category_id, cs.sort_order, cs.style_id`,
    ),
  ])
  return { categories: categories.rows, styles: styles.rows, links: links.rows }
}

export async function setStyleLink(
  db: Queryable,
  categoryId: number,
  styleId: number,
  enabled: boolean,
  actorId: number | null,
): Promise<ToggleResult> {
  if (enabled) {
    try {
      await db.query(
        `INSERT INTO category_styles (category_id, style_id, sort_order)
         VALUES ($1, $2, COALESCE((SELECT max(sort_order) + 1 FROM category_styles WHERE category_id = $1), 0))
         ON CONFLICT DO NOTHING`,
        [categoryId, styleId],
      )
    } catch (error) {
      if (pgCode(error) === '23514') {
        return { ok: false, reason: 'This category does not support styles. Turn on "Supports art styles" for it first.' }
      }
      if (pgCode(error) === '23503') return { ok: false, reason: 'Unknown category or style.' }
      throw error
    }
  } else {
    const usage = await db.query<{ title: string }>(
      `SELECT p.title FROM prompt_styles ps JOIN prompts p ON p.id = ps.prompt_id
        WHERE ps.category_id = $1 AND ps.style_id = $2 ORDER BY p.title`,
      [categoryId, styleId],
    )
    if (usage.rows.length > 0) {
      const examples = usage.rows.slice(0, 5).map((r) => r.title).join(', ')
      return {
        ok: false,
        reason: `${usage.rows.length} prompt(s) use this style in this category (for example: ${examples}). Remove the style from those prompts first.`,
      }
    }
    await db.query('DELETE FROM category_styles WHERE category_id = $1 AND style_id = $2', [categoryId, styleId])
  }
  await writeAudit(db, {
    userId: actorId,
    entity: 'category_styles',
    entityId: `${categoryId}:${styleId}`,
    action: enabled ? 'link' : 'unlink',
  })
  return { ok: true }
}
