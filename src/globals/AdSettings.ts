import type { GlobalConfig } from 'payload'

export const AdSettings: GlobalConfig = {
  slug: 'ad-settings',
  admin: {
    description:
      'Controls whether ad slots are shown on the site and what embed code renders in each. Leave a slot blank to keep that position empty.',
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user && req.user.collection === 'users'),
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Master switch — turn all ad slots on/off site-wide. Off by default until a real ad network is configured.',
      },
    },
    {
      name: 'leaderboardCode',
      type: 'code',
      admin: {
        language: 'html',
        description:
          'Embed code for the top leaderboard slot (e.g. a 728x90 banner), shown near the top of the prompt page.',
      },
    },
    {
      name: 'inContentCode',
      type: 'code',
      admin: {
        language: 'html',
        description: 'Embed code for the in-content slot, shown below the prompt text.',
      },
    },
    {
      name: 'sidebarCode',
      type: 'code',
      admin: {
        language: 'html',
        description: 'Embed code for the sidebar slot.',
      },
    },
  ],
}
