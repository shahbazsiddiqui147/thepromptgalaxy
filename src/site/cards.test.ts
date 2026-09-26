import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { listCards } from '@/site/cards'
import { compactNumber } from '@/site/types'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
const ids: Record<string, number> = {}

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

async function prompt(
  key: string,
  o: { cat: string; status?: string; saves?: number; premium?: boolean; chain?: boolean; tools?: [string, 'great' | 'good'][]; styles?: string[]; published?: string },
) {
  const status = o.status ?? 'published'
  const id = await one(
    `INSERT INTO prompts (slug, title, category_id, status, save_count, is_premium, is_chain, published_at, author_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [key, key.toUpperCase(), ids[o.cat], status, o.saves ?? 0, o.premium ?? false, o.chain ?? false, status === 'published' ? (o.published ?? '2026-09-01') : null, ids.user],
  )
  ids[key] = id
  for (const [i, [tool, fit]] of (o.tools ?? []).entries()) {
    await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary, fit) VALUES ($1,$2,$3,$4,$5)', [id, ids[o.cat], ids[tool], i === 0, fit])
  }
  for (const s of o.styles ?? []) {
    await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1,$2,$3)', [id, ids[o.cat], ids[s]])
  }
  if (o.chain) {
    for (const p of [0, 1]) await pool.query(`INSERT INTO prompt_steps (prompt_id, position, text) VALUES ($1,$2,'t')`, [id, p])
  }
}

beforeEach(async () => {
  pool = await resetDb()
  ids.user = await one(`INSERT INTO users (email, password_hash, display_name, handle) VALUES ('a@x.com','x','A','lensfox') RETURNING id`)
  ids.portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait','Portrait') RETURNING id`)
  ids.travel = await one(`INSERT INTO categories (slug, name) VALUES ('travel','Travel') RETURNING id`)
  ids.mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney','Midjourney') RETURNING id`)
  ids.gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt','ChatGPT') RETURNING id`)
  ids.cine = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic','Cinematic') RETURNING id`)
  for (const [c, t] of [['portrait', 'mj'], ['portrait', 'gpt'], ['travel', 'gpt']]) {
    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1,$2)', [ids[c], ids[t]])
  }
  await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1,$2)', [ids.portrait, ids.cine])
  await prompt('a', { cat: 'portrait', saves: 30, tools: [['mj', 'great']], styles: ['cine'], published: '2026-09-03' })
  await prompt('b', { cat: 'portrait', saves: 50, premium: true, chain: true, tools: [['gpt', 'good'], ['mj', 'good']], published: '2026-09-01' })
  await prompt('c', { cat: 'travel', saves: 10, tools: [['gpt', 'great']], published: '2026-09-02' })
  await prompt('d', { cat: 'portrait', status: 'draft', saves: 999, tools: [['mj', 'great']] })
})
afterAll(closeTestPool)

const slugs = async (f: Partial<Parameters<typeof listCards>[1]> = {}) =>
  (await listCards(pool, { limit: 24, offset: 0, ...f })).cards.map((c) => c.slug)

describe('listCards', () => {
  it('returns only published prompts, most saved first, with the total', async () => {
    const { cards, total } = await listCards(pool, { limit: 24, offset: 0 })
    expect(cards.map((c) => c.slug)).toEqual(['b', 'a', 'c'])
    expect(total).toBe(3)
    expect(cards[0]).toMatchObject({ authorHandle: 'lensfox', isPremium: true, isChain: true, stepCount: 2, primaryToolName: 'ChatGPT', categoryName: 'Portrait' })
  })
  it('sorts by newest', async () => {
    expect(await slugs({ sort: 'newest' })).toEqual(['a', 'c', 'b'])
  })
  it('filters by category, tool and style', async () => {
    expect(await slugs({ categoryId: ids.portrait })).toEqual(['b', 'a'])
    expect(await slugs({ toolId: ids.gpt })).toEqual(['b', 'c'])
    expect(await slugs({ categoryId: ids.portrait, toolId: ids.mj })).toEqual(['b', 'a'])
    expect(await slugs({ styleId: ids.cine })).toEqual(['a'])
  })
  it('great-fit-only applies to the chosen tool', async () => {
    expect(await slugs({ toolId: ids.mj, greatFitOnly: true })).toEqual(['a'])
    expect(await slugs({ toolId: ids.gpt, greatFitOnly: true })).toEqual(['c'])
  })
  it('filters by price and paginates', async () => {
    expect(await slugs({ price: 'premium' })).toEqual(['b'])
    expect(await slugs({ price: 'free' })).toEqual(['a', 'c'])
    const page2 = await listCards(pool, { limit: 2, offset: 2 })
    expect(page2.cards.map((c) => c.slug)).toEqual(['c'])
    expect(page2.total).toBe(3)
  })
  it('hides prompts whose category is inactive', async () => {
    await pool.query('UPDATE categories SET is_active = false WHERE id = $1', [ids.travel])
    expect(await slugs()).toEqual(['b', 'a'])
  })
})

describe('compactNumber', () => {
  it('shortens large numbers', () => {
    expect([950, 1200, 3400, 15000].map(compactNumber)).toEqual(['950', '1.2k', '3.4k', '15k'])
  })
})
