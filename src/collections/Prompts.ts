import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const Prompts: CollectionConfig = {
  slug: 'prompts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'artStyle', 'contentType'],
    group: 'Content',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
  },
  versions: {
    drafts: true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },

    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      hasMany: false,
    },
    {
      name: 'artStyle',
      type: 'relationship',
      relationTo: 'art-styles',
      required: true,
      hasMany: false,
    },
    {
      name: 'tools',
      type: 'relationship',
      relationTo: 'tools',
      required: true,
      hasMany: true,
      admin: { description: 'Which tools this prompt is tested/compatible with.' },
    },
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
      required: true,
      hasMany: false,
    },
    {
      name: 'contentTypeUsesSteps',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
        description: 'Synced automatically from the selected Content Type — not editable directly.',
      },
    },

    {
      name: 'referenceRequired',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Does running this prompt require the user to upload a reference photo?' },
    },
    {
      name: 'referenceNote',
      type: 'text',
      admin: {
        description: 'e.g. "Face only", "Face + outfit", "Outfit only (no face)", "Couple (multi-face)"',
        condition: (data) => Boolean(data.referenceRequired),
      },
    },

    { name: 'blurb', type: 'textarea', required: true },

    {
      name: 'promptText',
      type: 'textarea',
      admin: {
        description: 'The full copyable prompt text.',
        condition: (data) => !data.contentTypeUsesSteps,
      },
    },

    {
      name: 'steps',
      type: 'array',
      admin: {
        description: 'Ordered steps — each carries context forward from the last.',
        condition: (data) => Boolean(data.contentTypeUsesSteps),
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'note', type: 'text', required: true },
        { name: 'promptText', type: 'textarea', required: true },
        { name: 'exampleResult', type: 'upload', relationTo: 'media' },
      ],
    },

    {
      name: 'exampleResults',
      type: 'array',
      admin: {
        description: 'Result image variations shown in the gallery.',
        condition: (data) => !data.contentTypeUsesSteps,
      },
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'note', type: 'text' },
      ],
    },

    {
      name: 'quickAnswer',
      type: 'textarea',
      admin: { description: 'Direct, citable 1–2 sentence summary shown at the top of the page.' },
    },
    {
      name: 'article',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'paragraphs', type: 'array', fields: [{ name: 'text', type: 'textarea' }] },
        { name: 'tips', type: 'array', fields: [{ name: 'text', type: 'text' }] },
      ],
    },
    {
      name: 'faqs',
      type: 'array',
      admin: { description: 'Ships as FAQPage JSON-LD schema on the frontend.' },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },

    {
      name: 'similarPrompts',
      type: 'relationship',
      relationTo: 'prompts',
      hasMany: true,
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        const contentTypeRef = data.contentType ?? originalDoc?.contentType
        if (contentTypeRef) {
          const contentTypeId =
            typeof contentTypeRef === 'object' ? contentTypeRef.id : contentTypeRef
          const contentType = await req.payload.findByID({
            collection: 'content-types',
            id: contentTypeId,
          })
          data.contentTypeUsesSteps = Boolean(contentType?.usesSteps)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        try {
          const subject =
            typeof doc.subject === 'object'
              ? doc.subject
              : await req.payload.findByID({ collection: 'subjects', id: doc.subject })
          const artStyle =
            typeof doc.artStyle === 'object'
              ? doc.artStyle
              : await req.payload.findByID({ collection: 'art-styles', id: doc.artStyle })

          revalidatePath('/')
          revalidatePath(`/${subject.slug}/`)
          revalidatePath(`/${subject.slug}/${artStyle.slug}/`)
          revalidatePath(`/${subject.slug}/${artStyle.slug}/${doc.slug}/`)
          revalidatePath(`/style/${artStyle.slug}/`)
          revalidatePath('/chains/')

          const tools = Array.isArray(doc.tools) ? doc.tools : []
          for (const t of tools) {
            const tool =
              typeof t === 'object' ? t : await req.payload.findByID({ collection: 'tools', id: t })
            if (tool?.slug) revalidatePath(`/tool/${tool.slug}/`)
          }
        } catch (err) {
          req.payload.logger.error({ err, msg: 'afterChange revalidation failed for prompt', docId: doc.id })
        }
      },
    ],
  },
}
