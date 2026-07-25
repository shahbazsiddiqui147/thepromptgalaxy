import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    description: 'Site-wide branding shown across the public site.',
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user && req.user.collection === 'users'),
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Shown in the site header in place of the text wordmark. Leave blank to keep the text logo.',
        components: {
          Field: '/components/admin/InlineUpload#InlineUpload',
        },
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Browser tab icon. PNG or SVG, square aspect ratio recommended.',
        components: {
          Field: '/components/admin/InlineUpload#InlineUpload',
        },
      },
    },
  ],
}
