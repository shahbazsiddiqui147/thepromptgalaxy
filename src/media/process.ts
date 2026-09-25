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
