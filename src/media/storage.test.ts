import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ImageError } from '@/media/process'
import {
  deleteMedia,
  deriveAlt,
  getMedia,
  listMedia,
  safeResolve,
  saveUpload,
  updateAlt,
  variantFile,
} from '@/media/storage'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
let uploadsDir: string

const image = () => sharp({ create: { width: 900, height: 450, channels: 3, background: '#123456' } }).png().toBuffer()

beforeEach(async () => {
  pool = await resetDb()
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), 'galaxy-uploads-'))
})
afterEach(async () => {
  await rm(uploadsDir, { recursive: true, force: true })
})
afterAll(closeTestPool)

describe('deriveAlt', () => {
  it('turns a file name into readable alt text', () => {
    expect(deriveAlt('studio-headshot_85mm.JPG')).toBe('studio headshot 85mm')
    expect(deriveAlt('.png')).toBe('')
  })
})

describe('saveUpload', () => {
  it('writes original, card and thumb files and a media row', async () => {
    const row = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'studio-headshot.png' }, { alt: '', createdBy: null })
    expect(row).toMatchObject({ originalName: 'studio-headshot.png', mime: 'image/png', ext: 'png', width: 900, height: 450, alt: 'studio headshot' })
    for (const variant of ['original', 'card', 'thumb'] as const) {
      const info = await stat(safeResolve(uploadsDir, variantFile(row, variant)))
      expect(info.size).toBeGreaterThan(0)
    }
    expect(await getMedia(pool, row.id)).toMatchObject({ id: row.id, dir: row.dir })
  })

  it('uses the alt text that was given', async () => {
    const row = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'x.png' }, { alt: 'A red square', createdBy: null })
    expect(row.alt).toBe('A red square')
  })

  it('rejects a non-image and leaves no files or rows behind', async () => {
    await expect(
      saveUpload(pool, uploadsDir, { buffer: Buffer.from('nope'), originalName: 'x.txt' }, { alt: '', createdBy: null }),
    ).rejects.toBeInstanceOf(ImageError)
    expect(await readdir(uploadsDir)).toHaveLength(0)
    expect(await listMedia(pool, { limit: 10, offset: 0 })).toEqual({ rows: [], total: 0 })
  })
})

describe('listMedia, updateAlt and deleteMedia', () => {
  it('lists newest first with usage counts', async () => {
    const a = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'a.png' }, { alt: 'a', createdBy: null })
    const b = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'b.png' }, { alt: 'b', createdBy: null })
    const category = (await pool.query<{ id: number }>(`INSERT INTO categories (slug, name) VALUES ('c', 'C') RETURNING id`)).rows[0].id
    await pool.query(`INSERT INTO prompts (slug, title, category_id, example_media_id) VALUES ('p', 'P', $1, $2)`, [category, a.id])
    const { rows, total } = await listMedia(pool, { limit: 10, offset: 0 })
    expect(total).toBe(2)
    expect(rows.map((r) => r.id)).toEqual([b.id, a.id])
    expect(rows.find((r) => r.id === a.id)?.usageCount).toBe(1)
    expect(rows.find((r) => r.id === b.id)?.usageCount).toBe(0)
  })

  it('updates the alt text', async () => {
    const row = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'a.png' }, { alt: 'old', createdBy: null })
    await updateAlt(pool, row.id, '  new alt  ')
    expect((await getMedia(pool, row.id))?.alt).toBe('new alt')
  })

  it('deletes an unused image together with its files', async () => {
    const row = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'a.png' }, { alt: 'a', createdBy: null })
    expect(await deleteMedia(pool, uploadsDir, row.id)).toEqual({ ok: true })
    expect(await getMedia(pool, row.id)).toBeNull()
    await expect(stat(safeResolve(uploadsDir, variantFile(row, 'original')))).rejects.toThrow()
  })

  it('refuses to delete an image that a prompt still uses', async () => {
    const row = await saveUpload(pool, uploadsDir, { buffer: await image(), originalName: 'a.png' }, { alt: 'a', createdBy: null })
    const category = (await pool.query<{ id: number }>(`INSERT INTO categories (slug, name) VALUES ('c', 'C') RETURNING id`)).rows[0].id
    await pool.query(`INSERT INTO prompts (slug, title, category_id, example_media_id) VALUES ('p', 'P', $1, $2)`, [category, row.id])
    const result = await deleteMedia(pool, uploadsDir, row.id)
    expect(result.ok).toBe(false)
    expect(await getMedia(pool, row.id)).not.toBeNull()
  })
})

describe('safeResolve', () => {
  it('stays inside the uploads directory', () => {
    expect(safeResolve('/data/uploads', '2026-09/abc/thumb.webp')).toBe(path.resolve('/data/uploads', '2026-09/abc/thumb.webp'))
    expect(() => safeResolve('/data/uploads', '../secret')).toThrow(/outside/)
    expect(() => safeResolve('/data/uploads', '/etc/passwd')).toThrow(/outside/)
  })
})
