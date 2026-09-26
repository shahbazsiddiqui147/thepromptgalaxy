import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanQuery, searchPrompts } from '@/site/search'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
  const portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait','Portrait') RETURNING id`)
  const hidden = await one(`INSERT INTO categories (slug, name, is_active) VALUES ('hidden','Hidden', false) RETURNING id`)
  const mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney','Midjourney') RETURNING id`)
  await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1,$2), ($3,$2)', [portrait, mj, hidden])
  const add = async (slug: string, title: string, summary: string, cat: number, status = 'published', text = '') => {
    const id = await one(
      `INSERT INTO prompts (slug, title, summary, prompt_text, category_id, status, published_at) VALUES ($1,$2,$3,$4,$5,$6,now()) RETURNING id`,
      [slug, title, summary, text, cat, status],
    )
    await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary) VALUES ($1,$2,$3,true)', [id, cat, mj])
  }
  await add('golden', 'Golden hour overlook', 'Warm sunset light over a valley', portrait)
  await add('studio', 'Studio headshot', 'Clean three point lighting', portrait, 'published', 'SECRETWORD')
  await add('draft', 'Golden draft', 'unpublished golden', portrait, 'draft')
  await add('ghost', 'Golden ghost', 'inactive category golden', hidden)
})
afterAll(closeTestPool)

const slugs = async (q: string) => (await searchPrompts(pool, q, { limit: 24, offset: 0 })).cards.map((c) => c.slug)

describe('cleanQuery', () => {
  it('collapses whitespace and limits the length', () => {
    expect(cleanQuery('  a   b  ')).toBe('a b')
    expect(cleanQuery(undefined)).toBe('')
    expect(cleanQuery('x'.repeat(300))).toHaveLength(100)
  })
})

describe('searchPrompts', () => {
  it('finds published prompts by words in the title or summary, with stemming', async () => {
    expect(await slugs('golden')).toEqual(['golden'])
    expect(await slugs('sunsets')).toEqual(['golden'])
    expect(await slugs('lighting')).toEqual(['studio', 'golden'])
    expect(await slugs('three point')).toEqual(['studio'])
  })
  it('finds by partial title, category name and tool name', async () => {
    expect(await slugs('headsh')).toEqual(['studio'])
    expect((await slugs('portrait')).sort()).toEqual(['golden', 'studio'])
    expect((await slugs('mid')).sort()).toEqual(['golden', 'studio'])
  })
  it('never matches drafts, inactive categories or the prompt text', async () => {
    expect(await slugs('unpublished')).toEqual([])
    expect(await slugs('SECRETWORD')).toEqual([])
  })
  it('returns nothing for an empty query and handles special characters', async () => {
    expect(await searchPrompts(pool, '   ', { limit: 24, offset: 0 })).toEqual({ cards: [], total: 0 })
    expect(await slugs('100% "unclosed')).toEqual([])
    expect(await slugs('a_b')).toEqual([])
  })
  it('reports the total and paginates', async () => {
    const all = await searchPrompts(pool, 'portrait', { limit: 1, offset: 0 })
    expect(all.total).toBe(2)
    expect(all.cards).toHaveLength(1)
  })
})
