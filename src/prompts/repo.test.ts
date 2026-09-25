import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { withTransaction } from '@/db/pool'
import { deletePrompt, getPromptForEdit, listPrompts, savePrompt, similarCandidates } from '@/prompts/repo'
import { emptyPrompt, type PromptInput } from '@/prompts/types'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
let portrait: number
let travel: number
let mj: number
let gpt: number
let cinematic: number
let mediaId: number

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

const save = (id: number | null, input: PromptInput) => withTransaction(pool, (tx) => savePrompt(tx, id, input, null))

function input(overrides: Partial<PromptInput> = {}): PromptInput {
  return {
    ...emptyPrompt(),
    title: 'Studio headshot',
    summary: 'Clean lighting.',
    categoryId: portrait,
    promptText: 'Use the attached photo.',
    exampleMediaId: mediaId,
    tools: [{ toolId: mj, fit: 'great', isPrimary: true }],
    ...overrides,
  }
}

beforeEach(async () => {
  pool = await resetDb()
  portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  travel = await one(`INSERT INTO categories (slug, name, supports_styles) VALUES ('travel', 'Travel', false) RETURNING id`)
  mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney', 'Midjourney') RETURNING id`)
  gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt', 'ChatGPT') RETURNING id`)
  cinematic = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)
  await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [portrait, mj])
  await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [portrait, cinematic])
  mediaId = await one(
    `INSERT INTO media (original_name, dir, mime, ext, size_bytes, width, height)
     VALUES ('a.png', '2026-09/aaa', 'image/png', 'png', 100, 10, 10) RETURNING id`,
  )
})
afterAll(closeTestPool)

