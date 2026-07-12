import type { CollectionConfig } from 'payload'
import { autoSlugHook } from '@/lib/autoSlug'

export const ContentTypes: CollectionConfig = {
  slug: 'content-types',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'usesSteps'],
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
          name: 'usesSteps',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Does this content type use the ordered Steps list (like Chain) instead of a single Prompt Text field?',
          },
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
  ],
}
