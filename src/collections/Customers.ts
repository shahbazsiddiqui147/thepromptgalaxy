import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'Customers',
    description:
      'Public-facing site accounts (signup/login on thepromptgalaxy.com) — separate from admin Users.',
  },
  access: {
    // Public signup: anyone can create their own account via the REST/Local API.
    create: () => true,
    // A customer may read/update only their own record; admins (Users) can read/update all.
    read: ({ req }) => {
      if (req.user && req.user.collection === 'users') return true
      if (req.user && req.user.collection === 'customers') {
        return { id: { equals: req.user.id } }
      }
      return false
    },
    update: ({ req }) => {
      if (req.user && req.user.collection === 'users') return true
      if (req.user && req.user.collection === 'customers') {
        return { id: { equals: req.user.id } }
      }
      return false
    },
    // Only admins can delete customer accounts (no public self-delete for now).
    delete: ({ req }) => Boolean(req.user && req.user.collection === 'users'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: "The customer's display name." },
    },
  ],
}
