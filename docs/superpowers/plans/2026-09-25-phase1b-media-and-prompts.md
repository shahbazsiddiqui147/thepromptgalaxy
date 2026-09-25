# Phase 1B — Media Library and Prompts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a media library with an inline image uploader and a full prompt admin (single and chain prompts, tools with primary and fit, styles, FAQs, similar prompts, rich-text article, SEO, draft/publish/archive) whose tool and style pickers only offer choices that are valid for the chosen category.

**Architecture:** Images are validated and re-encoded with `sharp` into three files (original, 800px card, 400px thumb) stored under `UPLOADS_DIR`, indexed in a `media` table, served by an immutable-cache route. Prompts are saved by one repository function inside a transaction: it replaces the child rows and lets the composite foreign keys from plan 1A reject invalid tool/style choices. The prompt form is one client component that posts its state as JSON; the server parses, validates, sanitizes and saves.

**Tech Stack:** Next.js 16 route handlers and server actions, `sharp`, `sanitize-html`, `pg`, Vitest, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-09-24-custom-cms-rebuild-design.md` (sections 5.3, 5.5, 7, 9)
**Builds on:** `docs/superpowers/plans/2026-09-24-phase1a-foundation-taxonomy-matrix.md` (implemented on branch `rebuild/custom-cms`)

## Decisions made in this plan

- Media variants are not stored in a JSON column; the three files have fixed names inside the media row's directory.
- Only JPEG, PNG and WebP uploads are accepted (12 MB, 8000 px). GIF, SVG and AVIF are rejected on purpose (SVG can carry scripts).
- Uploads go through a route handler (`POST /admin/media/upload/`) with a same-origin check, not a server action, so large files work without changing the server-action body limit.
- The article editor is a small `contenteditable` editor whose output is sanitized on the server with `sanitize-html`.
- Prompts can only be deleted while `draft` or `archived`. A published prompt must be archived first.
- Choosing an existing image from the library is not part of this plan; uploading, replacing and removing are. The library page manages alt text and deletion.
- `pending` and `rejected` statuses exist in the database but are used by the moderation plan (Phase 2), not here.

## Out of scope

Public pages, search index, submissions and moderation, category/tool icons, "pick from library" dialog.

## Conventions

- Branch `rebuild/custom-cms`, main working folder `F:/Shahbaz/thepromptgalaxy`, Git Bash commands from that folder.
- Database tests need the dev tunnel: `ssh -i ~/.ssh/id_ed25519 -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -N -L 5434:127.0.0.1:5432 root@46.250.239.74` running in the background (check with `netstat -an | grep 5434`). Each DB test takes about 5-8 seconds because of the tunnel; run single files while iterating.
- Every commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (second `-m`).
- New files with SQL apostrophes or `$$` are written with the file-writing tool, not shell heredocs.

## File structure

```
package.json                        + sanitize-html, @types/sanitize-html
src/lib/uploads-dir.ts, origin.ts, sanitize.ts (+ tests)
src/db/migrations/0005_media.sql, 0006_prompt_content.sql
src/db/prompt-content.test.ts
src/media/process.ts, storage.ts (+ tests)
src/app/admin/media/upload/route.ts
src/app/media/[id]/[variant]/route.ts
src/app/admin/media/page.tsx, actions.ts
src/app/admin/_components/MediaField.tsx, RichTextField.tsx
src/prompts/types.ts, input.ts, repo.ts (+ tests)
src/app/admin/prompts/page.tsx, actions.ts, PromptForm.tsx, new/page.tsx, [id]/page.tsx
src/styles/admin.css (additions), src/app/admin/layout.tsx (nav)
```

---

### Task 1: Dependencies and uploads directory helper

**Files:**
- Modify: `package.json`, `.env.example`
- Create: `src/lib/uploads-dir.ts`

- [ ] **Step 1: Add the sanitizer**

```bash
pnpm add sanitize-html
pnpm add -D @types/sanitize-html
```
Expected: both commands end with `Done in ...`.

- [ ] **Step 2: Write `src/lib/uploads-dir.ts`**

```ts
import path from 'node:path'

/** Where uploaded images live. Defaults to ./uploads next to the app; override with UPLOADS_DIR. */
export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve('uploads')
}
```

- [ ] **Step 3: Document it in `.env.example`**

Append:

```
# Optional. Where uploaded images are stored (default: ./uploads).
# UPLOADS_DIR=/opt/apps/thepromptgalaxy/uploads
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add package.json pnpm-lock.yaml .env.example src/lib/uploads-dir.ts
git commit -m "chore: add sanitize-html and an uploads directory helper" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: typecheck exits 0.

---

### Task 2: Media and prompt-content migrations (TDD)

**Files:**
- Create: `src/db/migrations/0005_media.sql`, `src/db/migrations/0006_prompt_content.sql`
- Test: `src/db/prompt-content.test.ts`

- [ ] **Step 1: Write the failing test `src/db/prompt-content.test.ts`**

```ts
import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Pool
let categoryId: number
let promptId: number

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

async function makeMedia(dir: string): Promise<number> {
  return one(
    `INSERT INTO media (original_name, dir, mime, ext, size_bytes, width, height)
     VALUES ('a.png', $1, 'image/png', 'png', 100, 10, 10) RETURNING id`,
    [dir],
  )
}

beforeEach(async () => {
  pool = await resetDb()
  categoryId = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  promptId = await one(`INSERT INTO prompts (slug, title, category_id) VALUES ('p1', 'P1', $1) RETURNING id`, [categoryId])
})
afterAll(closeTestPool)

describe('media', () => {
  it('sets prompts.example_media_id to null when the media row is deleted', async () => {
    const mediaId = await makeMedia('2026-09/aaa')
    await pool.query('UPDATE prompts SET example_media_id = $1 WHERE id = $2', [mediaId, promptId])
    await pool.query('DELETE FROM media WHERE id = $1', [mediaId])
    const { rows } = await pool.query('SELECT example_media_id FROM prompts WHERE id = $1', [promptId])
    expect(rows[0].example_media_id).toBeNull()
  })

  it('requires a unique directory per media row', async () => {
    await makeMedia('2026-09/same')
    await expect(makeMedia('2026-09/same')).rejects.toMatchObject({ code: '23505' })
  })
})

describe('prompt steps, faqs and similar prompts', () => {
  it('keeps one step per position and cascades when the prompt is deleted', async () => {
    await pool.query(`INSERT INTO prompt_steps (prompt_id, position, label, text) VALUES ($1, 0, 'Base', 'text')`, [promptId])
    await expect(
      pool.query(`INSERT INTO prompt_steps (prompt_id, position, label, text) VALUES ($1, 0, 'Dup', 'text')`, [promptId]),
    ).rejects.toMatchObject({ code: '23505' })
    await pool.query('DELETE FROM prompts WHERE id = $1', [promptId])
    const { rows } = await pool.query('SELECT 1 FROM prompt_steps')
    expect(rows).toHaveLength(0)
  })

  it('stores faqs in order', async () => {
    await pool.query(`INSERT INTO prompt_faqs (prompt_id, position, question, answer) VALUES ($1, 1, 'Q2', 'A2'), ($1, 0, 'Q1', 'A1')`, [promptId])
    const { rows } = await pool.query('SELECT question FROM prompt_faqs WHERE prompt_id = $1 ORDER BY position', [promptId])
    expect(rows.map((r) => r.question)).toEqual(['Q1', 'Q2'])
  })

  it('rejects a prompt that lists itself as similar', async () => {
    await expect(
      pool.query('INSERT INTO similar_prompts (prompt_id, similar_id) VALUES ($1, $1)', [promptId]),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('links two prompts and removes the link when either is deleted', async () => {
    const other = await one(`INSERT INTO prompts (slug, title, category_id) VALUES ('p2', 'P2', $1) RETURNING id`, [categoryId])
    await pool.query('INSERT INTO similar_prompts (prompt_id, similar_id, position) VALUES ($1, $2, 0)', [promptId, other])
    await pool.query('DELETE FROM prompts WHERE id = $1', [other])
    const { rows } = await pool.query('SELECT 1 FROM similar_prompts')
    expect(rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/db/prompt-content.test.ts
```
Expected: FAIL — `relation "media" does not exist`.

- [ ] **Step 3: Write `src/db/migrations/0005_media.sql`**

```sql
CREATE TABLE media (
  id bigserial PRIMARY KEY,
  original_name text NOT NULL,
  -- Directory under the uploads dir, e.g. 2026-09/3f9c...; holds original.<ext>, card.webp and thumb.webp.
  dir text NOT NULL UNIQUE,
  mime text NOT NULL,
  ext text NOT NULL,
  size_bytes integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt text NOT NULL DEFAULT '',
  created_by bigint REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prompts ADD COLUMN example_media_id bigint REFERENCES media (id) ON DELETE SET NULL;
CREATE INDEX prompts_example_media_idx ON prompts (example_media_id);
```

- [ ] **Step 4: Write `src/db/migrations/0006_prompt_content.sql`**

```sql
CREATE TABLE prompt_steps (
  prompt_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  position integer NOT NULL,
  label text NOT NULL DEFAULT '',
  text text NOT NULL,
  example_media_id bigint REFERENCES media (id) ON DELETE SET NULL,
  PRIMARY KEY (prompt_id, position)
);
CREATE INDEX prompt_steps_media_idx ON prompt_steps (example_media_id);

CREATE TABLE prompt_faqs (
  prompt_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  position integer NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  PRIMARY KEY (prompt_id, position)
);

CREATE TABLE similar_prompts (
  prompt_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  similar_id bigint NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (prompt_id, similar_id),
  CHECK (prompt_id <> similar_id)
);
```

- [ ] **Step 5: Run to verify it passes, apply to dev, commit**

```bash
pnpm test src/db/prompt-content.test.ts
pnpm migrate
git add src/db
git commit -m "feat(db): add media, prompt steps, FAQs and similar-prompt tables" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: 5 tests pass; `Applied: 0005_media.sql, 0006_prompt_content.sql`.

---

### Task 3: Same-origin check (TDD)

**Files:**
- Create: `src/lib/origin.ts`
- Test: `src/lib/origin.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/origin.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { isSameOrigin } from '@/lib/origin'

