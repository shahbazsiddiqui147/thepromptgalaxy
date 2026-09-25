import { randomBytes } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Queryable } from '@/db/pool'
import { processImage } from '@/media/process'

export type Variant = 'original' | 'card' | 'thumb'
export const VARIANTS: readonly Variant[] = ['original', 'card', 'thumb']

export type MediaRow = {
  id: number
  originalName: string
  dir: string
  mime: string
  ext: string
  sizeBytes: number
  width: number
  height: number
  alt: string
  createdAt: Date
}

const MEDIA_SELECT = `id, original_name AS "originalName", dir, mime, ext, size_bytes AS "sizeBytes",
  width, height, alt, created_at AS "createdAt"`

export function isVariant(value: string): value is Variant {
  return (VARIANTS as readonly string[]).includes(value)
}

/** Path of a variant file, relative to the uploads directory. */
export function variantFile(row: Pick<MediaRow, 'dir' | 'ext'>, variant: Variant): string {
  return variant === 'original' ? `${row.dir}/original.${row.ext}` : `${row.dir}/${variant}.webp`
}

/** Resolves a relative path inside the uploads directory and refuses anything that escapes it. */
export function safeResolve(uploadsDir: string, relative: string): string {
  const root = path.resolve(uploadsDir)
  const full = path.resolve(root, relative)
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error('Path is outside the uploads directory')
  }
  return full
}

export function deriveAlt(fileName: string): string {
  return fileName
    .replace(/\.[^./]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

export async function saveUpload(
  db: Queryable,
  uploadsDir: string,
  file: { buffer: Buffer; originalName: string },
  opts: { alt: string; createdBy: number | null },
): Promise<MediaRow> {
  const processed = await processImage(file.buffer)

  const now = new Date()
  const dir = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomBytes(12).toString('hex')}`
  const absolute = safeResolve(uploadsDir, dir)
  await mkdir(absolute, { recursive: true })
  try {
    await writeFile(path.join(absolute, `original.${processed.ext}`), processed.original)
    await writeFile(path.join(absolute, 'card.webp'), processed.card)
    await writeFile(path.join(absolute, 'thumb.webp'), processed.thumb)
    const { rows } = await db.query<MediaRow>(
      `INSERT INTO media (original_name, dir, mime, ext, size_bytes, width, height, alt, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${MEDIA_SELECT}`,
      [
        file.originalName.slice(0, 200),
        dir,
        processed.mime,
        processed.ext,
        processed.original.length,
        processed.width,
        processed.height,
        (opts.alt.trim() || deriveAlt(file.originalName)).slice(0, 200),
        opts.createdBy,
      ],
    )
    return rows[0]
  } catch (error) {
    await rm(absolute, { recursive: true, force: true })
    throw error
  }
}

export async function getMedia(db: Queryable, id: number): Promise<MediaRow | null> {
  const { rows } = await db.query<MediaRow>(`SELECT ${MEDIA_SELECT} FROM media WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function mediaUsage(db: Queryable, id: number): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT (SELECT count(*) FROM prompts WHERE example_media_id = $1)::int
          + (SELECT count(*) FROM prompt_steps WHERE example_media_id = $1)::int AS n`,
    [id],
  )
  return rows[0].n
}

export async function listMedia(
  db: Queryable,
  opts: { limit: number; offset: number },
): Promise<{ rows: (MediaRow & { usageCount: number })[]; total: number }> {
  const [list, count] = await Promise.all([
    db.query<MediaRow & { usageCount: number }>(
      `SELECT ${MEDIA_SELECT},
              ((SELECT count(*) FROM prompts p WHERE p.example_media_id = media.id)
             + (SELECT count(*) FROM prompt_steps s WHERE s.example_media_id = media.id))::int AS "usageCount"
         FROM media ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [opts.limit, opts.offset],
    ),
    db.query<{ n: number }>('SELECT count(*)::int AS n FROM media'),
  ])
  return { rows: list.rows, total: count.rows[0].n }
}

export async function updateAlt(db: Queryable, id: number, alt: string): Promise<void> {
  await db.query('UPDATE media SET alt = $2 WHERE id = $1', [id, alt.trim().slice(0, 200)])
}

export async function deleteMedia(
  db: Queryable,
  uploadsDir: string,
  id: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const row = await getMedia(db, id)
  if (!row) return { ok: false, reason: 'Image not found.' }
  const used = await mediaUsage(db, id)
  if (used > 0) return { ok: false, reason: `${used} prompt(s) or steps still use this image. Remove it from them first.` }
  await db.query('DELETE FROM media WHERE id = $1', [id])
  await rm(safeResolve(uploadsDir, row.dir), { recursive: true, force: true })
  return { ok: true }
}
