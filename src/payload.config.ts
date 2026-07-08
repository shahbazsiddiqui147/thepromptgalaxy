import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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
  },
  collections: [Users, Media, Subjects, ArtStyles, Tools, ContentTypes, Prompts],
  editor: lexicalEditor(),
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