describe('isSameOrigin', () => {
  it('accepts an origin whose host equals the Host header', () => {
    expect(isSameOrigin('https://thepromptgalaxy.com', 'thepromptgalaxy.com')).toBe(true)
    expect(isSameOrigin('http://localhost:3000', 'localhost:3000')).toBe(true)
  })
  it('rejects a different host or port', () => {
    expect(isSameOrigin('https://evil.example', 'thepromptgalaxy.com')).toBe(false)
    expect(isSameOrigin('http://localhost:3001', 'localhost:3000')).toBe(false)
  })
  it('rejects missing headers and malformed origins', () => {
    expect(isSameOrigin(null, 'thepromptgalaxy.com')).toBe(false)
    expect(isSameOrigin('https://thepromptgalaxy.com', null)).toBe(false)
    expect(isSameOrigin('not a url', 'thepromptgalaxy.com')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `src/lib/origin.ts`**

```bash
pnpm test src/lib/origin.test.ts
```
Expected: FAIL — cannot resolve `@/lib/origin`.

```ts
/** CSRF guard for route handlers: the Origin header must name the same host the request was sent to. */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
```

- [ ] **Step 3: Run to verify it passes and commit**

```bash
pnpm test src/lib/origin.test.ts
git add src/lib/origin.ts src/lib/origin.test.ts
git commit -m "feat: add same-origin check for route handlers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: 3 tests pass.

---

### Task 4: Image processing (TDD)

**Files:**
- Create: `src/media/process.ts`
- Test: `src/media/process.test.ts`

- [ ] **Step 1: Write the failing test `src/media/process.test.ts`**

```ts
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ImageError, MAX_UPLOAD_BYTES, processImage } from '@/media/process'

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#ff0000' } }).png().toBuffer()
}

describe('processImage', () => {
  it('re-encodes a PNG and produces card (800px) and thumb (400px) webp variants', async () => {
    const result = await processImage(await png(1200, 600))
    expect(result).toMatchObject({ ext: 'png', mime: 'image/png', width: 1200, height: 600 })
    expect((await sharp(result.card).metadata()).width).toBe(800)
    expect((await sharp(result.card).metadata()).format).toBe('webp')
    expect((await sharp(result.thumb).metadata()).width).toBe(400)
  })

  it('never enlarges a small image', async () => {
    const result = await processImage(await png(100, 50))
    expect((await sharp(result.card).metadata()).width).toBe(100)
    expect((await sharp(result.thumb).metadata()).width).toBe(100)
  })

  it('accepts JPEG and WebP', async () => {
    const jpeg = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#00ff00' } }).jpeg().toBuffer()
    const webp = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#0000ff' } }).webp().toBuffer()
    expect((await processImage(jpeg)).ext).toBe('jpg')
    expect((await processImage(webp)).ext).toBe('webp')
  })

  it('rejects text that is not an image', async () => {
    await expect(processImage(Buffer.from('hello world'))).rejects.toBeInstanceOf(ImageError)
  })

  it('rejects SVG because it can carry scripts', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
    await expect(processImage(svg)).rejects.toThrow(/JPEG, PNG or WebP/)
  })

  it('rejects an empty file and an oversized file before decoding', async () => {
    await expect(processImage(Buffer.alloc(0))).rejects.toThrow(/empty/)
    await expect(processImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/12 MB/)
  })

  it('rejects an image with a side longer than 8000 px', async () => {
    await expect(processImage(await png(8001, 10))).rejects.toThrow(/8000/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/media/process.test.ts
```
Expected: FAIL — cannot resolve `@/media/process`.

- [ ] **Step 3: Write `src/media/process.ts`**

```ts
import sharp from 'sharp'

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
export const MAX_DIMENSION = 8000

const FORMATS: Record<string, { ext: 'jpg' | 'png' | 'webp'; mime: string }> = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
}

export class ImageError extends Error {}

export type ProcessedImage = {
  ext: 'jpg' | 'png' | 'webp'
  mime: string
  width: number
  height: number
  original: Buffer
  card: Buffer
  thumb: Buffer
}

/**
 * Validates an uploaded image and re-encodes it. Re-encoding drops metadata (EXIF, GPS) and anything
 * that is not pixel data; the EXIF orientation is applied first so the image is stored upright.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError('The file is empty.')
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError('The image is larger than 12 MB.')

  let format: string | undefined
  try {
    format = (await sharp(input).metadata()).format
  } catch {
    throw new ImageError('That file is not a supported image.')
  }
  const kind = format ? FORMATS[format] : undefined
  if (!kind) throw new ImageError('Use a JPEG, PNG or WebP image.')

  const upright = () => sharp(input).rotate()

  let originalPipeline = upright()
  if (kind.ext === 'jpg') originalPipeline = originalPipeline.jpeg({ quality: 88, mozjpeg: true })
  else if (kind.ext === 'png') originalPipeline = originalPipeline.png({ compressionLevel: 9 })
  else originalPipeline = originalPipeline.webp({ quality: 88 })
  const original = await originalPipeline.toBuffer()

  const { width = 0, height = 0 } = await sharp(original).metadata()
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new ImageError('The image is larger than 8000 pixels on one side.')
  }

  const card = await upright().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  const thumb = await upright().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()

  return { ext: kind.ext, mime: kind.mime, width, height, original, card, thumb }
}
```

- [ ] **Step 4: Run to verify it passes and commit**

```bash
pnpm test src/media/process.test.ts
git add src/media/process.ts src/media/process.test.ts
git commit -m "feat(media): validate and re-encode uploaded images with card and thumb variants" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: 7 tests pass.

---

### Task 5: Media storage and repository (TDD)

**Files:**
- Create: `src/media/storage.ts`
- Test: `src/media/storage.test.ts`

- [ ] **Step 1: Write the failing test `src/media/storage.test.ts`**

```ts
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
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
import { ImageError } from '@/media/process'
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/media/storage.test.ts
```
Expected: FAIL — cannot resolve `@/media/storage`.

- [ ] **Step 3: Write `src/media/storage.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes and commit**

```bash
pnpm test src/media/storage.test.ts
pnpm typecheck
git add src/media
git commit -m "feat(media): add upload storage, listing, alt editing and guarded deletion" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: 10 tests pass (1 + 3 + 4 + 1... counting each `it`: deriveAlt 1, saveUpload 3, list/alt/delete 4, safeResolve 1 = 9 — expect 9 passed), typecheck exits 0.

---

### Task 6: Upload and serving routes, media library screen, MediaField

**Files:**
- Create: `src/app/admin/media/upload/route.ts`, `src/app/media/[id]/[variant]/route.ts`, `src/app/admin/media/page.tsx`, `src/app/admin/media/actions.ts`, `src/app/admin/_components/MediaField.tsx`
- Modify: `src/styles/admin.css`, `src/app/admin/layout.tsx`

- [ ] **Step 1: Write `src/app/admin/media/upload/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getPool } from '@/db/pool'
import { getCurrentUser } from '@/lib/current-user'
import { isSameOrigin } from '@/lib/origin'
import { getUploadsDir } from '@/lib/uploads-dir'
import { ImageError } from '@/media/process'
import { saveUpload } from '@/media/storage'

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get('origin'), request.headers.get('host'))) {
    return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })

  try {
    const row = await saveUpload(
      getPool(),
      getUploadsDir(),
      { buffer: Buffer.from(await file.arrayBuffer()), originalName: file.name },
      { alt: String(form.get('alt') ?? ''), createdBy: user.id },
    )
    return NextResponse.json({ id: row.id, alt: row.alt, width: row.width, height: row.height })
  } catch (error) {
    if (error instanceof ImageError) return NextResponse.json({ error: error.message }, { status: 422 })
    throw error
  }
}
```

- [ ] **Step 2: Write `src/app/media/[id]/[variant]/route.ts`**

```ts
import { readFile } from 'node:fs/promises'
import { getPool } from '@/db/pool'
import { getUploadsDir } from '@/lib/uploads-dir'
import { getMedia, isVariant, safeResolve, variantFile } from '@/media/storage'

const notFound = () => new Response('Not found', { status: 404 })

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; variant: string }> }) {
  const { id, variant } = await params
  const mediaId = Number(id)
  if (!Number.isInteger(mediaId) || !isVariant(variant)) return notFound()

  const row = await getMedia(getPool(), mediaId)
  if (!row) return notFound()

  try {
    const data = await readFile(safeResolve(getUploadsDir(), variantFile(row, variant)))
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': variant === 'original' ? row.mime : 'image/webp',
        // A media id never changes its pixels (replacing an image creates a new id), so this is safe to cache forever.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return notFound()
  }
}
```

- [ ] **Step 3: Write `src/app/admin/media/actions.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getUploadsDir } from '@/lib/uploads-dir'
import { deleteMedia, updateAlt } from '@/media/storage'

const MEDIA_ROLES = ['admin', 'editor'] as const

export async function updateAltAction(formData: FormData): Promise<void> {
  await requireUser(MEDIA_ROLES)
  const id = Number(formData.get('id'))
  if (Number.isInteger(id)) await updateAlt(getPool(), id, String(formData.get('alt') ?? ''))
  redirect('/admin/media/?saved=1')
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await requireUser(MEDIA_ROLES)
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) redirect('/admin/media/?error=Invalid%20image.')
  const result = await deleteMedia(getPool(), getUploadsDir(), id)
  redirect(result.ok ? '/admin/media/?saved=1' : `/admin/media/?error=${encodeURIComponent(result.reason)}`)
}
```

- [ ] **Step 4: Write `src/app/admin/media/page.tsx`**

```tsx
import Link from 'next/link'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { listMedia } from '@/media/storage'
import { deleteMediaAction, updateAltAction } from './actions'

const PAGE_SIZE = 24

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; saved?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { page, error, saved } = await searchParams
  const current = Math.max(1, Number(page) || 1)
  const { rows, total } = await listMedia(getPool(), { limit: PAGE_SIZE, offset: (current - 1) * PAGE_SIZE })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="admin-head">
        <h1>Media</h1>
        <span>{total} image(s). Upload images from the prompt form.</span>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {saved ? <div className="banner">Saved.</div> : null}
      <div className="media-grid">
        {rows.map((row) => (
          <div key={row.id} className="media-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/media/${row.id}/thumb/`} alt={row.alt} width={200} height={140} />
            <div className="field-help">
              {row.width}×{row.height} · {row.usageCount} use(s)
            </div>
            <form action={updateAltAction} className="form-grid">
              <input type="hidden" name="id" value={row.id} />
              <input name="alt" className="input" defaultValue={row.alt} maxLength={200} aria-label="Alt text" />
              <div className="actions">
                <button className="btn btn-secondary" type="submit">
                  Save alt
                </button>
              </div>
            </form>
            <form action={deleteMediaAction} className="inline-form">
              <input type="hidden" name="id" value={row.id} />
              <button className="btn btn-ghost" type="submit">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
      {pages > 1 ? (
        <nav className="tabs">
          {current > 1 ? <Link href={`/admin/media/?page=${current - 1}`}>← Newer</Link> : null}
          <span>
            Page {current} of {pages}
          </span>
          {current < pages ? <Link href={`/admin/media/?page=${current + 1}`}>Older →</Link> : null}
        </nav>
      ) : null}
    </>
  )
}
```

- [ ] **Step 5: Write `src/app/admin/_components/MediaField.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'

type Props = {
  label: string
  value: number | null
  onChange: (id: number | null) => void
}

export function MediaField({ label, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  async function upload(file: File) {
    setError(null)
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const response = await fetch('/admin/media/upload/', { method: 'POST', body, credentials: 'same-origin' })
      const data = (await response.json().catch(() => ({}))) as { id?: number; error?: string }
      if (!response.ok || !data.id) throw new Error(data.error ?? 'Upload failed.')
      onChange(data.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className="media-field">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/media/${value}/thumb/`} alt="" width={96} height={96} />
          <div className="actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => input.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onChange(null)}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone${drag ? ' dropzone-active' : ''}`}
          onClick={() => !busy && input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDrag(false)
            const file = event.dataTransfer.files?.[0]
            if (file && !busy) void upload(file)
          }}
        >
          {busy ? 'Uploading…' : 'Click to upload, or drag and drop an image here'}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}
```

- [ ] **Step 6: Append styles to `src/styles/admin.css`**

```css
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}
.media-card {
  border: 2px solid var(--color-text);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}
.media-card img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  background: var(--color-surface);
}
.media-field {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}
.media-field img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border: 2px solid var(--color-text);
}
.dropzone {
  border: 2px dashed var(--color-neutral-500);
  padding: var(--space-6) var(--space-4);
  text-align: center;
  color: var(--color-neutral-700);
  cursor: pointer;
}
.dropzone-active {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
}
```

- [ ] **Step 7: Add the Media link to the admin sidebar**

In `src/app/admin/layout.tsx`, after the line `{canEditTaxonomy ? <Link href="/admin/matrix/">Relations matrix</Link> : null}` add:

```tsx
        {canEditTaxonomy ? <Link href="/admin/media/">Media</Link> : null}
```

- [ ] **Step 8: Typecheck, commit**

```bash
pnpm typecheck
git add src/app src/styles
git commit -m "feat(media): add upload and serving routes, media library screen and inline image field" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: typecheck exits 0.

---

### Task 7: Rich-text sanitizer (TDD)

**Files:**
- Create: `src/lib/sanitize.ts`
- Test: `src/lib/sanitize.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/sanitize.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from '@/lib/sanitize'

describe('sanitizeRichText', () => {
  it('keeps basic formatting', () => {
    expect(sanitizeRichText('<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em></p><ul><li>a</li></ul>')).toBe(
      '<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em></p><ul><li>a</li></ul>',
    )
  })

  it('removes scripts, event handlers and iframes', () => {
    const dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script><iframe src="https://evil.example"></iframe>'
    expect(sanitizeRichText(dirty)).toBe('<p>Hi</p>')
  })

  it('drops javascript: links but keeps safe links and adds rel', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
    const safe = sanitizeRichText('<a href="https://example.com" target="_blank">x</a>')
    expect(safe).toContain('href="https://example.com"')
    expect(safe).toContain('rel="noopener noreferrer nofollow"')
  })

  it('converts b and i to strong and em', () => {
    expect(sanitizeRichText('<p><b>a</b><i>b</i></p>')).toBe('<p><strong>a</strong><em>b</em></p>')
  })

  it('strips unknown tags but keeps their text', () => {
    expect(sanitizeRichText('<div><span>hello</span></div>')).toBe('hello')
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `src/lib/sanitize.ts`**

```bash
pnpm test src/lib/sanitize.test.ts
```
Expected: FAIL — cannot resolve `@/lib/sanitize`.

```ts
import sanitizeHtml from 'sanitize-html'

/** Allow-list sanitizer for admin-authored rich text (article bodies). */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      b: 'strong',
      i: 'em',
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer nofollow',
          ...(attribs.target ? { target: '_blank' } : {}),
        },
      }),
    },
  }).trim()
}
```

- [ ] **Step 3: Run to verify it passes and commit**

```bash
pnpm test src/lib/sanitize.test.ts
git add src/lib/sanitize.ts src/lib/sanitize.test.ts
git commit -m "feat: add allow-list sanitizer for rich text" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: 5 tests pass. If the `<a href="javascript:...">` case yields `<a rel="noopener noreferrer nofollow">x</a>`, change the expected string in that test to match, because the rule being tested is that the `href` is removed.

