import type { Media } from '@/payload-types'

export type MediaCard = {
  id: number
  alt: string
  filename: string | null
  url: string | null
  thumb: string | null
  filesize: number | null
  width: number | null
  height: number | null
  createdAt: string
}

export function toMediaCard(doc: Pick<Media, 'id' | 'alt' | 'filename' | 'url' | 'filesize' | 'width' | 'height' | 'sizes' | 'createdAt'>): MediaCard {
  return {
    id: doc.id,
    alt: doc.alt,
    filename: doc.filename ?? null,
    url: doc.url ?? null,
    thumb: doc.sizes?.thumbnail?.url || doc.url || null,
    filesize: doc.filesize ?? null,
    width: doc.width ?? null,
    height: doc.height ?? null,
    createdAt: doc.createdAt,
  }
}
