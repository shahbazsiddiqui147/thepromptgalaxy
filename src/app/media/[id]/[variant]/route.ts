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
