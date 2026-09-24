import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { categories, tools } from '@/registry/entities'
import { createRow, deleteRow, getRow, listRows, updateRow } from '@/registry/repo'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

const base = {
  name: 'Portrait',
  slug: '',
  description: '',
  sortOrder: '',
  isActive: true,
  supportsStyles: true,
  seoTitle: '',
  seoDescription: '',
}

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('createRow', () => {
  it('creates a row with a generated slug and defaults', async () => {
    const result = await createRow(pool, categories, base, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const row = await getRow(pool, categories, result.id)
    expect(row).toMatchObject({ name: 'Portrait', slug: 'portrait', sortOrder: 0, isActive: true, supportsStyles: true })
  })

  it('suffixes generated slugs that collide', async () => {
    await createRow(pool, categories, base, null)
    const second = await createRow(pool, categories, base, null)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect((await getRow(pool, categories, second.id))?.slug).toBe('portrait-2')
  })

  it('rejects a hand-typed slug that is already taken', async () => {
    await createRow(pool, categories, base, null)
    const result = await createRow(pool, categories, { ...base, name: 'Other', slug: 'portrait' }, null)
    expect(result).toEqual({ ok: false, errors: { slug: 'This slug is already in use.' } })
  })

  it('returns validation errors and writes nothing', async () => {
    const result = await createRow(pool, categories, { ...base, name: '' }, null)
    expect(result).toEqual({ ok: false, errors: { name: 'Required' } })
    expect(await listRows(pool, categories)).toHaveLength(0)
  })

  it('writes an audit entry', async () => {
    await createRow(pool, categories, base, null)
    const { rows } = await pool.query('SELECT entity, action FROM audit_log')
    expect(rows).toEqual([{ entity: 'categories', action: 'create' }])
  })
})

describe('listRows', () => {
  it('orders by sort order then name', async () => {
    const tool = { slug: '', vendor: '', isActive: true, seoTitle: '', seoDescription: '' }
    await createRow(pool, tools, { ...tool, name: 'Zed', sortOrder: '1' }, null)
    await createRow(pool, tools, { ...tool, name: 'Alpha', sortOrder: '2' }, null)
    await createRow(pool, tools, { ...tool, name: 'Beta', sortOrder: '1' }, null)
    const rows = await listRows(pool, tools)
    expect(rows.map((r) => r.name)).toEqual(['Beta', 'Zed', 'Alpha'])
  })
})

describe('updateRow', () => {
  it('keeps the slug when the update leaves it empty', async () => {
    const created = await createRow(pool, categories, base, null)
    if (!created.ok) throw new Error('create failed')
    const result = await updateRow(pool, categories, created.id, { ...base, name: 'Portraits', slug: '' }, null)
    expect(result.ok).toBe(true)
    expect(await getRow(pool, categories, created.id)).toMatchObject({ name: 'Portraits', slug: 'portrait' })
  })

  it('records a redirect when the slug changes and collapses redirect chains', async () => {
    const created = await createRow(pool, categories, base, null)
    if (!created.ok) throw new Error('create failed')
    await updateRow(pool, categories, created.id, { ...base, slug: 'portraits' }, null)
    await updateRow(pool, categories, created.id, { ...base, slug: 'people' }, null)
    const { rows } = await pool.query('SELECT from_path, to_path FROM redirects ORDER BY from_path')
    expect(rows).toEqual([
      { from_path: '/category/portrait/', to_path: '/category/people/' },
      { from_path: '/category/portraits/', to_path: '/category/people/' },
    ])
  })

  it('removes a redirect that would loop when a slug is changed back', async () => {
    const created = await createRow(pool, categories, base, null)
    if (!created.ok) throw new Error('create failed')
    await updateRow(pool, categories, created.id, { ...base, slug: 'portraits' }, null)
    await updateRow(pool, categories, created.id, { ...base, slug: 'portrait' }, null)
    const { rows } = await pool.query('SELECT from_path, to_path FROM redirects')
    expect(rows).toEqual([{ from_path: '/category/portraits/', to_path: '/category/portrait/' }])
  })

  it('rejects a slug used by another row', async () => {
    await createRow(pool, categories, base, null)
    const other = await createRow(pool, categories, { ...base, name: 'Travel' }, null)
    if (!other.ok) throw new Error('create failed')
    const result = await updateRow(pool, categories, other.id, { ...base, name: 'Travel', slug: 'portrait' }, null)
    expect(result).toEqual({ ok: false, errors: { slug: 'This slug is already in use.' } })
  })

  it('reports a missing row', async () => {
    const result = await updateRow(pool, categories, 9999, base, null)
    expect(result).toEqual({ ok: false, errors: { _: 'Record not found.' } })
  })

  it('turns a database rule violation into a form error', async () => {
    const cat = await createRow(pool, categories, base, null)
    if (!cat.ok) throw new Error('create failed')
    const style = (await pool.query<{ id: number }>(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)).rows[0].id
    await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [cat.id, style])
    const prompt = (await pool.query<{ id: number }>(`INSERT INTO prompts (slug, title, category_id) VALUES ('p', 'P', $1) RETURNING id`, [cat.id])).rows[0].id
    await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [prompt, cat.id, style])
    const result = await updateRow(pool, categories, cat.id, { ...base, supportsStyles: false }, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors._).toMatch(/still use styles/)
  })
})

describe('deleteRow', () => {
  it('blocks deleting a category that has prompts, and deletes an unused one', async () => {
    const used = await createRow(pool, categories, base, null)
    const unused = await createRow(pool, categories, { ...base, name: 'Travel' }, null)
    if (!used.ok || !unused.ok) throw new Error('create failed')
    await pool.query(`INSERT INTO prompts (slug, title, category_id) VALUES ('p', 'P', $1)`, [used.id])

    const blocked = await deleteRow(pool, categories, used.id, null)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.reason).toMatch(/1 prompt\(s\) use this category/)

    expect(await deleteRow(pool, categories, unused.id, null)).toEqual({ ok: true })
    expect(await getRow(pool, categories, unused.id)).toBeNull()
  })

  it('reports a missing row', async () => {
    expect(await deleteRow(pool, categories, 9999, null)).toEqual({ ok: false, reason: 'Record not found.' })
  })
})
