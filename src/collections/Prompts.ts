import type { CollectionConfig } from 'payload'

export const Prompts: CollectionConfig = {
  slug: 'prompts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'artStyle', 'contentType', 'status'],
    group: 'Content',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'published' } }
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
      type: 'select',
      required: true,
      options: [
        { label: 'Single-frame', value: 'single' },
        { label: 'Chain', value: 'chain' },
      ],
      defaultValue: 'single',
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
        condition: (data) => data.contentType === 'single',
      },
    },

    {
      name: 'steps',
      type: 'array',
      admin: {
        description: 'Ordered steps — each carries context forward from the last.',
        condition: (data) => data.contentType === 'chain',
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
        condition: (data) => data.contentType === 'single',
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

    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      required: true,
    },
  ],
}
