import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getPublicPrompt } from '@/site/prompt'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
const ids: Record<string, number> = {}

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

async function prompt(slug: string, o: { status?: string; premium?: boolean; chain?: boolean; cat?: string } = {}) {
  const status = o.status ?? 'published'
  ids[slug] = await one(
    `INSERT INTO prompts (slug, title, summary, category_id, status, is_premium, is_chain, prompt_text, quick_answer, article_html, seo_title, published_at, author_id, example_media_id)
     VALUES ($1, $2, 'Sum', $3, $4, $5, $6, $7, 'Quick', '<p>Art</p>', 'SEO', $8, $9, $10) RETURNING id`,
    [slug, slug.toUpperCase(), ids[o.cat ?? 'portrait'], status, o.premium ?? false, o.chain ?? false, o.chain ? '' : 'SECRET TEXT', status === 'published' ? '2026-09-01' : null, ids.user, ids.media],
  )
  await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary, fit) VALUES ($1,$2,$3,true,$4)', [ids[slug], ids[o.cat ?? 'portrait'], ids.mj, 'great'])
  return ids[slug]
}

beforeEach(async () => {
  pool = await resetDb()
  ids.user = await one(`INSERT INTO users (email, password_hash, display_name, handle) VALUES ('a@x.com','x','A','lensfox') RETURNING id`)
  ids.media = await one(`INSERT INTO media (original_name, dir, mime, ext, size_bytes, width, height) VALUES ('a.png','2026-09/a','image/png','png',1,1,1) RETURNING id`)
  ids.portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait','Portrait') RETURNING id`)
  ids.hidden = await one(`INSERT INTO categories (slug, name, is_active) VALUES ('hidden','Hidden', false) RETURNING id`)
  ids.mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney','Midjourney') RETURNING id`)
  ids.cine = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic','Cinematic') RETURNING id`)
  for (const c of ['portrait', 'hidden']) await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1,$2)', [ids[c], ids.mj])
  await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1,$2)', [ids.portrait, ids.cine])
})
afterAll(closeTestPool)

describe('getPublicPrompt', () => {
  it('returns null for drafts, archived prompts, inactive categories and unknown slugs', async () => {
    await prompt('draft', { status: 'draft' })
    await prompt('old', { status: 'archived' })
    await prompt('hid', { cat: 'hidden' })
    expect(await getPublicPrompt(pool, 'draft')).toBeNull()
    expect(await getPublicPrompt(pool, 'old')).toBeNull()
    expect(await getPublicPrompt(pool, 'hid')).toBeNull()
    expect(await getPublicPrompt(pool, 'nope')).toBeNull()
  })

  it('returns the full public data of a free prompt', async () => {
    const id = await prompt('free')
    await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1,$2,$3)', [id, ids.portrait, ids.cine])
    await pool.query(`INSERT INTO prompt_faqs (prompt_id, position, question, answer) VALUES ($1,0,'Q','A')`, [id])
    const p = await getPublicPrompt(pool, 'free')
    expect(p).toMatchObject({
      slug: 'free', title: 'FREE', summary: 'Sum', author: 'lensfox', isPremium: false, isChain: false,
      promptText: 'SECRET TEXT', quickAnswer: 'Quick', articleHtml: '<p>Art</p>', seoTitle: 'SEO', exampleMediaId: ids.media,
      category: { name: 'Portrait', slug: 'portrait' },
    })
    expect(p?.tools).toEqual([{ id: ids.mj, name: 'Midjourney', slug: 'midjourney', fit: 'great', isPrimary: true }])
    expect(p?.styles).toEqual([{ id: ids.cine, name: 'Cinematic', slug: 'cinematic' }])
    expect(p?.faqs).toEqual([{ question: 'Q', answer: 'A' }])
  })

  it('never returns the text of a premium prompt or its steps', async () => {
    const id = await prompt('prem', { premium: true })
    const chain = await prompt('premchain', { premium: true, chain: true })
    await pool.query(`INSERT INTO prompt_steps (prompt_id, position, label, text, example_media_id) VALUES ($1,0,'Base','SECRET STEP',$2)`, [chain, ids.media])
    expect((await getPublicPrompt(pool, 'prem'))?.promptText).toBeNull()
    const c = await getPublicPrompt(pool, 'premchain')
    expect(c?.steps).toEqual([{ label: 'Base', text: null, exampleMediaId: ids.media }])
    expect(JSON.stringify(c)).not.toContain('SECRET')
    expect(id).toBeGreaterThan(0)
  })

  it('returns steps of a free chain in order', async () => {
    const id = await prompt('chain', { chain: true })
    await pool.query(`INSERT INTO prompt_steps (prompt_id, position, label, text) VALUES ($1,1,'Two','t2'), ($1,0,'One','t1')`, [id])
    expect((await getPublicPrompt(pool, 'chain'))?.steps.map((s) => s.text)).toEqual(['t1', 't2'])
  })

  it('lists only published similar prompts in position order', async () => {
    const main = await prompt('main')
    const s1 = await prompt('s1')
    const s2 = await prompt('s2')
    const s3 = await prompt('s3', { status: 'draft' })
    await pool.query('INSERT INTO similar_prompts (prompt_id, similar_id, position) VALUES ($1,$2,1), ($1,$3,0), ($1,$4,2)', [main, s1, s2, s3])
    expect((await getPublicPrompt(pool, 'main'))?.similar.map((c) => c.slug)).toEqual(['s2', 's1'])
  })
})
