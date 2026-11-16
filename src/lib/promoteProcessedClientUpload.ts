import path from 'path'
import { del } from '@vercel/blob'
import type { CollectionAfterChangeHook } from 'payload'
import { sanitizeFilename } from 'payload/shared'

// Sharp can resize these. SVG and other types are stored as the client uploaded them.
const RESIZABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/avif',
])

function storeIdFromToken(token: string): string | null {
  return token.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase() ?? null
}

function prefixFromContext(clientUploadContext: unknown): string {
  if (
    !clientUploadContext ||
    typeof clientUploadContext !== 'object' ||
    !('prefix' in clientUploadContext) ||
    typeof clientUploadContext.prefix !== 'string'
  ) {
    return ''
  }
  return clientUploadContext.prefix.replace(/^\/+|\/+$/g, '')
}

/** Public blob URL for the object the browser uploaded, before sharp rewrote it. */
function originalBlobUrl(token: string, filename: string, clientUploadContext: unknown): string | null {
  const storeId = storeIdFromToken(token)
  if (!storeId) return null
  const prefix = prefixFromContext(clientUploadContext)
  const safeName = sanitizeFilename(filename)
  const key = prefix ? path.posix.join(prefix, safeName) : safeName
  const encoded = key.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  return `https://${storeId}.public.blob.vercel-storage.com/${encoded}`
}

/**
 * Client uploads land on Blob before Payload runs sharp. The storage plugin
 * then skips any file that still has `clientUploadContext`, which would leave
 * the unprocessed original in place of the WebP we just encoded.
 *
 * Drop the flag so the plugin uploads the processed buffer. If the filename
 * changed (png → webp), delete the original object the browser stored.
 */
export const promoteProcessedClientUpload: CollectionAfterChangeHook = async ({ doc, req }) => {
  const file = req.file
  if (!file?.clientUploadContext) return doc
  if (!RESIZABLE_MIME_TYPES.has(file.mimetype)) return doc

  const token = process.env.BLOB_READ_WRITE_TOKEN
  const originalName = file.name
  const processedName = typeof doc.filename === 'string' ? doc.filename : ''
  const context = file.clientUploadContext
  file.clientUploadContext = undefined

  if (!token || !originalName || !processedName) return doc
  if (sanitizeFilename(originalName) === processedName) return doc

  const url = originalBlobUrl(token, originalName, context)
  if (!url) return doc

  try {
    await del(url, { token })
  } catch (err) {
    req.payload.logger.error({
      err,
      msg: 'Failed to delete the original client upload after image processing',
    })
  }

  return doc
}
