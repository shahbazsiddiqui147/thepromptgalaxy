import type { CollectionConfig } from 'payload'
import { autoSlugHook } from '@/lib/autoSlug'

export const ArtStyles: CollectionConfig = {
  slug: 'art-styles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'colorHex'],
    group: 'Taxonomy',
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [autoSlugHook('name')],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: { description: 'Auto-generated from Name if left blank.' },
    },
    {
      name: 'colorHex',
      type: 'text',
      admin: { description: 'Hex color used for this style’s tag/dot in the UI, e.g. #C9A227' },
    },
    {
      name: 'wordChoiceGuide',
      type: 'group',
      admin: { description: 'Helps/hurts word list for this style — seeds model-specific prompt-writing notes.' },
      fields: [
        { name: 'helps', type: 'array', fields: [{ name: 'word', type: 'text' }] },
        { name: 'hurts', type: 'array', fields: [{ name: 'word', type: 'text' }] },
      ],
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
}