describe('savePrompt (create)', () => {
  it('saves a draft with every child collection and reads it back', async () => {
    const other = await one(`INSERT INTO prompts (slug, title, category_id, status) VALUES ('other', 'Other', $1, 'published') RETURNING id`, [portrait])
    const result = await save(
      null,
      input({
        isChain: true,
        promptText: '',
        steps: [
          { label: 'Base', text: 'Step one', exampleMediaId: mediaId },
          { label: 'Grade', text: 'Step two', exampleMediaId: null },
        ],
        styleIds: [cinematic],
        faqs: [{ question: 'Q?', answer: 'A.' }],
        similarIds: [other],
        isPremium: true,
        quickAnswer: 'Short answer',
        articleHtml: '<p>Article</p>',
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const saved = await getPromptForEdit(pool, result.id)
    expect(saved).toMatchObject({
      title: 'Studio headshot',
      slug: 'studio-headshot',
      status: 'draft',
      isChain: true,
      isPremium: true,
      categoryId: portrait,
      styleIds: [cinematic],
      similarIds: [other],
      quickAnswer: 'Short answer',
      articleHtml: '<p>Article</p>',
      publishedAt: null,
    })
    expect(saved?.steps.map((s) => s.label)).toEqual(['Base', 'Grade'])
    expect(saved?.steps[0].exampleMediaId).toBe(mediaId)
    expect(saved?.tools).toEqual([{ toolId: mj, fit: 'great', isPrimary: true }])
    expect(saved?.faqs).toEqual([{ question: 'Q?', answer: 'A.' }])
  })

  it('generates a unique slug from the title', async () => {
    const a = await save(null, input())
    const b = await save(null, input())
    if (!a.ok || !b.ok) throw new Error('save failed')
    expect((await getPromptForEdit(pool, a.id))?.slug).toBe('studio-headshot')
    expect((await getPromptForEdit(pool, b.id))?.slug).toBe('studio-headshot-2')
  })

  it('rejects a hand-typed slug that is taken', async () => {
    await save(null, input())
    expect(await save(null, input({ slug: 'studio-headshot' }))).toEqual({
      ok: false,
      errors: { slug: 'This slug is already in use.' },
    })
  })

  it('refuses a tool that is not linked to the category and stores nothing', async () => {
    const result = await save(null, input({ tools: [{ toolId: gpt, fit: 'good', isPrimary: true }] }))
    expect(result).toEqual({ ok: false, errors: { tools: 'One of the chosen tools is not available for this category.' } })
    expect((await pool.query('SELECT 1 FROM prompts')).rows).toHaveLength(0)
  })

  it('refuses styles for a category that does not support them', async () => {
    const result = await save(null, input({ categoryId: travel, tools: [], styleIds: [cinematic] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['styles'])
  })

  it('refuses to publish an incomplete prompt', async () => {
    const result = await save(null, input({ status: 'published', summary: '', exampleMediaId: null }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors._).toMatch(/summary/i)
    expect((await pool.query('SELECT 1 FROM prompts')).rows).toHaveLength(0)
  })

  it('sets published_at when a complete prompt is published', async () => {
    const result = await save(null, input({ status: 'published' }))
    if (!result.ok) throw new Error('save failed')
    expect((await getPromptForEdit(pool, result.id))?.publishedAt).toBeInstanceOf(Date)
  })
})

describe('savePrompt (update)', () => {
  it('replaces children on update', async () => {
    const created = await save(null, input({ faqs: [{ question: 'Q1', answer: 'A1' }], styleIds: [cinematic] }))
    if (!created.ok) throw new Error('save failed')
    await save(created.id, input({ faqs: [{ question: 'Q2', answer: 'A2' }], styleIds: [] }))
    const saved = await getPromptForEdit(pool, created.id)
    expect(saved?.faqs).toEqual([{ question: 'Q2', answer: 'A2' }])
    expect(saved?.styleIds).toEqual([])
  })

  it('changes category only when the tools are valid there, otherwise changes nothing', async () => {
    const created = await save(null, input())
    if (!created.ok) throw new Error('save failed')
    const blocked = await save(created.id, input({ categoryId: travel }))
    expect(blocked.ok).toBe(false)
    expect((await getPromptForEdit(pool, created.id))?.categoryId).toBe(portrait)

    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [travel, mj])
    const allowed = await save(created.id, input({ categoryId: travel }))
    expect(allowed.ok).toBe(true)
    expect((await getPromptForEdit(pool, created.id))?.categoryId).toBe(travel)
  })

  it('keeps the slug while it is still a draft and follows an edited one', async () => {
    const created = await save(null, input())
    if (!created.ok) throw new Error('save failed')
    await save(created.id, input({ title: 'Renamed title' }))
    expect((await getPromptForEdit(pool, created.id))?.slug).toBe('studio-headshot')
    await save(created.id, input({ slug: 'custom-url' }))
    expect((await getPromptForEdit(pool, created.id))?.slug).toBe('custom-url')
  })

  it('locks the slug after publishing unless the change is confirmed, and records a redirect', async () => {
    const created = await save(null, input({ status: 'published' }))
    if (!created.ok) throw new Error('save failed')

    await save(created.id, input({ status: 'published', slug: 'sneaky-change' }))
    expect((await getPromptForEdit(pool, created.id))?.slug).toBe('studio-headshot')

    await save(created.id, input({ status: 'published', slug: 'new-official-url', changePublishedSlug: true }))
    expect((await getPromptForEdit(pool, created.id))?.slug).toBe('new-official-url')
    const { rows } = await pool.query('SELECT from_path, to_path FROM redirects')
    expect(rows).toEqual([{ from_path: '/prompt/studio-headshot/', to_path: '/prompt/new-official-url/' }])
  })

  it('keeps published_at when unpublished and republished', async () => {
    const created = await save(null, input({ status: 'published' }))
    if (!created.ok) throw new Error('save failed')
    const first = (await getPromptForEdit(pool, created.id))?.publishedAt
    await save(created.id, input({ status: 'draft' }))
    await save(created.id, input({ status: 'published' }))
    expect((await getPromptForEdit(pool, created.id))?.publishedAt).toEqual(first)
  })

  it('reports a missing prompt', async () => {
    expect(await save(9999, input())).toEqual({ ok: false, errors: { _: 'Prompt not found.' } })
  })

  it('writes an audit entry', async () => {
    const created = await save(null, input())
    if (!created.ok) throw new Error('save failed')
    await save(created.id, input({ title: 'Changed' }))
    const { rows } = await pool.query(`SELECT action FROM audit_log WHERE entity = 'prompts' ORDER BY id`)
    expect(rows.map((r) => r.action)).toEqual(['create', 'update'])
  })
})

describe('deletePrompt', () => {
  it('deletes drafts, refuses published prompts', async () => {
    const draft = await save(null, input())
    const live = await save(null, input({ title: 'Live one', status: 'published' }))
    if (!draft.ok || !live.ok) throw new Error('save failed')
    expect(await deletePrompt(pool, draft.id, null)).toEqual({ ok: true })
    const refused = await deletePrompt(pool, live.id, null)
    expect(refused.ok).toBe(false)
    expect((await pool.query('SELECT id FROM prompts')).rows.map((r) => r.id)).toEqual([live.id])
  })
})

describe('listPrompts and similarCandidates', () => {
  it('filters by status, category and title text and reports the total', async () => {
    await save(null, input({ title: 'Alpha portrait' }))
    await save(null, input({ title: 'Beta portrait', status: 'published' }))
    const all = await listPrompts(pool, { limit: 10, offset: 0 })
    expect(all.total).toBe(2)
    expect(all.rows[0]).toMatchObject({ categoryName: 'Portrait', primaryToolName: 'Midjourney' })
    expect((await listPrompts(pool, { status: 'published', limit: 10, offset: 0 })).rows.map((r) => r.title)).toEqual(['Beta portrait'])
    expect((await listPrompts(pool, { q: 'alph', limit: 10, offset: 0 })).total).toBe(1)
    expect((await listPrompts(pool, { categoryId: travel, limit: 10, offset: 0 })).total).toBe(0)
    expect((await listPrompts(pool, { q: '100%', limit: 10, offset: 0 })).total).toBe(0)
  })

  it('offers only published prompts, without the one being edited, as similar candidates', async () => {
    const a = await save(null, input({ title: 'A', status: 'published' }))
    const b = await save(null, input({ title: 'B', status: 'published' }))
    await save(null, input({ title: 'C draft' }))
    if (!a.ok || !b.ok) throw new Error('save failed')
    expect((await similarCandidates(pool, a.id)).map((r) => r.title)).toEqual(['B'])
  })
})
