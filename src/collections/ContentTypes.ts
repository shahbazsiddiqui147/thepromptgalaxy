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
      admin: { description: 'Auto-generated from Name if left blank.' },
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
}
