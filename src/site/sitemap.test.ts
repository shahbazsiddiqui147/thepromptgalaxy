import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getSitemapEntries } from '@/site/sitemap'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('getSitemapEntries', () => {
  it('lists hubs, indexable combos and published prompts only', async () => {
    const portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait','Portrait') RETURNING id`)
    const hidden = await one(`INSERT INTO categories (slug, name, is_active) VALUES ('hidden','Hidden', false) RETURNING id`)
    const mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney','Midjourney') RETURNING id`)
    const gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt','ChatGPT') RETURNING id`)
    await one(`INSERT INTO styles (slug, name) VALUES ('cinematic','Cinematic') RETURNING id`)
    for (const [c, t] of [[portrait, mj], [portrait, gpt], [hidden, mj]]) {
      await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1,$2)', [c, t])
    }
    await pool.query('UPDATE category_tools SET is_indexable = true WHERE category_id = $1 AND tool_id = $2', [portrait, mj])
    await pool.query('UPDATE category_tools SET is_indexable = true WHERE category_id = $1', [hidden])
    await pool.query(`INSERT INTO prompts (slug, title, category_id, status, published_at) VALUES ('live','L',$1,'published',now()), ('draft','D',$1,'draft',NULL), ('gone','G',$2,'published',now())`, [portrait, hidden])

    const entries = await getSitemapEntries(pool)
    expect(entries.map((e) => e.path)).toEqual([
      '/',
      '/category/portrait/',
      '/tool/chatgpt/',
      '/tool/midjourney/',
      '/style/cinematic/',
      '/category/portrait/?tool=midjourney',
      '/prompt/live/',
    ])
    expect(entries[entries.length - 1].lastModified).toBeInstanceOf(Date)
  })
})