---

### Task 8: Prompt types, input parsing and publish rules (TDD)

**Files:**
- Create: `src/prompts/types.ts`, `src/prompts/input.ts`
- Test: `src/prompts/input.test.ts`

- [ ] **Step 1: Write `src/prompts/types.ts`** (pure types and constants, safe to import from client components)

```ts
export const PROMPT_STATUSES = ['draft', 'published', 'archived'] as const
export type PromptStatus = (typeof PROMPT_STATUSES)[number]

export const LIMITS = {
  title: 140,
  summary: 300,
  promptText: 8000,
  stepLabel: 80,
  faqQuestion: 300,
  faqAnswer: 2000,
  quickAnswer: 600,
  article: 60000,
  seoTitle: 120,
  seoDescription: 300,
  referenceNote: 200,
  steps: 12,
  tools: 30,
  styles: 30,
  faqs: 20,
  similar: 12,
} as const

export type PromptToolInput = { toolId: number; fit: 'great' | 'good'; isPrimary: boolean }
export type PromptStepInput = { label: string; text: string; exampleMediaId: number | null }
export type PromptFaqInput = { question: string; answer: string }

export type PromptInput = {
  title: string
  /** Empty means "generate from the title" (or keep the current one). */
  slug: string
  summary: string
  /** 0 means "not chosen yet". */
  categoryId: number
  isChain: boolean
  promptText: string
  steps: PromptStepInput[]
  isPremium: boolean
  referenceRequired: boolean
  referenceNote: string
  exampleMediaId: number | null
  quickAnswer: string
  articleHtml: string
  tools: PromptToolInput[]
  styleIds: number[]
  faqs: PromptFaqInput[]
  similarIds: number[]
  seoTitle: string
  seoDescription: string
  status: PromptStatus
  /** Editing the slug of an already published prompt changes its public URL; this must be ticked on purpose. */
  changePublishedSlug: boolean
}

export type PromptFormState = { errors: Record<string, string> }

export function emptyPrompt(): PromptInput {
  return {
    title: '',
    slug: '',
    summary: '',
    categoryId: 0,
    isChain: false,
    promptText: '',
    steps: [],
    isPremium: false,
    referenceRequired: false,
    referenceNote: '',
    exampleMediaId: null,
    quickAnswer: '',
    articleHtml: '',
    tools: [],
    styleIds: [],
    faqs: [],
    similarIds: [],
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    changePublishedSlug: false,
  }
}
```

