import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: {
        description:
          'Public-facing display name shown on the frontend when this user verifies content. Leave blank to hide the byline name (only the date will show).',
      },
    },
  ],
}
