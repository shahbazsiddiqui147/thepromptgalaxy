import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { autoSlugHook } from '@/lib/autoSlug'

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
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Basic Info',
          fields: [
            {
              type: 'collapsible',
              label: 'Content',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  admin: { components: { Cell: '/components/admin/RowActions#RowActions' } },
                },
                {
                  name: 'slug',
                  type: 'text',
                  unique: true,
                  admin: { readOnly: true, description: 'Auto-generated from Title.' },
                },
                { name: 'blurb', type: 'textarea', required: true },
              ],
            },
            {
              type: 'collapsible',
              label: 'Taxonomy',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'subject',
                  type: 'relationship',
                  relationTo: 'subjects',
                  required: true,
                  hasMany: false,
                  admin: {
                    components: {
                      Field: '/components/admin/ColorPillPicker#ColorPillPicker',
                    },
                  },
                },
                {
                  name: 'artStyle',
                  type: 'relationship',
                  relationTo: 'art-styles',
                  required: true,
                  hasMany: false,
                  admin: {
                    components: {
                      Field: '/components/admin/ColorPillPicker#ColorPillPicker',
                    },
                  },
                },
                {
                  name: 'tools',
                  type: 'array',
                  required: true,
                  minRows: 1,
                  admin: {
                    description: 'Which tools this prompt is tested/compatible with, and how well each one fits.',
                    components: {
                      Field: '/components/admin/ToolsPicker#ToolsPicker',
                    },
                  },
                  fields: [
                    {
                      name: 'tool',
                      type: 'relationship',
                      relationTo: 'tools',
                      required: true,
                      hasMany: false,
                    },
                    {
                      name: 'fit',
                      type: 'select',
                      required: true,
                      defaultValue: 'good',
                      options: [
                        { label: 'Great Fit', value: 'great' },
                        { label: 'Good Fit', value: 'good' },
                      ],
                    },
                  ],
                },
                {
                  name: 'contentType',
                  type: 'relationship',
                  relationTo: 'content-types',
                  required: true,
                  hasMany: false,
                  admin: {
                    components: {
                      Field: '/components/admin/ColorPillPicker#ColorPillPicker',
                    },
                  },
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
              ],
            },
            {
              type: 'collapsible',
              label: 'Cover Image',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'coverImage',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description:
                      'Main thumbnail shown wherever this prompt is listed (homepage, archive grids, browse page). Falls back to a color gradient if left blank.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Prompt Content',
          fields: [
            {
              type: 'collapsible',
              label: 'Reference Image',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
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
              ],
            },
            {
              type: 'collapsible',
              label: 'Prompt Text',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
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
                    description: 'Ordered steps — each carries context forward from the last. Steps are collapsed by default, including one you just added — click a step to expand it.',
                    condition: (data) => Boolean(data.contentTypeUsesSteps),
                    initCollapsed: true,
                    components: {
                      RowLabel: '/components/admin/StepRowLabel#StepRowLabel',
                    },
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      admin: { description: 'Short name for this step, e.g. "Base" or "Relocate" — shown next to the step number.' },
                    },
                    {
                      name: 'note',
                      type: 'text',
                      required: true,
                      admin: { description: 'One-line explanation of what this step does — shown next to the step number on the site.' },
                    },
                    {
                      name: 'promptText',
                      type: 'textarea',
                      required: true,
                      admin: { description: 'The actual prompt text for this step.' },
                    },
                    {
                      name: 'exampleResult',
                      type: 'upload',
                      relationTo: 'media',
                      admin: { description: "Optional example image showing this step's result." },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Example Results',
              admin: {
                initCollapsed: false,
                condition: (data) => !data.contentTypeUsesSteps,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'exampleResults',
                  type: 'array',
                  admin: {
                    description: 'Result image variations shown in the gallery.',
                  },
                  fields: [
                    { name: 'image', type: 'upload', relationTo: 'media', required: true },
                    { name: 'note', type: 'text' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'SEO & Article',
          fields: [
            {
              type: 'collapsible',
              label: 'Quick Answer',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'quickAnswer',
                  type: 'textarea',
                  admin: { description: 'Direct, citable 1–2 sentence summary shown at the top of the page.' },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Article',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'article',
                  type: 'group',
                  fields: [
                    { name: 'heading', type: 'text' },
                    {
                      name: 'body',
                      type: 'richText',
                      admin: {
                        description: 'The long-form "why this prompt works" content. Use headings, bullet lists, and bold text as needed.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'FAQs',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'faqs',
                  type: 'array',
                  admin: { description: 'Ships as FAQPage JSON-LD schema on the frontend.' },
                  fields: [
                    { name: 'question', type: 'text', required: true },
                    { name: 'answer', type: 'textarea', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Related',
          fields: [
            {
              type: 'collapsible',
              label: 'Similar Prompts',
              admin: {
                initCollapsed: false,
                components: { Label: '/components/admin/CardLabel#CardLabel' },
              },
              fields: [
                {
                  name: 'similarPrompts',
                  type: 'relationship',
                  relationTo: 'prompts',
                  hasMany: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'livePreview',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/admin/LivePreview#LivePreview',
        },
      },
    },
    {
      name: 'seo',
      type: 'group',
      admin: {
        position: 'sidebar',
        description: 'Overrides the auto-generated page title/description shown in search results. Leave blank to fall back to Title/Blurb.',
      },
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          maxLength: 60,
          admin: { description: 'Aim for 50-60 characters.' },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          maxLength: 160,
          admin: { description: 'Aim for 150-160 characters.' },
        },
      ],
    },
    {
      name: 'verification',
      type: 'group',
      admin: {
        position: 'sidebar',
        description: "Expert review signals shown on the page for E-E-A-T (Google's Experience-Expertise-Authoritativeness-Trust signals).",
      },
      fields: [
        {
          name: 'verifiedBy',
          type: 'relationship',
          relationTo: 'users',
          hasMany: false,
          admin: { description: 'Which admin user verified this content, if any.' },
        },
        {
          name: 'lastVerified',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Automatically set to today whenever this document is saved.',
            date: { displayFormat: 'MMM d, yyyy' },
          },
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [autoSlugHook('title')],
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
      ({ data, originalDoc }) => {
        const currentGroup = data.verification as { verifiedBy?: unknown } | undefined
        const originalGroup = (originalDoc as { verification?: { verifiedBy?: unknown } } | undefined)
          ?.verification

        const currentVerifiedBy =
          typeof currentGroup?.verifiedBy === 'object' && currentGroup.verifiedBy !== null
            ? (currentGroup.verifiedBy as { id?: unknown }).id
            : currentGroup?.verifiedBy
        const originalVerifiedBy =
          typeof originalGroup?.verifiedBy === 'object' && originalGroup.verifiedBy !== null
            ? (originalGroup.verifiedBy as { id?: unknown }).id
            : originalGroup?.verifiedBy

        if (currentVerifiedBy && currentVerifiedBy !== originalVerifiedBy) {
          if (!data.verification) data.verification = {}
          ;(data.verification as { lastVerified?: string }).lastVerified = new Date().toISOString()
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

          const toolEntries = Array.isArray(doc.tools) ? doc.tools : []
          for (const entry of toolEntries) {
            const toolRef = entry?.tool
            const tool =
              typeof toolRef === 'object'
                ? toolRef
                : await req.payload.findByID({ collection: 'tools', id: toolRef })
            if (tool?.slug) revalidatePath(`/tool/${tool.slug}/`)
          }
        } catch (err) {
          req.payload.logger.error({ err, msg: 'afterChange revalidation failed for prompt', docId: doc.id })
        }
      },
    ],
  },
}
