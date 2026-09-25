import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Pool
let categoryId: number
let promptId: number

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

async function makeMedia(dir: string): Promise<number> {
  return one(
    `INSERT INTO media (original_name, dir, mime, ext, size_bytes, width, height)
     VALUES ('a.png', $1, 'image/png', 'png', 100, 10, 10) RETURNING id`,
    [dir],
  )
}

beforeEach(async () => {
  pool = await resetDb()
  categoryId = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  promptId = await one(`INSERT INTO prompts (slug, title, category_id) VALUES ('p1', 'P1', $1) RETURNING id`, [categoryId])
})
afterAll(closeTestPool)

describe('media', () => {
  it('sets prompts.example_media_id to null when the media row is deleted', async () => {
    const mediaId = await makeMedia('2026-09/aaa')
    await pool.query('UPDATE prompts SET example_media_id = $1 WHERE id = $2', [mediaId, promptId])
    await pool.query('DELETE FROM media WHERE id = $1', [mediaId])
    const { rows } = await pool.query('SELECT example_media_id FROM prompts WHERE id = $1', [promptId])
    expect(rows[0].example_media_id).toBeNull()
  })

  it('requires a unique directory per media row', async () => {
    await makeMedia('2026-09/same')
    await expect(makeMedia('2026-09/same')).rejects.toMatchObject({ code: '23505' })
  })
})

describe('prompt steps, faqs and similar prompts', () => {
  it('keeps one step per position and cascades when the prompt is deleted', async () => {
    await pool.query(`INSERT INTO prompt_steps (prompt_id, position, label, text) VALUES ($1, 0, 'Base', 'text')`, [promptId])
    await expect(
      pool.query(`INSERT INTO prompt_steps (prompt_id, position, label, text) VALUES ($1, 0, 'Dup', 'text')`, [promptId]),
    ).rejects.toMatchObject({ code: '23505' })
    await pool.query('DELETE FROM prompts WHERE id = $1', [promptId])
    const { rows } = await pool.query('SELECT 1 FROM prompt_steps')
    expect(rows).toHaveLength(0)
  })

  it('stores faqs in order', async () => {
    await pool.query(`INSERT INTO prompt_faqs (prompt_id, position, question, answer) VALUES ($1, 1, 'Q2', 'A2'), ($1, 0, 'Q1', 'A1')`, [promptId])
    const { rows } = await pool.query('SELECT question FROM prompt_faqs WHERE prompt_id = $1 ORDER BY position', [promptId])
    expect(rows.map((r) => r.question)).toEqual(['Q1', 'Q2'])
  })

  it('rejects a prompt that lists itself as similar', async () => {
    await expect(
      pool.query('INSERT INTO similar_prompts (prompt_id, similar_id) VALUES ($1, $1)', [promptId]),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('links two prompts and removes the link when either is deleted', async () => {
    const other = await one(`INSERT INTO prompts (slug, title, category_id) VALUES ('p2', 'P2', $1) RETURNING id`, [categoryId])
    await pool.query('INSERT INTO similar_prompts (prompt_id, similar_id, position) VALUES ($1, $2, 0)', [promptId, other])
    await pool.query('DELETE FROM prompts WHERE id = $1', [other])
    const { rows } = await pool.query('SELECT 1 FROM similar_prompts')
    expect(rows).toHaveLength(0)
  })
})
