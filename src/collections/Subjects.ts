import type { CollectionConfig } from 'payload'
import { autoSlugHook } from '@/lib/autoSlug'

// Admin controls the Subject list here — adding "Wedding" or "Pets" later
// requires zero code changes, just a new entry in this collection.
export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'colorHex', 'sortOrder'],
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
        },
        {
          name: 'slug',
          type: 'text',
          unique: true,
          admin: { description: 'Auto-generated from Name if left blank. URL-safe identifier, e.g. "real-estate"' },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: { description: 'Shown on the subject landing page for SEO/AEO.' },
        },
        {
          name: 'colorHex',
          type: 'text',
          admin: { description: 'Hex color used for this subject’s tag/dot in the UI, e.g. #C9A227' },
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Controls display order in the filter row.' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Icon',
      admin: {
        initCollapsed: false,
        components: { Label: '/components/admin/CardLabel#CardLabel' },
      },
      fields: [
        {
          name: 'icon',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
