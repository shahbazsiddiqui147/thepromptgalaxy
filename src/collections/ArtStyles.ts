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
      type: 'collapsible',
      label: 'Details',
      admin: {
        initCollapsed: false,
        components: { Label: '/components/admin/CardLabel#CardLabel' },
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: true,
          admin: { components: { Cell: '/components/admin/RowActions#RowActions' } },
        },
        {
          name: 'slug',
          type: 'text',
          unique: true,
          admin: { readOnly: true, description: 'Auto-generated from Name.' },
        },
        {
          name: 'colorHex',
          type: 'text',
          admin: { description: 'Hex color used for this style’s tag/dot in the UI, e.g. #C9A227' },
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Word Choice Guide',
      admin: {
        initCollapsed: false,
        components: { Label: '/components/admin/CardLabel#CardLabel' },
      },
      fields: [
        {
          name: 'wordChoiceGuide',
          type: 'group',
          admin: { description: 'Helps/hurts word list for this style — seeds model-specific prompt-writing notes.' },
          fields: [
            { name: 'helps', type: 'array', fields: [{ name: 'word', type: 'text' }] },
            { name: 'hurts', type: 'array', fields: [{ name: 'word', type: 'text' }] },
          ],
        },
      ],
    },
  ],
}
