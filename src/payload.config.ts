import { postgresAdapter } from '@payloadcms/db-postgres'
import { FixedToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Subjects } from './collections/Subjects'
import { ArtStyles } from './collections/ArtStyles'
import { Tools } from './collections/Tools'
import { ContentTypes } from './collections/ContentTypes'
import { Prompts } from './collections/Prompts'
import { Customers } from './collections/Customers'
import { AdSettings } from './globals/AdSettings'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const payloadSecret = process.env.PAYLOAD_SECRET
if (!payloadSecret) {
  throw new Error('PAYLOAD_SECRET environment variable is required')
}

const databaseURI = process.env.DATABASE_URI
if (!databaseURI) {
  throw new Error('DATABASE_URI environment variable is required')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — The Prompt Galaxy Admin',
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
      actions: ['/components/admin/ViewSiteAction#ViewSiteAction'],
      afterNavLinks: ['/components/admin/SidebarIcons#SidebarIcons'],
    },
  },
  collections: [Users, Media, Subjects, ArtStyles, Tools, ContentTypes, Prompts, Customers],
  globals: [AdSettings, SiteSettings],
  // Default features already cover headings/lists/links/bold/italic etc; the
  // only thing missing was a persistent toolbar -- lexicalEditor()'s default
  // feature set relies on a floating selection toolbar only, which reads as
  // "no WYSIWYG editor at all" until you highlight text.
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, FixedToolbarFeature()],
  }),
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseURI,
    },
  }),
  sharp,
})
