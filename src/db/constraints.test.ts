import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Pool
let ids: { portrait: number; travel: number; mj: number; gpt: number; cinematic: number; promptId: number }

async function one(sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(sql, params)
  return rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
  const portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  const travel = await one(`INSERT INTO categories (slug, name) VALUES ('travel', 'Travel') RETURNING id`)
  const mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney', 'Midjourney') RETURNING id`)
  const gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt', 'ChatGPT') RETURNING id`)
  const cinematic = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)
  await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [portrait, mj])
  const promptId = await one(
    `INSERT INTO prompts (slug, title, category_id, status) VALUES ('p1', 'P1', $1, 'published') RETURNING id`,
    [portrait],
  )
  ids = { portrait, travel, mj, gpt, cinematic, promptId }
})
afterAll(closeTestPool)

const attachTool = (toolId: number, opts: { categoryId?: number; primary?: boolean } = {}) =>
  pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary) VALUES ($1, $2, $3, $4)', [
    ids.promptId,
    opts.categoryId ?? ids.portrait,
    toolId,
    opts.primary ?? false,
  ])

const attachStyle = (styleId: number) =>
  pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [
    ids.promptId,
    ids.portrait,
    styleId,
  ])

describe('prompt tools', () => {
  it('accepts a tool that is linked to the prompt category', async () => {
    await expect(attachTool(ids.mj, { primary: true })).resolves.toBeDefined()
  })

  it('rejects a tool that is not linked to the prompt category', async () => {
    await expect(attachTool(ids.gpt)).rejects.toMatchObject({ code: '23503' })
  })

  it('allows only one primary tool per prompt', async () => {
    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [ids.portrait, ids.gpt])
    await attachTool(ids.mj, { primary: true })
    await expect(attachTool(ids.gpt, { primary: true })).rejects.toMatchObject({ code: '23505' })
  })

  it('blocks removing a category-tool pair that a prompt uses', async () => {
    await attachTool(ids.mj, { primary: true })
    await expect(
      pool.query('DELETE FROM category_tools WHERE category_id = $1 AND tool_id = $2', [ids.portrait, ids.mj]),
    ).rejects.toMatchObject({ code: '23503' })
  })

  it('cascades a category change onto prompt_tools when the tool is valid for the new category', async () => {
    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [ids.travel, ids.mj])
    await attachTool(ids.mj, { primary: true })
    await pool.query('UPDATE prompts SET category_id = $1 WHERE id = $2', [ids.travel, ids.promptId])
    const { rows } = await pool.query('SELECT category_id FROM prompt_tools WHERE prompt_id = $1', [ids.promptId])
    expect(rows[0].category_id).toBe(ids.travel)
  })

  it('rejects a category change when an attached tool is not valid for the new category', async () => {
    await attachTool(ids.mj, { primary: true })
    await expect(
      pool.query('UPDATE prompts SET category_id = $1 WHERE id = $2', [ids.travel, ids.promptId]),
    ).rejects.toMatchObject({ code: '23503' })
  })
})

describe('prompt styles', () => {
  it('rejects a style that is not linked to the prompt category', async () => {
    await expect(attachStyle(ids.cinematic)).rejects.toMatchObject({ code: '23503' })
  })

  it('accepts a linked style', async () => {
    await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [ids.portrait, ids.cinematic])
    await expect(attachStyle(ids.cinematic)).resolves.toBeDefined()
  })

  it('refuses to link styles to a category that does not support styles', async () => {
    await pool.query('UPDATE categories SET supports_styles = false WHERE id = $1', [ids.travel])
    await expect(
      pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [ids.travel, ids.cinematic]),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('refuses to turn styles off while prompts in the category use them', async () => {
    await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [ids.portrait, ids.cinematic])
    await attachStyle(ids.cinematic)
    await expect(
      pool.query('UPDATE categories SET supports_styles = false WHERE id = $1', [ids.portrait]),
    ).rejects.toMatchObject({ code: '23514' })
  })
})

describe('deletion', () => {
  it('blocks deleting a category that has prompts', async () => {
    await expect(pool.query('DELETE FROM categories WHERE id = $1', [ids.portrait])).rejects.toMatchObject({
      code: '23503',
    })
  })
})