- [ ] **Step 2: Write the failing test `src/prompts/input.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { parsePromptPayload, publishProblems } from '@/prompts/input'
import { emptyPrompt, type PromptInput } from '@/prompts/types'

const valid = {
  ...emptyPrompt(),
  title: 'Studio headshot, 85mm',
  summary: 'Clean three-point lighting.',
  categoryId: 3,
  promptText: 'Use the attached photo as reference.',
  exampleMediaId: 9,
  tools: [{ toolId: 1, fit: 'great', isPrimary: true }],
}

function parse(overrides: Record<string, unknown> = {}) {
  return parsePromptPayload({ ...valid, ...overrides })
}

describe('parsePromptPayload', () => {
  it('accepts a valid single prompt and trims text', () => {
    const result = parse({ title: '  Studio headshot  ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBe('Studio headshot')
  })

  it('requires a title and a category', () => {
    const result = parse({ title: '  ', categoryId: 0 })
    expect(result).toEqual({ ok: false, errors: { title: 'Required', categoryId: 'Choose a category' } })
  })

  it('validates the slug format and text lengths', () => {
    const result = parse({ slug: 'Not A Slug', summary: 'x'.repeat(301) })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.slug).toMatch(/lower-case/)
      expect(result.errors.summary).toMatch(/at most 300/)
    }
  })

  it('marks the first tool primary when none is, and keeps only one primary', () => {
    const none = parse({ tools: [{ toolId: 1, fit: 'good' }, { toolId: 2, fit: 'good' }] })
    const two = parse({ tools: [{ toolId: 1, isPrimary: true }, { toolId: 2, isPrimary: true }] })
    expect(none.ok && none.value.tools.map((t) => t.isPrimary)).toEqual([true, false])
    expect(two.ok && two.value.tools.map((t) => t.isPrimary)).toEqual([true, false])
  })

  it('removes duplicate tools and ignores invalid ids', () => {
    const result = parse({ tools: [{ toolId: 1 }, { toolId: 1 }, { toolId: 'x' }, { toolId: -3 }] })
    expect(result.ok && result.value.tools.map((t) => t.toolId)).toEqual([1])
  })

  it('drops the single prompt text for chains and requires text in every step', () => {
    const chain = parse({ isChain: true, promptText: 'ignored', steps: [{ text: 'one' }, { text: 'two', label: 'Grade' }] })
    expect(chain.ok && chain.value.promptText).toBe('')
    expect(chain.ok && chain.value.steps).toHaveLength(2)
    const bad = parse({ isChain: true, steps: [{ text: 'one' }, { text: '  ' }] })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors.steps).toMatch(/every step/i)
  })

  it('clears steps for a single prompt', () => {
    const result = parse({ isChain: false, steps: [{ text: 'stray' }] })
    expect(result.ok && result.value.steps).toEqual([])
  })

  it('drops blank FAQs but rejects half-filled ones', () => {
    const ok = parse({ faqs: [{ question: '', answer: '' }, { question: 'Q?', answer: 'A.' }] })
    expect(ok.ok && ok.value.faqs).toEqual([{ question: 'Q?', answer: 'A.' }])
    const bad = parse({ faqs: [{ question: 'Q?', answer: '' }] })
    expect(bad.ok).toBe(false)
  })

  it('sanitizes the article', () => {
    const result = parse({ articleHtml: '<p>Hi</p><script>alert(1)</script>' })
    expect(result.ok && result.value.articleHtml).toBe('<p>Hi</p>')
  })

  it('falls back to draft for an unknown status and de-duplicates ids', () => {
    const result = parse({ status: 'weird', styleIds: [2, 2, 5], similarIds: [7, 7] })
    expect(result.ok && result.value.status).toBe('draft')
    expect(result.ok && result.value.styleIds).toEqual([2, 5])
    expect(result.ok && result.value.similarIds).toEqual([7])
  })

  it('treats non-object input as an empty form', () => {
    expect(parsePromptPayload('nope').ok).toBe(false)
  })
})

describe('publishProblems', () => {
  const base = (): PromptInput => ({ ...emptyPrompt(), ...valid, tools: [{ toolId: 1, fit: 'great', isPrimary: true }] }) as PromptInput

  it('is empty for a complete single prompt', () => {
    expect(publishProblems(base())).toEqual([])
  })

  it('lists every missing requirement', () => {
    const problems = publishProblems({ ...base(), summary: '', promptText: '', tools: [], exampleMediaId: null })
    expect(problems).toHaveLength(4)
    expect(problems.join(' ')).toMatch(/summary/i)
    expect(problems.join(' ')).toMatch(/prompt text/i)
    expect(problems.join(' ')).toMatch(/tool/i)
    expect(problems.join(' ')).toMatch(/example image/i)
  })

  it('needs at least two steps for a chain', () => {
    const chain = { ...base(), isChain: true, promptText: '', steps: [{ label: '', text: 'one', exampleMediaId: null }] }
    expect(publishProblems(chain).join(' ')).toMatch(/two steps/i)
    const ok = { ...chain, steps: [...chain.steps, { label: '', text: 'two', exampleMediaId: null }] }
    expect(publishProblems(ok)).toEqual([])
  })
})
```

- [ ] **Step 3: Run to verify it fails**

```bash
pnpm test src/prompts/input.test.ts
```
Expected: FAIL — cannot resolve `@/prompts/input`.

- [ ] **Step 4: Write `src/prompts/input.ts`**

```ts
import { sanitizeRichText } from '@/lib/sanitize'
import {
  LIMITS,
  PROMPT_STATUSES,
  type PromptFaqInput,
  type PromptInput,
  type PromptStatus,
  type PromptStepInput,
  type PromptToolInput,
} from '@/prompts/types'
import { SLUG_PATTERN } from '@/registry/validate'

export type ParseResult = { ok: true; value: PromptInput } | { ok: false; errors: Record<string, string> }

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

function items(value: unknown, max: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : []
}

function uniqueInts(value: unknown, max: number): number[] {
  const out: number[] = []
  for (const entry of items(value, max)) {
    const n = positiveInt(entry)
    if (n !== null && !out.includes(n)) out.push(n)
  }
  return out
}

export function parsePromptPayload(raw: unknown): ParseResult {
  const r = asRecord(raw)
  const errors: Record<string, string> = {}
  const limit = (field: string, value: string, max: number) => {
    if (value.length > max) errors[field] = `Must be at most ${max} characters`
  }

  const title = str(r.title)
  if (!title) errors.title = 'Required'
  limit('title', title, LIMITS.title)

  const slug = str(r.slug)
  if (slug && (slug.length > 80 || !SLUG_PATTERN.test(slug))) {
    errors.slug = 'Use lower-case letters, numbers and single hyphens'
  }

  const summary = str(r.summary)
  limit('summary', summary, LIMITS.summary)

  const categoryId = positiveInt(r.categoryId)
  if (!categoryId) errors.categoryId = 'Choose a category'

  const isChain = r.isChain === true
  const promptText = isChain ? '' : str(r.promptText)
  limit('promptText', promptText, LIMITS.promptText)

  const steps: PromptStepInput[] = isChain
    ? items(r.steps, LIMITS.steps).map((entry) => {
        const step = asRecord(entry)
        return { label: str(step.label), text: str(step.text), exampleMediaId: positiveInt(step.exampleMediaId) }
      })
    : []
  if (steps.some((step) => step.text === '' || step.text.length > LIMITS.promptText || step.label.length > LIMITS.stepLabel)) {
    errors.steps = `Every step needs prompt text (at most ${LIMITS.promptText} characters) and a label of at most ${LIMITS.stepLabel}.`
  }

  const tools: PromptToolInput[] = []
  for (const entry of items(r.tools, LIMITS.tools)) {
    const tool = asRecord(entry)
    const toolId = positiveInt(tool.toolId)
    if (toolId === null || tools.some((t) => t.toolId === toolId)) continue
    tools.push({ toolId, fit: tool.fit === 'great' ? 'great' : 'good', isPrimary: tool.isPrimary === true })
  }
  const primaryIndex = tools.findIndex((t) => t.isPrimary)
  tools.forEach((tool, index) => {
    tool.isPrimary = index === (primaryIndex === -1 ? 0 : primaryIndex)
  })

  const faqs: PromptFaqInput[] = []
  for (const entry of items(r.faqs, LIMITS.faqs)) {
    const faq = asRecord(entry)
    const question = str(faq.question)
    const answer = str(faq.answer)
    if (!question && !answer) continue
    if (!question || !answer || question.length > LIMITS.faqQuestion || answer.length > LIMITS.faqAnswer) {
      errors.faqs = 'Every FAQ needs a question and an answer of reasonable length.'
    }
    faqs.push({ question, answer })
  }

  const quickAnswer = str(r.quickAnswer)
  limit('quickAnswer', quickAnswer, LIMITS.quickAnswer)
  const articleHtml = sanitizeRichText(typeof r.articleHtml === 'string' ? r.articleHtml : '')
  limit('articleHtml', articleHtml, LIMITS.article)
  const referenceNote = str(r.referenceNote)
  limit('referenceNote', referenceNote, LIMITS.referenceNote)
  const seoTitle = str(r.seoTitle)
  limit('seoTitle', seoTitle, LIMITS.seoTitle)
  const seoDescription = str(r.seoDescription)
  limit('seoDescription', seoDescription, LIMITS.seoDescription)

  const status: PromptStatus = PROMPT_STATUSES.includes(r.status as PromptStatus) ? (r.status as PromptStatus) : 'draft'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      title,
      slug,
      summary,
      categoryId: categoryId as number,
      isChain,
      promptText,
      steps,
      isPremium: r.isPremium === true,
      referenceRequired: r.referenceRequired === true,
      referenceNote,
      exampleMediaId: positiveInt(r.exampleMediaId),
      quickAnswer,
      articleHtml,
      tools,
      styleIds: uniqueInts(r.styleIds, LIMITS.styles),
      faqs,
      similarIds: uniqueInts(r.similarIds, LIMITS.similar),
      seoTitle,
      seoDescription,
      status,
      changePublishedSlug: r.changePublishedSlug === true,
    },
  }
}

/** What a prompt still needs before it can be published. An empty list means it is ready. */
export function publishProblems(input: PromptInput): string[] {
  const problems: string[] = []
  if (!input.summary) problems.push('Add a summary.')
  if (input.isChain) {
    if (input.steps.length < 2) problems.push('A chain needs at least two steps.')
  } else if (!input.promptText) {
    problems.push('Add the prompt text.')
  }
  if (input.tools.length === 0) problems.push('Choose at least one tool.')
  if (input.exampleMediaId === null) problems.push('Upload an example image.')
  return problems
}
```

- [ ] **Step 5: Run to verify it passes and commit**

```bash
pnpm test src/prompts/input.test.ts
pnpm typecheck
git add src/prompts
git commit -m "feat(prompts): add prompt input types, payload parsing and publish rules" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: 14 tests pass (11 parse + 3 publish), typecheck exits 0.

---

### Task 9: Prompt repository (TDD)

**Files:**
- Create: `src/prompts/repo.ts`
- Test: `src/prompts/repo.test.ts`

- [ ] **Step 1: Write the failing test `src/prompts/repo.test.ts`**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/prompts/repo.test.ts
```
Expected: FAIL — cannot resolve `@/prompts/repo`.

- [ ] **Step 3: Write `src/prompts/repo.ts`**

