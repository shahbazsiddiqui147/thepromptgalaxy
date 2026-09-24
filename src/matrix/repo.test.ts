import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  getStyleMatrix,
  getToolLink,
  getToolMatrix,
  setStyleLink,
  setToolLink,
  updateCombo,
} from '@/matrix/repo'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
let portrait: number
let travel: number
let mj: number
let gpt: number
let cinematic: number

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
  portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  travel = await one(`INSERT INTO categories (slug, name, supports_styles) VALUES ('travel', 'Travel', false) RETURNING id`)
  mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney', 'Midjourney') RETURNING id`)
  gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt', 'ChatGPT') RETURNING id`)
  cinematic = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)
})
afterAll(closeTestPool)

async function addPrompt(status: string, slug: string, toolId: number | null, styleId: number | null = null) {
  const id = await one(`INSERT INTO prompts (slug, title, category_id, status) VALUES ($1, $1, $2, $3) RETURNING id`, [slug, portrait, status])
  if (toolId) await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id) VALUES ($1, $2, $3)', [id, portrait, toolId])
  if (styleId) await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [id, portrait, styleId])
  return id
}

describe('tool links', () => {
  it('enables a pair with the next sort order and is idempotent', async () => {
    expect(await setToolLink(pool, portrait, mj, true, null)).toEqual({ ok: true })
    expect(await setToolLink(pool, portrait, gpt, true, null)).toEqual({ ok: true })
    expect(await setToolLink(pool, portrait, gpt, true, null)).toEqual({ ok: true })
    const matrix = await getToolMatrix(pool)
    const orders = matrix.links.filter((l) => l.categoryId === portrait).map((l) => l.sortOrder).sort()
    expect(orders).toEqual([0, 1])
  })

  it('removes an unused pair', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    expect(await setToolLink(pool, portrait, mj, false, null)).toEqual({ ok: true })
    expect((await getToolMatrix(pool)).links).toHaveLength(0)
  })

  it('blocks removing a pair that prompts use and names the cause', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    await addPrompt('published', 'studio-headshot', mj)
    const result = await setToolLink(pool, portrait, mj, false, null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/1 prompt\(s\) use this pair/)
      expect(result.reason).toMatch(/studio-headshot/)
    }
    expect((await getToolMatrix(pool)).links).toHaveLength(1)
  })

  it('reports unknown ids instead of throwing', async () => {
    expect(await setToolLink(pool, 99999, mj, true, null)).toEqual({ ok: false, reason: 'Unknown category or tool.' })
  })

  it('counts only published prompts as publishedCount but all prompts as usageCount', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    await addPrompt('published', 'a', mj)
    await addPrompt('draft', 'b', mj)
    const link = (await getToolMatrix(pool)).links[0]
    expect(link).toMatchObject({ publishedCount: 1, usageCount: 2 })
  })

  it('updates combo settings and reads one link with names', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    const result = await updateCombo(
      pool,
      portrait,
      mj,
      { sortOrder: 5, isFeatured: true, isIndexable: true, seoTitle: 'Portrait prompts for Midjourney', seoDescription: 'desc', intro: 'intro' },
      null,
    )
    expect(result).toEqual({ ok: true })
    expect(await getToolLink(pool, portrait, mj)).toMatchObject({
      categoryName: 'Portrait',
      toolName: 'Midjourney',
      sortOrder: 5,
      isFeatured: true,
      isIndexable: true,
      seoTitle: 'Portrait prompts for Midjourney',
    })
  })

  it('reports a combo update for a pair that does not exist', async () => {
    const result = await updateCombo(pool, portrait, mj, { sortOrder: 0, isFeatured: false, isIndexable: false, seoTitle: '', seoDescription: '', intro: '' }, null)
    expect(result).toEqual({ ok: false, reason: 'That category and tool are not linked.' })
  })

  it('writes an audit entry for matrix changes', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    const { rows } = await pool.query('SELECT entity, action FROM audit_log')
    expect(rows).toEqual([{ entity: 'category_tools', action: 'link' }])
  })
})

describe('style links', () => {
  it('refuses to link styles to a category that does not support them', async () => {
    expect(await setStyleLink(pool, travel, cinematic, true, null)).toEqual({
      ok: false,
      reason: 'This category does not support styles. Turn on "Supports art styles" for it first.',
    })
  })

  it('links a style and blocks removing it while prompts use it', async () => {
    expect(await setStyleLink(pool, portrait, cinematic, true, null)).toEqual({ ok: true })
    await setToolLink(pool, portrait, mj, true, null)
    await addPrompt('published', 'p1', mj, cinematic)
    const blocked = await setStyleLink(pool, portrait, cinematic, false, null)
    expect(blocked.ok).toBe(false)
    const matrix = await getStyleMatrix(pool)
    expect(matrix.links[0]).toMatchObject({ categoryId: portrait, styleId: cinematic, publishedCount: 1, usageCount: 1 })
  })

  it('removes an unused style link', async () => {
    await setStyleLink(pool, portrait, cinematic, true, null)
    expect(await setStyleLink(pool, portrait, cinematic, false, null)).toEqual({ ok: true })
    expect((await getStyleMatrix(pool)).links).toHaveLength(0)
  })
})
