import type { CollectionConfig } from 'payload'

export const Tools: CollectionConfig = {
  slug: 'tools',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'vendor', 'active'],
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
      name: 'vendor',
      type: 'text',
      admin: { description: 'e.g. OpenAI, Google, Black Forest Labs' },
    },
    {
      name: 'supportsReferenceImage',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Whether this tool accepts an uploaded reference image natively — gates which prompts show it as compatible.' },
    },
    {
      name: 'supportsChains',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Whether this tool has session/context memory across turns (needed for chain-type prompts).' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Uncheck to hide a deprecated tool from filters without deleting its history.' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
}
