'use client'

import { upload } from '@vercel/blob/client'

export type UploadedMedia = {
  id: number
  alt: string
  filename: string | null
  url: string | null
  thumb: string | null
}

const BODY_LIMIT = 4.5 * 1024 * 1024

function safeName(filename: string): string {
  let sanitized = filename.replace(/\\/g, '/')
  const slash = sanitized.lastIndexOf('/')
  if (slash !== -1) sanitized = sanitized.slice(slash + 1)
  if (sanitized === '.' || sanitized === '..') sanitized = ''
  sanitized = sanitized.replace(/[\u0000-\u001f\u0080-\u009f]/g, '')
  if (!sanitized) throw new Error('That file name can’t be used.')
  return sanitized
}

function cardFromDoc(doc: {
  id: number
  alt?: string | null
  filename?: string | null
  url?: string | null
  sizes?: { thumbnail?: { url?: string | null } | null } | null
}): UploadedMedia {
  return {
    id: doc.id,
    alt: doc.alt || '',
    filename: doc.filename ?? null,
    url: doc.url ?? null,
    thumb: doc.sizes?.thumbnail?.url || doc.url || null,
  }
}

/**
 * Creates a media document through Payload’s REST API so sharp WebP sizes and
 * the Blob storage plugin still run. When Blob client uploads are enabled,
 * the file goes straight to Blob first — the same path the Payload admin uses
 * to get past Vercel’s 4.5MB function body limit.
 */
export async function uploadMediaFile(file: File, alt: string, clientUploads: boolean): Promise<UploadedMedia> {
  if (!file.type.startsWith('image/')) throw new Error('Only images can be uploaded.')
  const formData = new FormData()
  formData.append('_payload', JSON.stringify({ alt: alt.trim() || safeName(file.name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }))

  if (clientUploads) {
    const filename = safeName(file.name)
    await upload(filename, file, {
      access: 'public',
      clientPayload: 'media',
      contentType: file.type,
      handleUploadUrl: '/api/vercel-blob-client-upload-route',
    })
    formData.append(
      'file',
      JSON.stringify({
        clientUploadContext: { prefix: '' },
        collectionSlug: 'media',
        filename,
        mimeType: file.type,
        size: file.size,
      }),
    )
  } else if (file.size > BODY_LIMIT) {
    throw new Error('This file is over 4.5MB. Blob client uploads are not configured, so Vercel would reject it.')
  } else {
    formData.append('file', file)
  }

  const response = await fetch('/api/media', { method: 'POST', credentials: 'include', body: formData })
  const body = (await response.json().catch(() => null)) as { doc?: Parameters<typeof cardFromDoc>[0]; errors?: { message?: string }[] } | null
  if (!response.ok || !body?.doc) {
    throw new Error(body?.errors?.[0]?.message || `Upload failed (${response.status}).`)
  }
  return cardFromDoc(body.doc)
}
