import type { Media } from '@/payload-types'

export type MediaSizeName = 'thumbnail' | 'card'

/** Prefer a generated WebP size, then the processed original. */
export function mediaSizeUrl(
  media: Media | null | undefined,
  size: MediaSizeName,
): string | null {
  if (!media) return null
  return media.sizes?.[size]?.url || media.url || null
}
