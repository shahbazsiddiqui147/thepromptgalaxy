import type { CollectionConfig } from 'payload'

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
      required: true,
      unique: true,
    },
    {
      name: 'colorHex',
      type: 'text',
      admin: { description: 'Hex color used for this style's tag/dot in the UI, e.g. #C9A227' },
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
