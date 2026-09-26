import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { pages } from '@/registry/entities'
import { createRow, getRow, updateRow } from '@/registry/repo'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

const input = (o: Record<string, unknown> = {}) => ({
  title: 'About us', slug: '', body: '<p>Hello</p>', isPublished: true, showInFooter: true, sortOrder: '0', seoTitle: '', seoDescription: '', ...o,
})

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('pages entity', () => {
  it('generates the address from the title and sanitizes the content', async () => {
    const result = await createRow(pool, pages, input({ body: '<p onclick="x()">Hi</p><script>alert(1)</script>' }), null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(await getRow(pool, pages, result.id)).toMatchObject({ slug: 'about-us', body: '<p>Hi</p>', isPublished: true })
  })

  it('refuses addresses that would shadow a real route', async () => {
    expect(await createRow(pool, pages, input({ slug: 'admin' }), null)).toEqual({
      ok: false,
      errors: { slug: 'This address is reserved by the site. Choose another.' },
    })
    const generated = await createRow(pool, pages, input({ title: 'Search' }), null)
    if (!generated.ok) throw new Error('save failed')
    expect((await getRow(pool, pages, generated.id))?.slug).toBe('search-page')
  })

  it('records a redirect when the address changes', async () => {
    const created = await createRow(pool, pages, input(), null)
    if (!created.ok) throw new Error('save failed')
    expect((await updateRow(pool, pages, created.id, input({ slug: 'who-we-are' }), null)).ok).toBe(true)
    const { rows } = await pool.query('SELECT from_path, to_path FROM redirects')
    expect(rows).toEqual([{ from_path: '/about-us/', to_path: '/who-we-are/' }])
  })
})
