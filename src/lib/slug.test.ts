import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { isSlugTaken, slugify, uniqueSlug } from '@/lib/slug'
import { closeTestPool, resetDb } from '@/test/db'

describe('slugify', () => {
  it('lower-cases and hyphenates', () => {
    expect(slugify('Studio Headshot, 85mm')).toBe('studio-headshot-85mm')
  })
  it('strips accents and expands ampersands', () => {
    expect(slugify('Café & Bar')).toBe('cafe-and-bar')
  })
  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('   !!! ')).toBe('')
  })
  it('caps the length at 80 characters without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(79)} bbb`)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('database slug helpers', () => {
  let pool: Awaited<ReturnType<typeof resetDb>>
  beforeEach(async () => {
    pool = await resetDb()
    await pool.query(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait'), ('portrait-2', 'Portrait 2')`)
  })
  afterAll(closeTestPool)

  it('finds a taken slug and ignores the excluded id', async () => {
    expect(await isSlugTaken(pool, 'categories', 'portrait')).toBe(true)
    expect(await isSlugTaken(pool, 'categories', 'nope')).toBe(false)
    const { rows } = await pool.query<{ id: number }>(`SELECT id FROM categories WHERE slug = 'portrait'`)
    expect(await isSlugTaken(pool, 'categories', 'portrait', rows[0].id)).toBe(false)
  })

  it('appends the next free numeric suffix', async () => {
    expect(await uniqueSlug(pool, 'categories', 'portrait')).toBe('portrait-3')
    expect(await uniqueSlug(pool, 'categories', 'travel')).toBe('travel')
  })

  it('falls back to "item" for an empty base', async () => {
    expect(await uniqueSlug(pool, 'categories', '')).toBe('item')
  })

  it('rejects unsafe table names', async () => {
    await expect(isSlugTaken(pool, 'categories; drop table users', 'x')).rejects.toThrow(/Unsafe SQL identifier/)
  })
})