```ts
import type { Queryable } from '@/db/pool'
import { isSlugTaken, slugify, uniqueSlug } from '@/lib/slug'
import { publishProblems } from '@/prompts/input'
import type { PromptInput, PromptStatus } from '@/prompts/types'
import { writeAudit } from '@/registry/audit'
import { recordSlugChange } from '@/registry/redirects'

export type PromptForEdit = PromptInput & { id: number; publishedAt: Date | null }
export type SavePromptResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> }
export type PromptListItem = {
  id: number
  title: string
  slug: string
  status: PromptStatus
  categoryName: string
  primaryToolName: string | null
  updatedAt: Date
}

const SLUG_TAKEN: SavePromptResult = { ok: false, errors: { slug: 'This slug is already in use.' } }

type PgError = { code?: string; constraint?: string; message?: string }

function mapWriteError(error: unknown): SavePromptResult | null {
  const e = error as PgError
  if (e.code === '23503') {
    const c = e.constraint ?? ''
    if (c.includes('prompt_tools')) return { ok: false, errors: { tools: 'One of the chosen tools is not available for this category.' } }
    if (c.includes('prompt_styles')) return { ok: false, errors: { styles: 'One of the chosen styles is not available for this category.' } }
    if (c.includes('similar')) return { ok: false, errors: { similar: 'A similar prompt no longer exists.' } }
    if (c.includes('media')) return { ok: false, errors: { exampleMediaId: 'An image no longer exists. Upload it again.' } }
    return { ok: false, errors: { _: 'A related record no longer exists. Reload the page and try again.' } }
  }
  if (e.code === '23514') return { ok: false, errors: { styles: e.message ?? 'This category does not support styles.' } }
  if (e.code === '23505' && (e.constraint ?? '').includes('slug')) return SLUG_TAKEN
  return null
}

/**
 * Creates (id = null) or updates a prompt and replaces its child rows. Call it inside a transaction:
 * on a returned error the caller's transaction must not be committed with partial work; because a failed
 * statement aborts the transaction, COMMIT then behaves as a rollback and nothing is stored.
 */
export async function savePrompt(
  db: Queryable,
  id: number | null,
  input: PromptInput,
  actorId: number | null,
): Promise<SavePromptResult> {
  if (input.status === 'published') {
    const problems = publishProblems(input)
    if (problems.length > 0) return { ok: false, errors: { _: `Cannot publish yet: ${problems.join(' ')}` } }
  }

  let existing: { slug: string; publishedAt: Date | null } | null = null
  if (id !== null) {
    const { rows } = await db.query<{ slug: string; publishedAt: Date | null }>(
      'SELECT slug, published_at AS "publishedAt" FROM prompts WHERE id = $1 FOR UPDATE',
      [id],
    )
    existing = rows[0] ?? null
    if (!existing) return { ok: false, errors: { _: 'Prompt not found.' } }
  }

  const locked = existing?.publishedAt != null
  let slug: string
  if (!existing) {
    if (input.slug) {
      if (await isSlugTaken(db, 'prompts', input.slug)) return SLUG_TAKEN
      slug = input.slug
    } else {
      slug = await uniqueSlug(db, 'prompts', slugify(input.title))
    }
  } else if (!locked) {
    slug = input.slug || existing.slug
    if (slug !== existing.slug && (await isSlugTaken(db, 'prompts', slug, id))) return SLUG_TAKEN
  } else if (input.changePublishedSlug && input.slug && input.slug !== existing.slug) {
    if (await isSlugTaken(db, 'prompts', input.slug, id)) return SLUG_TAKEN
    slug = input.slug
  } else {
    slug = existing.slug
  }

  const row = [
    slug,
    input.title,
    input.summary,
    input.categoryId,
    input.promptText,
    input.isChain,
    input.isPremium,
    input.referenceRequired,
    input.referenceNote,
    input.exampleMediaId,
    input.quickAnswer,
    input.articleHtml,
    input.seoTitle,
    input.seoDescription,
    input.status,
  ]

  try {
    let promptId: number
    if (existing && id !== null) {
      // Tool and style rows carry the category id, so they go first; the new ones are inserted after the update.
      await db.query('DELETE FROM prompt_tools WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM prompt_styles WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM prompt_steps WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM prompt_faqs WHERE prompt_id = $1', [id])
      await db.query('DELETE FROM similar_prompts WHERE prompt_id = $1', [id])
      await db.query(
        `UPDATE prompts SET slug = $1, title = $2, summary = $3, category_id = $4, prompt_text = $5, is_chain = $6,
                is_premium = $7, reference_required = $8, reference_note = $9, example_media_id = $10,
                quick_answer = $11, article_html = $12, seo_title = $13, seo_description = $14, status = $15,
                published_at = CASE WHEN $15 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
                updated_at = now()
          WHERE id = $16`,
        [...row, id],
      )
      promptId = id
      if (locked && slug !== existing.slug) {
        await recordSlugChange(db, `/prompt/${existing.slug}/`, `/prompt/${slug}/`)
      }
    } else {
      const { rows } = await db.query<{ id: number }>(
        `INSERT INTO prompts (slug, title, summary, category_id, prompt_text, is_chain, is_premium, reference_required,
                reference_note, example_media_id, quick_answer, article_html, seo_title, seo_description, status,
                author_id, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                 CASE WHEN $15 = 'published' THEN now() ELSE NULL END)
         RETURNING id`,
        [...row, actorId],
      )
      promptId = rows[0].id
    }

    for (const tool of input.tools) {
      await db.query(
        'INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary, fit) VALUES ($1, $2, $3, $4, $5)',
        [promptId, input.categoryId, tool.toolId, tool.isPrimary, tool.fit],
      )
    }
    for (const styleId of input.styleIds) {
      await db.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [
        promptId,
        input.categoryId,
        styleId,
      ])
    }
    for (const [position, step] of input.steps.entries()) {
      await db.query(
        'INSERT INTO prompt_steps (prompt_id, position, label, text, example_media_id) VALUES ($1, $2, $3, $4, $5)',
        [promptId, position, step.label, step.text, step.exampleMediaId],
      )
    }
    for (const [position, faq] of input.faqs.entries()) {
      await db.query('INSERT INTO prompt_faqs (prompt_id, position, question, answer) VALUES ($1, $2, $3, $4)', [
        promptId,
        position,
        faq.question,
        faq.answer,
      ])
    }
    for (const [position, similarId] of input.similarIds.filter((s) => s !== promptId).entries()) {
      await db.query('INSERT INTO similar_prompts (prompt_id, similar_id, position) VALUES ($1, $2, $3)', [
        promptId,
        similarId,
        position,
      ])
    }

    await writeAudit(db, {
      userId: actorId,
      entity: 'prompts',
      entityId: promptId,
      action: existing ? 'update' : 'create',
      diff: { title: input.title, status: input.status, slug },
    })
    return { ok: true, id: promptId }
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

export async function getPromptForEdit(db: Queryable, id: number): Promise<PromptForEdit | null> {
  const { rows } = await db.query<PromptForEdit>(
    `SELECT id, slug, title, summary, category_id AS "categoryId", prompt_text AS "promptText", is_chain AS "isChain",
            is_premium AS "isPremium", reference_required AS "referenceRequired", reference_note AS "referenceNote",
            example_media_id AS "exampleMediaId", quick_answer AS "quickAnswer", article_html AS "articleHtml",
            seo_title AS "seoTitle", seo_description AS "seoDescription", status, published_at AS "publishedAt"
       FROM prompts WHERE id = $1`,
    [id],
  )
  const base = rows[0]
  if (!base) return null

  const [tools, styles, steps, faqs, similar] = await Promise.all([
    db.query<{ toolId: number; fit: 'great' | 'good'; isPrimary: boolean }>(
      `SELECT tool_id AS "toolId", fit, is_primary AS "isPrimary" FROM prompt_tools
        WHERE prompt_id = $1 ORDER BY is_primary DESC, tool_id`,
      [id],
    ),
    db.query<{ styleId: number }>('SELECT style_id AS "styleId" FROM prompt_styles WHERE prompt_id = $1 ORDER BY style_id', [id]),
    db.query<{ label: string; text: string; exampleMediaId: number | null }>(
      `SELECT label, text, example_media_id AS "exampleMediaId" FROM prompt_steps WHERE prompt_id = $1 ORDER BY position`,
      [id],
    ),
    db.query<{ question: string; answer: string }>(
      'SELECT question, answer FROM prompt_faqs WHERE prompt_id = $1 ORDER BY position',
      [id],
    ),
    db.query<{ similarId: number }>(
      'SELECT similar_id AS "similarId" FROM similar_prompts WHERE prompt_id = $1 ORDER BY position',
      [id],
    ),
  ])

  return {
    ...base,
    tools: tools.rows,
    styleIds: styles.rows.map((r) => r.styleId),
    steps: steps.rows,
    faqs: faqs.rows,
    similarIds: similar.rows.map((r) => r.similarId),
    changePublishedSlug: false,
  }
}

export async function listPrompts(
  db: Queryable,
  filters: { status?: string; categoryId?: number; q?: string; limit: number; offset: number },
): Promise<{ rows: PromptListItem[]; total: number }> {
  const escaped = filters.q ? filters.q.replace(/[\\%_]/g, '\\$&') : null
  const where = `WHERE ($1::text IS NULL OR p.status = $1)
                   AND ($2::bigint IS NULL OR p.category_id = $2)
                   AND ($3::text IS NULL OR p.title ILIKE '%' || $3 || '%')`
  const params = [filters.status ?? null, filters.categoryId ?? null, escaped]
  const [list, count] = await Promise.all([
    db.query<PromptListItem>(
      `SELECT p.id, p.title, p.slug, p.status, c.name AS "categoryName", t.name AS "primaryToolName",
              p.updated_at AS "updatedAt"
         FROM prompts p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN prompt_tools pt ON pt.prompt_id = p.id AND pt.is_primary
         LEFT JOIN tools t ON t.id = pt.tool_id
         ${where}
        ORDER BY p.updated_at DESC, p.id DESC LIMIT $4 OFFSET $5`,
      [...params, filters.limit, filters.offset],
    ),
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM prompts p ${where}`, params),
  ])
  return { rows: list.rows, total: count.rows[0].n }
}

export async function deletePrompt(
  db: Queryable,
  id: number,
  actorId: number | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { rows } = await db.query<{ status: PromptStatus }>('SELECT status FROM prompts WHERE id = $1', [id])
  if (!rows[0]) return { ok: false, reason: 'Prompt not found.' }
  if (rows[0].status !== 'draft' && rows[0].status !== 'archived') {
    return { ok: false, reason: 'Archive the prompt before deleting it.' }
  }
  await db.query('DELETE FROM prompts WHERE id = $1', [id])
  await writeAudit(db, { userId: actorId, entity: 'prompts', entityId: id, action: 'delete' })
  return { ok: true }
}

