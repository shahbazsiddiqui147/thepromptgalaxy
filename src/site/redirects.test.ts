import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { normalizePath, resolveRedirect } from '@/site/redirects'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('normalizePath', () => {
  it('builds the stored form', () => {
    expect(normalizePath(['prompt', 'My-Slug'])).toBe('/prompt/my-slug/')
    expect(normalizePath(['a%20b'])).toBe('/a b/')
    expect(normalizePath(['%E0%A4%A'])).toBe('/%e0%a4%a/')
  })
})

describe('resolveRedirect', () => {
  it('returns the stored target and status, or null', async () => {
    await pool.query(`INSERT INTO redirects (from_path, to_path, status_code) VALUES ('/prompt/old/', '/prompt/new/', 301), ('/tmp/', '/x/', 302)`)
    expect(await resolveRedirect(pool, '/prompt/old/')).toEqual({ to: '/prompt/new/', status: 301 })
    expect(await resolveRedirect(pool, '/tmp/')).toEqual({ to: '/x/', status: 302 })
    expect(await resolveRedirect(pool, '/nope/')).toBeNull()
  })
})
