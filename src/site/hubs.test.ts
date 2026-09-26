import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getCategoryHub, getComboMeta, getHome, getNav, getStyleHub, getToolHub } from '@/site/hubs'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
const ids: Record<string, number> = {}

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

async function prompt(key: string, cat: string, tools: string[], o: { status?: string; saves?: number; styles?: string[] } = {}) {
  const status = o.status ?? 'published'
  const id = await one(
    `INSERT INTO prompts (slug, title, category_id, status, save_count, published_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [key, key, ids[cat], status, o.saves ?? 0, status === 'published' ? '2026-09-01' : null],
  )
  for (const [i, t] of tools.entries()) {
    await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary, fit) VALUES ($1,$2,$3,$4,$5)', [id, ids[cat], ids[t], i === 0, 'good'])
  }
  for (const s of o.styles ?? []) await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1,$2,$3)', [id, ids[cat], ids[s]])
}

beforeEach(async () => {
  pool = await resetDb()
  ids.portrait = await one(`INSERT INTO categories (slug, name, sort_order) VALUES ('portrait','Portrait',1) RETURNING id`)
  ids.travel = await one(`INSERT INTO categories (slug, name, sort_order, supports_styles) VALUES ('travel','Travel',2,false) RETURNING id`)
  ids.ghost = await one(`INSERT INTO categories (slug, name, is_active) VALUES ('ghost','Ghost',false) RETURNING id`)
  ids.mj = await one(`INSERT INTO tools (slug, name, sort_order) VALUES ('midjourney','Midjourney',1) RETURNING id`)
  ids.gpt = await one(`INSERT INTO tools (slug, name, sort_order) VALUES ('chatgpt','ChatGPT',2) RETURNING id`)
  ids.off = await one(`INSERT INTO tools (slug, name, is_active) VALUES ('off','Off',false) RETURNING id`)
  ids.cine = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic','Cinematic') RETURNING id`)
  for (const [c, t] of [['portrait', 'mj'], ['portrait', 'gpt'], ['portrait', 'off'], ['travel', 'gpt'], ['ghost', 'gpt']]) {
    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1,$2)', [ids[c], ids[t]])
  }
  await pool.query(`UPDATE category_tools SET is_indexable = true, seo_title = 'Combo title', intro = 'Combo intro' WHERE category_id = $1 AND tool_id = $2`, [ids.portrait, ids.mj])
  await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1,$2)', [ids.portrait, ids.cine])
  await prompt('p1', 'portrait', ['mj', 'gpt'], { saves: 5, styles: ['cine'] })
  await prompt('p2', 'portrait', ['gpt'], { saves: 9 })
  await prompt('p3', 'travel', ['gpt'], { saves: 1 })
  await prompt('p4', 'portrait', ['mj'], { status: 'draft', saves: 100 })
  await prompt('p5', 'ghost', ['gpt'], { saves: 50 })
})
afterAll(closeTestPool)

describe('getNav', () => {
  it('lists active categories and tools with published counts and totals', async () => {
    const nav = await getNav(pool)
    expect(nav.categories).toEqual([{ slug: 'portrait', name: 'Portrait', count: 2 }, { slug: 'travel', name: 'Travel', count: 1 }])
    expect(nav.tools).toEqual([{ slug: 'midjourney', name: 'Midjourney', count: 1 }, { slug: 'chatgpt', name: 'ChatGPT', count: 3 }])
    expect(nav.totals).toEqual({ prompts: 3, categories: 2, tools: 2 })
  })
})

describe('getHome', () => {
  it('returns pair counts, styles and the most saved published prompts', async () => {
    const home = await getHome(pool)
    expect(home.mostSaved.map((c) => c.slug)).toEqual(['p2', 'p1', 'p3'])
    expect(home.pairCounts).toEqual(expect.arrayContaining([
      { categoryId: ids.portrait, toolId: ids.mj, count: 1 },
      { categoryId: ids.portrait, toolId: ids.gpt, count: 2 },
      { categoryId: ids.travel, toolId: ids.gpt, count: 1 },
    ]))
    expect(home.pairCounts.find((p) => p.toolId === ids.off)).toBeUndefined()
    expect(home.styles.map((s) => s.name)).toEqual(['Cinematic'])
    expect(home.categories[0]).toMatchObject({ id: ids.portrait, slug: 'portrait', count: 2 })
  })
})

describe('hubs', () => {
  it('category hub lists linked active tools with counts and styles with counts', async () => {
    const hub = await getCategoryHub(pool, 'portrait')
    expect(hub?.category).toMatchObject({ name: 'Portrait', supportsStyles: true })
    expect(hub?.tools.map((t) => [t.slug, t.count])).toEqual([['midjourney', 1], ['chatgpt', 2]])
    expect(hub?.styles.map((s) => [s.slug, s.count])).toEqual([['cinematic', 1]])
  })
  it('omits styles when the category does not support them and hides inactive categories', async () => {
    expect((await getCategoryHub(pool, 'travel'))?.styles).toEqual([])
    expect(await getCategoryHub(pool, 'ghost')).toBeNull()
    expect(await getCategoryHub(pool, 'nope')).toBeNull()
  })
  it('tool hub lists categories where the tool has published prompts linked', async () => {
    const hub = await getToolHub(pool, 'chatgpt')
    expect(hub?.categories.map((c) => [c.slug, c.count])).toEqual([['portrait', 2], ['travel', 1]])
    expect(await getToolHub(pool, 'off')).toBeNull()
  })
  it('style hub lists its categories', async () => {
    const hub = await getStyleHub(pool, 'cinematic')
    expect(hub?.categories.map((c) => [c.slug, c.count])).toEqual([['portrait', 1]])
    expect(await getStyleHub(pool, 'nope')).toBeNull()
  })
  it('combo meta returns the matrix fields and null for unlinked pairs', async () => {
    expect(await getComboMeta(pool, ids.portrait, ids.mj)).toEqual({ seoTitle: 'Combo title', seoDescription: '', intro: 'Combo intro', isIndexable: true })
    expect(await getComboMeta(pool, ids.travel, ids.mj)).toBeNull()
  })
})