export async function similarCandidates(db: Queryable, excludeId: number | null): Promise<{ id: number; title: string }[]> {
  const { rows } = await db.query<{ id: number; title: string }>(
    `SELECT id, title FROM prompts WHERE status = 'published' AND ($1::bigint IS NULL OR id <> $1) ORDER BY title LIMIT 500`,
    [excludeId],
  )
  return rows
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/prompts/repo.test.ts
```
Expected: 18 tests pass (about 2 minutes). If the "refuses styles for a category that does not support them" test reports a different key than `styles`, the trigger error is being raised while inserting `prompt_styles`; confirm `mapWriteError` handles code `23514` and adjust only the expectation, not the rule.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add src/prompts
git commit -m "feat(prompts): add prompt repository with child-row replacement, slug locking, redirects and guarded deletion" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: typecheck exits 0.

---

### Task 10: Rich-text editor and prompt admin screens

**Files:**
- Create: `src/app/admin/_components/RichTextField.tsx`, `src/app/admin/prompts/actions.ts`, `src/app/admin/prompts/PromptForm.tsx`, `src/app/admin/prompts/page.tsx`, `src/app/admin/prompts/new/page.tsx`, `src/app/admin/prompts/[id]/page.tsx`
- Modify: `src/styles/admin.css`, `src/app/admin/layout.tsx`

- [ ] **Step 1: Write `src/app/admin/_components/RichTextField.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'

type Props = { label: string; value: string; onChange: (html: string) => void }

const BUTTONS: { label: string; command: string; arg?: string }[] = [
  { label: 'Bold', command: 'bold' },
  { label: 'Italic', command: 'italic' },
  { label: 'Heading', command: 'formatBlock', arg: '<h2>' },
  { label: 'Subheading', command: 'formatBlock', arg: '<h3>' },
  { label: 'Bullets', command: 'insertUnorderedList' },
  { label: 'Numbers', command: 'insertOrderedList' },
  { label: 'Paragraph', command: 'formatBlock', arg: '<p>' },
  { label: 'Clear', command: 'removeFormat' },
]

export function RichTextField({ label, value, onChange }: Props) {
  const editor = useRef<HTMLDivElement>(null)

  // Set the initial content once; afterwards the browser owns the editable area.
  useEffect(() => {
    if (editor.current) editor.current.innerHTML = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function run(command: string, arg?: string) {
    editor.current?.focus()
    document.execCommand(command, false, arg)
    onChange(editor.current?.innerHTML ?? '')
  }

  function addLink() {
    const url = window.prompt('Link address (https://…)')
    if (url) run('createLink', url)
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="rte-toolbar">
        {BUTTONS.map((button) => (
          <button
            key={button.label}
            type="button"
            className="btn btn-secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(button.command, button.arg)}
          >
            {button.label}
          </button>
        ))}
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>
          Link
        </button>
      </div>
      <div
        ref={editor}
        className="rte input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        onInput={() => onChange(editor.current?.innerHTML ?? '')}
      />
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/admin/prompts/actions.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { getPool, withTransaction } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { parsePromptPayload } from '@/prompts/input'
import { deletePrompt, savePrompt } from '@/prompts/repo'
import type { PromptFormState } from '@/prompts/types'

const PROMPT_ROLES = ['admin', 'editor'] as const

export async function savePromptAction(_previous: PromptFormState, formData: FormData): Promise<PromptFormState> {
  const user = await requireUser(PROMPT_ROLES)

  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get('payload') ?? ''))
  } catch {
    return { errors: { _: 'The form data could not be read. Reload the page and try again.' } }
  }
  const parsed = parsePromptPayload(raw)
  if (!parsed.ok) return { errors: parsed.errors }

  const idText = String(formData.get('__id') ?? '')
  const id = idText ? Number(idText) : null
  if (id !== null && !Number.isInteger(id)) return { errors: { _: 'Invalid prompt.' } }

  const result = await withTransaction(getPool(), (tx) => savePrompt(tx, id, parsed.value, user.id))
  if (!result.ok) return { errors: result.errors }
  redirect(`/admin/prompts/${result.id}/?saved=1`)
}

export async function deletePromptAction(formData: FormData): Promise<void> {
  const user = await requireUser(PROMPT_ROLES)
  const id = Number(formData.get('__id'))
  if (!Number.isInteger(id)) redirect('/admin/prompts/?error=Invalid%20prompt.')
  const result = await withTransaction(getPool(), (tx) => deletePrompt(tx, id, user.id))
  redirect(result.ok ? '/admin/prompts/?saved=1' : `/admin/prompts/?error=${encodeURIComponent(result.reason)}`)
}
```

- [ ] **Step 3: Write `src/app/admin/prompts/PromptForm.tsx`**

```tsx
'use client'

import { useActionState, useMemo, useState } from 'react'
import { MediaField } from '@/app/admin/_components/MediaField'
import { RichTextField } from '@/app/admin/_components/RichTextField'
import { PROMPT_STATUSES, type PromptFormState, type PromptInput, type PromptToolInput } from '@/prompts/types'
import { savePromptAction } from './actions'

export type FormOptions = {
  categories: { id: number; name: string; isActive: boolean; supportsStyles: boolean }[]
  tools: { id: number; name: string; isActive: boolean }[]
  styles: { id: number; name: string; isActive: boolean }[]
  toolLinks: { categoryId: number; toolId: number }[]
  styleLinks: { categoryId: number; styleId: number }[]
  similar: { id: number; title: string }[]
}

type Props = {
  id?: number
  initial: PromptInput
  /** True once the prompt has been published: its URL is then locked unless changed on purpose. */
  slugLocked: boolean
  options: FormOptions
}

const initialState: PromptFormState = { errors: {} }

function normalizePrimary(tools: PromptToolInput[]): PromptToolInput[] {
  const index = tools.findIndex((tool) => tool.isPrimary)
  return tools.map((tool, i) => ({ ...tool, isPrimary: i === (index === -1 ? 0 : index) }))
}

export function PromptForm({ id, initial, slugLocked, options }: Props) {
  const [p, setP] = useState<PromptInput>(initial)
  const [notice, setNotice] = useState<string | null>(null)
  const [state, action, pending] = useActionState(savePromptAction, initialState)
  const errors = state.errors

  const update = (patch: Partial<PromptInput>) => setP((current) => ({ ...current, ...patch }))

  const category = options.categories.find((c) => c.id === p.categoryId)
  const validToolIds = useMemo(
    () => new Set(options.toolLinks.filter((l) => l.categoryId === p.categoryId).map((l) => l.toolId)),
    [options.toolLinks, p.categoryId],
  )
  const validStyleIds = useMemo(
    () => new Set(options.styleLinks.filter((l) => l.categoryId === p.categoryId).map((l) => l.styleId)),
    [options.styleLinks, p.categoryId],
  )

  function changeCategory(categoryId: number) {
    const tools = new Set(options.toolLinks.filter((l) => l.categoryId === categoryId).map((l) => l.toolId))
    const styles = new Set(options.styleLinks.filter((l) => l.categoryId === categoryId).map((l) => l.styleId))
    const target = options.categories.find((c) => c.id === categoryId)
    const keptTools = p.tools.filter((tool) => tools.has(tool.toolId))
    const keptStyles = target?.supportsStyles ? p.styleIds.filter((s) => styles.has(s)) : []
    const removed = p.tools.length - keptTools.length + (p.styleIds.length - keptStyles.length)
    setNotice(removed > 0 ? `${removed} tool/style choice(s) were removed because they are not available for this category.` : null)
    update({ categoryId, tools: normalizePrimary(keptTools), styleIds: keptStyles })
  }

  function toggleTool(toolId: number) {
    const has = p.tools.some((tool) => tool.toolId === toolId)
    const next = has
      ? p.tools.filter((tool) => tool.toolId !== toolId)
      : [...p.tools, { toolId, fit: 'good' as const, isPrimary: p.tools.length === 0 }]
    update({ tools: normalizePrimary(next) })
  }

  function patchTool(toolId: number, patch: Partial<PromptToolInput>) {
    update({ tools: p.tools.map((tool) => (tool.toolId === toolId ? { ...tool, ...patch } : tool)) })
  }

  function setPrimary(toolId: number) {
    update({ tools: p.tools.map((tool) => ({ ...tool, isPrimary: tool.toolId === toolId })) })
  }

  function moveStep(index: number, delta: number) {
    const steps = [...p.steps]
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    ;[steps[index], steps[target]] = [steps[target], steps[index]]
    update({ steps })
  }

  const visibleTools = options.tools.filter(
    (tool) => validToolIds.has(tool.id) && (tool.isActive || p.tools.some((t) => t.toolId === tool.id)),
  )
  const visibleStyles = options.styles.filter(
    (style) => validStyleIds.has(style.id) && (style.isActive || p.styleIds.includes(style.id)),
  )

  return (
    <form action={action} className="form-grid prompt-form">
      <input type="hidden" name="payload" value={JSON.stringify(p)} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}
      {errors._ ? <div className="banner banner-error">{errors._}</div> : null}

      <h2>Basics</h2>
      <div className="field">
        <label htmlFor="title">Title *</label>
        <input id="title" className="input" value={p.title} maxLength={140} onChange={(e) => update({ title: e.target.value })} />
        {errors.title ? <div className="field-error">{errors.title}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="slug">URL slug</label>
        <input
          id="slug"
          className="input"
          value={p.slug}
          placeholder="Generated from the title"
          disabled={slugLocked && !p.changePublishedSlug}
          onChange={(e) => update({ slug: e.target.value })}
        />
        {slugLocked ? (
          <label className="check">
            <input
              type="checkbox"
              checked={p.changePublishedSlug}
              onChange={(e) => update({ changePublishedSlug: e.target.checked })}
            />
            Change the published URL (the old address will redirect)
          </label>
        ) : (
          <div className="field-help">Editable until the prompt is first published.</div>
        )}
        {errors.slug ? <div className="field-error">{errors.slug}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="summary">Summary</label>
        <textarea id="summary" className="input" rows={2} value={p.summary} onChange={(e) => update({ summary: e.target.value })} />
        {errors.summary ? <div className="field-error">{errors.summary}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="category">Category *</label>
        <select id="category" className="input" value={p.categoryId} onChange={(e) => changeCategory(Number(e.target.value))}>
          <option value={0}>Choose a category…</option>
          {options.categories
            .filter((c) => c.isActive || c.id === p.categoryId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {errors.categoryId ? <div className="field-error">{errors.categoryId}</div> : null}
        {notice ? <div className="field-help">{notice}</div> : null}
      </div>

      <h2>Tools tested on</h2>
      {p.categoryId === 0 ? <p className="field-help">Choose a category to see its tools.</p> : null}
      {p.categoryId !== 0 && visibleTools.length === 0 ? (
        <p className="field-help">No tools are linked to this category yet. Link them in the Relations matrix.</p>
      ) : null}
      <div className="repeat">
        {visibleTools.map((tool) => {
          const selected = p.tools.find((t) => t.toolId === tool.id)
          return (
            <div key={tool.id} className="repeat-row">
              <label className="check">
                <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleTool(tool.id)} />
                {tool.name}
              </label>
              {selected ? (
                <>
                  <label className="check">
                    <input type="radio" name="primary-tool" checked={selected.isPrimary} onChange={() => setPrimary(tool.id)} />
                    Primary
                  </label>
                  <select
                    className="input"
                    value={selected.fit}
                    aria-label={`Fit for ${tool.name}`}
                    onChange={(e) => patchTool(tool.id, { fit: e.target.value === 'great' ? 'great' : 'good' })}
                  >
                    <option value="great">Great fit</option>
                    <option value="good">Good fit</option>
                  </select>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
      {errors.tools ? <div className="field-error">{errors.tools}</div> : null}

      {category?.supportsStyles && visibleStyles.length > 0 ? (
        <>
          <h2>Art styles</h2>
          <div className="repeat">
            {visibleStyles.map((style) => (
              <label key={style.id} className="check">
                <input
                  type="checkbox"
                  checked={p.styleIds.includes(style.id)}
                  onChange={(e) =>
                    update({ styleIds: e.target.checked ? [...p.styleIds, style.id] : p.styleIds.filter((s) => s !== style.id) })
                  }
                />
                {style.name}
              </label>
            ))}
          </div>
          {errors.styles ? <div className="field-error">{errors.styles}</div> : null}
        </>
      ) : null}

      <h2>Prompt</h2>
      <label className="check">
        <input type="checkbox" checked={p.isChain} onChange={(e) => update({ isChain: e.target.checked })} />
        This is a chain (two or more prompts in sequence)
      </label>
      {p.isChain ? (
        <div className="repeat">
          {p.steps.map((step, index) => (
            <div key={index} className="repeat-row repeat-col">
              <strong>Step {index + 1}</strong>
              <input
                className="input"
                placeholder="Label (optional)"
                value={step.label}
                onChange={(e) => update({ steps: p.steps.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)) })}
              />
              <textarea
                className="input"
                rows={3}
                placeholder="Prompt text"
                value={step.text}
                onChange={(e) => update({ steps: p.steps.map((s, i) => (i === index ? { ...s, text: e.target.value } : s)) })}
              />
              <MediaField
                label="Step result image (optional)"
                value={step.exampleMediaId}
                onChange={(mediaId) => update({ steps: p.steps.map((s, i) => (i === index ? { ...s, exampleMediaId: mediaId } : s)) })}
              />
              <div className="actions">
                <button type="button" className="btn btn-secondary" onClick={() => moveStep(index, -1)}>
                  Up
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => moveStep(index, 1)}>
                  Down
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => update({ steps: p.steps.filter((_, i) => i !== index) })}>
                  Remove step
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => update({ steps: [...p.steps, { label: '', text: '', exampleMediaId: null }] })}
          >
            Add step
          </button>
          {errors.steps ? <div className="field-error">{errors.steps}</div> : null}
        </div>
      ) : (
        <div className="field">
          <label htmlFor="promptText">Prompt text</label>
          <textarea id="promptText" className="input" rows={8} value={p.promptText} onChange={(e) => update({ promptText: e.target.value })} />
          {errors.promptText ? <div className="field-error">{errors.promptText}</div> : null}
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={p.isPremium} onChange={(e) => update({ isPremium: e.target.checked })} />
        Premium prompt
      </label>
      <label className="check">
        <input type="checkbox" checked={p.referenceRequired} onChange={(e) => update({ referenceRequired: e.target.checked })} />
        Needs a reference photo
      </label>
      {p.referenceRequired ? (
        <div className="field">
          <label htmlFor="referenceNote">Reference photo note</label>
          <input id="referenceNote" className="input" value={p.referenceNote} onChange={(e) => update({ referenceNote: e.target.value })} />
        </div>
      ) : null}
      <MediaField label="Example output image (required to publish)" value={p.exampleMediaId} onChange={(mediaId) => update({ exampleMediaId: mediaId })} />
      {errors.exampleMediaId ? <div className="field-error">{errors.exampleMediaId}</div> : null}

      <h2>Content</h2>
      <div className="field">
        <label htmlFor="quickAnswer">Quick answer</label>
        <textarea id="quickAnswer" className="input" rows={3} value={p.quickAnswer} onChange={(e) => update({ quickAnswer: e.target.value })} />
        {errors.quickAnswer ? <div className="field-error">{errors.quickAnswer}</div> : null}
      </div>
      <RichTextField label="Article" value={p.articleHtml} onChange={(html) => update({ articleHtml: html })} />
      {errors.articleHtml ? <div className="field-error">{errors.articleHtml}</div> : null}

      <h2>FAQs</h2>
      <div className="repeat">
        {p.faqs.map((faq, index) => (
          <div key={index} className="repeat-row repeat-col">
            <input
              className="input"
              placeholder="Question"
              value={faq.question}
              onChange={(e) => update({ faqs: p.faqs.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)) })}
            />
            <textarea
              className="input"
              rows={2}
              placeholder="Answer"
              value={faq.answer}
              onChange={(e) => update({ faqs: p.faqs.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)) })}
            />
            <button type="button" className="btn btn-ghost" onClick={() => update({ faqs: p.faqs.filter((_, i) => i !== index) })}>
              Remove FAQ
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => update({ faqs: [...p.faqs, { question: '', answer: '' }] })}>
          Add FAQ
        </button>
        {errors.faqs ? <div className="field-error">{errors.faqs}</div> : null}
      </div>

      <h2>Similar prompts</h2>
      <div className="field">
        <select
          multiple
          size={6}
          className="input"
          aria-label="Similar prompts"
          value={p.similarIds.map(String)}
          onChange={(e) => update({ similarIds: Array.from(e.target.selectedOptions, (option) => Number(option.value)) })}
        >
          {options.similar.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="field-help">Hold Ctrl (or Cmd) to pick several. Only published prompts are listed.</div>
        {errors.similar ? <div className="field-error">{errors.similar}</div> : null}
      </div>

      <h2>Search engines</h2>
      <div className="field">
        <label htmlFor="seoTitle">SEO title</label>
        <input id="seoTitle" className="input" value={p.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })} />
        {errors.seoTitle ? <div className="field-error">{errors.seoTitle}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="seoDescription">SEO description</label>
        <textarea id="seoDescription" className="input" rows={2} value={p.seoDescription} onChange={(e) => update({ seoDescription: e.target.value })} />
        {errors.seoDescription ? <div className="field-error">{errors.seoDescription}</div> : null}
      </div>

      <h2>Publishing</h2>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" className="input" value={p.status} onChange={(e) => update({ status: e.target.value as PromptInput['status'] })}>
          {PROMPT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="actions">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : id ? 'Save changes' : 'Create prompt'}
        </button>
        <a className="btn btn-secondary" href="/admin/prompts/">
          Cancel
        </a>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Write `src/app/admin/prompts/new/page.tsx` and `[id]/page.tsx`**

`src/app/admin/prompts/new/page.tsx`:

```tsx
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getStyleMatrix, getToolMatrix } from '@/matrix/repo'
import { similarCandidates } from '@/prompts/repo'
import { emptyPrompt } from '@/prompts/types'
import { PromptForm, type FormOptions } from '../PromptForm'

export async function loadFormOptions(excludeId: number | null): Promise<FormOptions> {
  const db = getPool()
  const [toolMatrix, styleMatrix, similar] = await Promise.all([getToolMatrix(db), getStyleMatrix(db), similarCandidates(db, excludeId)])
  return {
    categories: toolMatrix.categories,
    tools: toolMatrix.tools,
    styles: styleMatrix.styles,
    toolLinks: toolMatrix.links.map((l) => ({ categoryId: l.categoryId, toolId: l.toolId })),
    styleLinks: styleMatrix.links.map((l) => ({ categoryId: l.categoryId, styleId: l.styleId })),
    similar,
  }
}

export default async function NewPromptPage() {
  await requireUser(['admin', 'editor'])
  return (
    <>
      <div className="admin-head">
        <h1>New prompt</h1>
      </div>
      <PromptForm initial={emptyPrompt()} slugLocked={false} options={await loadFormOptions(null)} />
    </>
  )
}
```

Next.js only allows page files to export the default component and a fixed set of config names, so move the loader out. Instead create `src/app/admin/prompts/options.ts` with the `loadFormOptions` function (same body, plus the imports `getPool`, `getStyleMatrix`, `getToolMatrix`, `similarCandidates`, and `type FormOptions` from `./PromptForm`) and import it in both pages:

`src/app/admin/prompts/options.ts`:

```ts
import { getPool } from '@/db/pool'
import { getStyleMatrix, getToolMatrix } from '@/matrix/repo'
import { similarCandidates } from '@/prompts/repo'
import type { FormOptions } from './PromptForm'

export async function loadFormOptions(excludeId: number | null): Promise<FormOptions> {
  const db = getPool()
  const [toolMatrix, styleMatrix, similar] = await Promise.all([getToolMatrix(db), getStyleMatrix(db), similarCandidates(db, excludeId)])
  return {
    categories: toolMatrix.categories,
    tools: toolMatrix.tools,
    styles: styleMatrix.styles,
    toolLinks: toolMatrix.links.map((l) => ({ categoryId: l.categoryId, toolId: l.toolId })),
    styleLinks: styleMatrix.links.map((l) => ({ categoryId: l.categoryId, styleId: l.styleId })),
    similar,
  }
}
```

The final `src/app/admin/prompts/new/page.tsx` is:

```tsx
import { requireUser } from '@/lib/current-user'
import { emptyPrompt } from '@/prompts/types'
import { loadFormOptions } from '../options'
import { PromptForm } from '../PromptForm'

export default async function NewPromptPage() {
  await requireUser(['admin', 'editor'])
  return (
    <>
      <div className="admin-head">
        <h1>New prompt</h1>
      </div>
      <PromptForm initial={emptyPrompt()} slugLocked={false} options={await loadFormOptions(null)} />
    </>
  )
}
```

`src/app/admin/prompts/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getPromptForEdit } from '@/prompts/repo'
import { loadFormOptions } from '../options'
import { PromptForm } from '../PromptForm'

export default async function EditPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { id: idText } = await params
  const id = Number(idText)
  if (!Number.isInteger(id)) notFound()
  const prompt = await getPromptForEdit(getPool(), id)
  if (!prompt) notFound()
  const { saved } = await searchParams
  const { publishedAt, id: promptId, ...initial } = prompt

  return (
    <>
      <div className="admin-head">
        <h1>Edit prompt</h1>
        <Link className="btn btn-secondary" href="/admin/prompts/">
          Back to prompts
        </Link>
      </div>
      {saved ? <div className="banner">Saved.</div> : null}
      <PromptForm id={promptId} initial={initial} slugLocked={publishedAt !== null} options={await loadFormOptions(promptId)} />
    </>
  )
}
```

- [ ] **Step 5: Write `src/app/admin/prompts/page.tsx`**

```tsx
import Link from 'next/link'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getToolMatrix } from '@/matrix/repo'
import { listPrompts } from '@/prompts/repo'
import { PROMPT_STATUSES } from '@/prompts/types'
import { deletePromptAction } from './actions'

const PAGE_SIZE = 25

export default async function PromptListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string; error?: string; saved?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { q, status, category, page, error, saved } = await searchParams
  const current = Math.max(1, Number(page) || 1)
  const categoryId = Number(category) || undefined
  const statusFilter = PROMPT_STATUSES.find((s) => s === status)
  const db = getPool()
  const [{ rows, total }, { categories }] = await Promise.all([
    listPrompts(db, { q: q?.trim() || undefined, status: statusFilter, categoryId, limit: PAGE_SIZE, offset: (current - 1) * PAGE_SIZE }),
    getToolMatrix(db),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const link = (n: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (statusFilter) params.set('status', statusFilter)
    if (categoryId) params.set('category', String(categoryId))
    params.set('page', String(n))
    return `/admin/prompts/?${params.toString()}`
  }

  return (
    <>
      <div className="admin-head">
        <h1>Prompts</h1>
        <Link className="btn btn-primary" href="/admin/prompts/new/">
          New prompt
        </Link>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {saved ? <div className="banner">Saved.</div> : null}
      <form method="get" className="actions" style={{ marginBottom: 'var(--space-4)' }}>
        <input name="q" className="input" placeholder="Search titles" defaultValue={q ?? ''} />
        <select name="status" className="input" defaultValue={statusFilter ?? ''}>
          <option value="">Any status</option>
          {PROMPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="category" className="input" defaultValue={categoryId ?? ''}>
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" type="submit">
          Filter
        </button>
      </form>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Primary tool</th>
            <th>Status</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No prompts match.</td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td>{row.categoryName}</td>
              <td>{row.primaryToolName ?? '–'}</td>
              <td>{row.status}</td>
              <td>{new Date(row.updatedAt).toISOString().slice(0, 10)}</td>
              <td>
                <div className="actions">
                  <Link className="btn btn-secondary" href={`/admin/prompts/${row.id}/`}>
                    Edit
                  </Link>
                  <form action={deletePromptAction} className="inline-form">
                    <input type="hidden" name="__id" value={row.id} />
                    <button className="btn btn-ghost" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 ? (
        <nav className="tabs">
          {current > 1 ? <Link href={link(current - 1)}>← Previous</Link> : null}
          <span>
            Page {current} of {pages} ({total} prompts)
          </span>
          {current < pages ? <Link href={link(current + 1)}>Next →</Link> : null}
        </nav>
      ) : null}
    </>
  )
}
```

- [ ] **Step 6: Append form styles to `src/styles/admin.css`**

```css
.prompt-form {
  max-width: 820px;
}
.prompt-form h2 {
  margin: var(--space-6) 0 0;
  padding-top: var(--space-4);
  border-top: 2px solid var(--color-text);
  font-size: 24px;
  letter-spacing: -0.02em;
}
.repeat {
  display: grid;
  gap: var(--space-3);
}
.repeat-row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
  padding: var(--space-3);
  border: 2px solid var(--color-divider);
}
.repeat-col {
  flex-direction: column;
  align-items: stretch;
}
.rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}
.rte {
  min-height: 220px;
  line-height: 1.5;
}
.rte h2,
.rte h3 {
  margin: 0.6em 0 0.3em;
}
```

- [ ] **Step 7: Add the Prompts link to the sidebar**

In `src/app/admin/layout.tsx`, before the `Relations matrix` link line, add:

```tsx
        {canEditTaxonomy ? <Link href="/admin/prompts/">Prompts</Link> : null}
```

- [ ] **Step 8: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```
Expected: typecheck exits 0; the build lists `/admin/prompts`, `/admin/prompts/new`, `/admin/prompts/[id]`, `/admin/media`, `/admin/media/upload`, `/media/[id]/[variant]`.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat(prompts): add rich-text editor and prompt admin screens with category-aware tool and style pickers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Verify locally, deploy, and verify live

**Files:** none new

- [ ] **Step 1: Run the full suite**

```bash
pnpm test
pnpm typecheck
```
Expected: all test files pass (72 from plan 1A + about 60 new), typecheck exits 0. The suite takes several minutes through the tunnel.

- [ ] **Step 2: Walk through the flow locally**

Start `pnpm dev` (background) and, signed in as an admin of the dev database (`pnpm create-admin --email dev@example.com --password 'dev-password-123' --name Dev --handle dev` if none exists):

1. Create category `Portrait`, tool `Midjourney`, tool `ChatGPT`, style `Cinematic`; in the Relations matrix link Portrait × Midjourney and Portrait × Cinematic.
2. New prompt: title `Studio headshot, 85mm`, category Portrait. Confirm the tools list shows only Midjourney and the styles list shows only Cinematic. Switch category to another one and back to see the "removed" notice appear and the choices reset.
3. Try Status = published with no example image: the red banner must list what is missing.
4. Upload an image (drag and drop), fill in prompt text, choose Midjourney (primary, Great fit) and Cinematic, add an FAQ, format some article text with Bold and a Heading, publish. Confirm the page reloads with "Saved." and the slug field is disabled with the "Change the published URL" checkbox.
5. Relations matrix: the Portrait × Midjourney cell now shows `1`. Try to unlink it; the red banner must explain why it is blocked.
6. Media page: the image shows `1 use(s)`; deleting it is blocked.
7. Chain: new prompt with "This is a chain", two steps, publish; confirm the primary tool and steps persist after saving.

- [ ] **Step 3: Deploy**

```bash
git archive --format=tar.gz -o /tmp/galaxy-release.tar.gz HEAD
scp -i ~/.ssh/id_ed25519 -o BatchMode=yes /tmp/galaxy-release.tar.gz root@46.250.239.74:/tmp/galaxy-release.tar.gz
ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes root@46.250.239.74 'cd /opt/apps/thepromptgalaxy && tar -xzf /tmp/galaxy-release.tar.gz && rm /tmp/galaxy-release.tar.gz && mkdir -p uploads && pnpm install --frozen-lockfile 2>&1 | tail -2 && pnpm migrate 2>&1 | tail -1 && pnpm build 2>&1 | grep -E "Compiled|rror|admin/prompts" ; pm2 restart thepromptgalaxy | tail -1'
```
Expected: `Applied: 0005_media.sql, 0006_prompt_content.sql`, `Compiled successfully`, the prompt routes listed, PM2 restarted. (`sharp` installs its prebuilt Linux binary during `pnpm install`.)

- [ ] **Step 4: Verify live**

At https://thepromptgalaxy.com/admin/ repeat steps 1-5 of the local walk-through with real content, then check that the image is served: `curl -sI https://thepromptgalaxy.com/media/1/thumb/` must return `200` with `content-type: image/webp` and `cache-control: public, max-age=31536000, immutable`. Then run the server backup once and confirm uploads are included:

```bash
ssh -i ~/.ssh/id_ed25519 root@46.250.239.74 '/opt/apps/thepromptgalaxy/deploy/backup.sh && ls -lh /var/backups/promptgalaxy | tail -4'
```
Expected: a `db-*.dump` and an `uploads-*.tar.gz` both dated now.

- [ ] **Step 5: Update notes, push**

Add to `C:\Users\HRH\.claude\projects\F--Shahbaz-thepromptgalaxy\memory\project_current_status.md`, in the superseding block: `Plan 1B (media library + prompts admin) implemented and deployed; next is plan 1C (public site).` Then:

```bash
git push origin rebuild/custom-cms
rm -f /tmp/galaxy-release.tar.gz
```

---

## Self-review checklist (completed while writing this plan)

- **Spec coverage (sections 5.3, 5.5, 7):** prompts table columns and statuses (Tasks 2, 9); prompt_tools with primary and fit and DB-enforced validity (plan 1A + Task 9); prompt_styles (Task 9); prompt_steps, prompt_faqs, similar_prompts (Tasks 2, 9); media table, inline drag-and-drop uploader, library (Tasks 2, 4-6); rich text sanitized on write (Tasks 7, 8); slug lock at first publish with redirect (Task 9); moderation statuses intentionally left for Phase 2; SEO fields (Tasks 8-10); audit log (Task 9); uploads included in backups (Task 11).
- **Not covered here on purpose:** category/tool icon and logo columns (no design use), "choose from library", public rendering (plan 1C), full-text `search_vector` (plan 1C).
- **Type consistency:** `PromptInput`, `PromptToolInput`, `PromptStepInput`, `PromptFaqInput`, `PromptFormState` are defined once in `src/prompts/types.ts` and used by input parsing, the repository, actions and the form; `MediaRow` and `Variant` come from `src/media/storage.ts`; `FormOptions` lives in `PromptForm.tsx` and is built by `options.ts`.
- **Known caveat to check while running:** if `pnpm build` rejects the `useActionState` action signature in `PromptForm.tsx`, keep the action file exporting only the two async functions and the state type in `src/prompts/types.ts`, as this plan does.
