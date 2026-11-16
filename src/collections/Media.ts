import type { CollectionConfig, ImageUploadFormatOptions } from 'payload'
import { promoteProcessedClientUpload } from '@/lib/promoteProcessedClientUpload'

// Visually lossless WebP. Collection-level formatOptions apply only to the
// original; each image size has to set formatOptions itself.
const webp: ImageUploadFormatOptions = {
  format: 'webp',
  options: {
    quality: 80,
    effort: 6,
  },
}

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    // Sharp drops EXIF/IPTC unless withMetadata is enabled.
    withMetadata: false,
    formatOptions: webp,
    resizeOptions: {
      width: 2000,
      fit: 'inside',
      withoutEnlargement: true,
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        withoutEnlargement: true,
        formatOptions: webp,
      },
      {
        name: 'card',
        width: 800,
        withoutEnlargement: true,
        formatOptions: webp,
      },
    ],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [promoteProcessedClientUpload],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Accessibility + SEO alt text.' },
    },
  ],
}
