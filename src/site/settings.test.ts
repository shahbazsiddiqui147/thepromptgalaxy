import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getPublishedPage, listFooterPages } from '@/site/pages'
import { getSettings, saveSettings } from '@/site/settings'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('settings', () => {
  it('returns empty values before anything is saved', async () => {
    expect(await getSettings(pool)).toEqual({ socialX: '', socialInstagram: '', socialYoutube: '', contactEmail: '' })
  })

  it('saves, trims and reads back, and can clear a value', async () => {
    expect((await saveSettings(pool, { socialX: ' https://x.com/galaxy ', contactEmail: 'hi@example.com' }, null)).ok).toBe(true)
    expect(await getSettings(pool)).toMatchObject({ socialX: 'https://x.com/galaxy', contactEmail: 'hi@example.com', socialYoutube: '' })
    await saveSettings(pool, { socialX: '' }, null)
    expect((await getSettings(pool)).socialX).toBe('')
    const { rows } = await pool.query(`SELECT action FROM audit_log WHERE entity = 'settings'`)
    expect(rows).toHaveLength(2)
  })

  it('rejects bad addresses and stores nothing', async () => {
    const result = await saveSettings(pool, { socialX: 'javascript:alert(1)', contactEmail: 'nope', socialYoutube: 'ftp://x' }, null)
    expect(result).toEqual({
      ok: false,
      errors: {
        socialX: 'Enter a full address starting with https://',
        socialYoutube: 'Enter a full address starting with https://',
        contactEmail: 'Enter a valid email address',
      },
    })
    expect((await pool.query('SELECT 1 FROM site_settings')).rows).toHaveLength(0)
  })
})

describe('pages', () => {
  it('serves only published pages and lists the footer ones in order', async () => {
    await pool.query(`INSERT INTO pages (slug, title, body_html, is_published, show_in_footer, sort_order) VALUES
      ('about','About','<p>a</p>',true,true,2), ('privacy','Privacy','<p>p</p>',true,true,1),
      ('hidden-footer','Terms','',true,false,3), ('draft','Draft','',false,true,0)`)
    expect(await getPublishedPage(pool, 'about')).toMatchObject({ title: 'About', bodyHtml: '<p>a</p>' })
    expect(await getPublishedPage(pool, 'draft')).toBeNull()
    expect(await getPublishedPage(pool, 'nope')).toBeNull()
    expect((await listFooterPages(pool)).map((p) => p.slug)).toEqual(['privacy', 'about'])
  })
})
