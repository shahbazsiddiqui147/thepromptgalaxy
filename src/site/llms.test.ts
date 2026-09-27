import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getLlmsText } from '@/site/llms'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('getLlmsText', () => {
  it('lists active categories and tools, and published prompts with their summary, most saved first', async () => {
    const portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait','Portrait') RETURNING id`)
    const hidden = await one(`INSERT INTO categories (slug, name, is_active) VALUES ('hidden','Hidden', false) RETURNING id`)
    await pool.query(`INSERT INTO tools (slug, name) VALUES ('midjourney','Midjourney')`)
    await pool.query(
      `INSERT INTO prompts (slug, title, summary, category_id, status, save_count, published_at) VALUES
       ('a','A','Summary A',$1,'published',5,now()), ('b','B','Summary B',$1,'published',50,now()),
       ('draft','Draft','x',$1,'draft',999,NULL), ('gone','Gone','x',$2,'published',1,now())`,
      [portrait, hidden],
    )

    const text = await getLlmsText(pool, 'https://thepromptgalaxy.com')
    expect(text).toContain('# ThePromptGalaxy')
    expect(text).toContain('[Portrait](https://thepromptgalaxy.com/category/portrait/)')
    expect(text).toContain('[Midjourney](https://thepromptgalaxy.com/tool/midjourney/)')
    expect(text).toContain('[B](https://thepromptgalaxy.com/prompt/b/): Summary B')
    expect(text.indexOf('B](')).toBeLessThan(text.indexOf('A]('))
    expect(text).not.toContain('Draft')
    expect(text).not.toContain('Gone')
    expect(text).toContain('sitemap.xml')
  })

  it('omits empty sections when there is no content yet', async () => {
    const text = await getLlmsText(pool, 'https://thepromptgalaxy.com')
    expect(text).not.toContain('## Categories')
    expect(text).not.toContain('## Tools')
    expect(text).not.toContain('## Prompts')
    expect(text).toContain('0 tested AI prompts')
  })
})
