# The Prompt Galaxy — Payload CMS Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Payload CMS (Next.js app) with all taxonomy and prompt collections
wired up and admin-editable, backed by a dedicated Postgres database on the existing VPS, running
locally for development and deployed via PM2 on the VPS.

**Architecture:** Next.js 16 (App Router) with Payload CMS 3 embedded via `@payloadcms/next`,
Postgres adapter (`@payloadcms/db-postgres`) pointing at a new dedicated database on the VPS's
existing native Postgres 17 instance. Collections: `users` (auth), `subjects`, `art-styles`,
`tools`, `media`, `prompts` (the core content type — models single-frame/chain/reference-image via
one `contentType`-driven schema). Local dev connects to the VPS Postgres through an SSH tunnel so
there's one database, no schema drift between dev and prod. Deployed on the VPS via PM2 on port
`3006`, behind nginx once a domain exists (not yet — no nginx vhost/SSL in this plan).

**Tech Stack:** Next.js 16.2.10, Payload 3.85.2 (`payload`, `@payloadcms/next`,
`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/ui`), React 19.2.7,
TypeScript 6.0.3, pnpm, Postgres 17 (VPS-native, existing instance at `46.250.239.74`).

**Secrets convention:** Any `<ALL_CAPS_TOKEN>` in a command below is a secret substituted at
execution time only — never write the literal value into a committed file (plan docs, `.env`
files are gitignored, etc).

---

## Task 1: Create a dedicated Postgres database + role on the VPS

**Files:** none (remote-only, no repo files touched)

- [ ] **Step 1: Generate a strong password for the new DB role**

Run on the VPS:
```bash
ssh root@46.250.239.74
openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
```
Copy the printed value — referred to below as `<DB_PASSWORD>`. Do not write it into any repo file.

- [ ] **Step 2: Create the role and database**

Still on the VPS:
```bash
sudo -u postgres psql -c "CREATE ROLE promptgalaxy_admin WITH LOGIN PASSWORD '<DB_PASSWORD>';"
sudo -u postgres psql -c "CREATE DATABASE promptgalaxy_prod OWNER promptgalaxy_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE promptgalaxy_prod TO promptgalaxy_admin;"
```

- [ ] **Step 3: Verify the new role can connect**

```bash
PGPASSWORD='<DB_PASSWORD>' psql -h 127.0.0.1 -U promptgalaxy_admin -d promptgalaxy_prod -c '\conninfo'
```
Expected: prints connection info (`You are connected to database "promptgalaxy_prod" as user "promptgalaxy_admin"...`), no auth error.

No commit — infra-only, no repo files changed.

---

## Task 2: Scaffold the Next.js app skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.gitignore` (merge with any existing entries)
- Create: `next-env.d.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "thepromptgalaxy",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "cross-env NODE_OPTIONS=\"--no-deprecation --max-old-space-size=8000\" payload build",
    "dev": "cross-env NODE_OPTIONS=--no-deprecation next dev",
    "devsafe": "rm -rf .next && cross-env NODE_OPTIONS=--no-deprecation next dev",
    "generate:importmap": "cross-env NODE_OPTIONS=--no-deprecation payload generate:importmap",
    "generate:types": "cross-env NODE_OPTIONS=--no-deprecation payload generate:types",
    "payload": "cross-env NODE_OPTIONS=--no-deprecation payload",
    "seed": "cross-env NODE_OPTIONS=--no-deprecation node --env-file=.env --import tsx scripts/seed.ts",
    "start": "cross-env NODE_OPTIONS=--no-deprecation next start"
  },
  "dependencies": {
    "@payloadcms/db-postgres": "3.85.2",
    "@payloadcms/next": "3.85.2",
    "@payloadcms/richtext-lexical": "3.85.2",
    "@payloadcms/ui": "3.85.2",
    "cross-env": "10.1.0",
    "graphql": "^16.8.1",
    "next": "16.2.10",
    "payload": "3.85.2",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "sharp": "0.35.3"
  },
  "devDependencies": {
    "@types/node": "24.12.3",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "eslint": "^9.16.0",
    "eslint-config-next": "16.2.10",
    "tsx": "4.22.4",
    "typescript": "6.0.3"
  },
  "engines": {
    "node": ">=20.6.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@payload-config": ["./src/payload.config.ts"]
    },
    "target": "ES2022"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```typescript
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
```

- [ ] **Step 4: Write/merge `.gitignore`**

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts

/media
payload-types.ts
```

- [ ] **Step 5: Create empty `next-env.d.ts`**

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json next.config.ts .gitignore next-env.d.ts
git commit -m "chore: scaffold Next.js app skeleton"
```

---

## Task 3: Install dependencies

**Files:** none (generates `pnpm-lock.yaml`, `node_modules/`)

- [ ] **Step 1: Install**

```bash
pnpm install
```
Expected: completes without error, creates `pnpm-lock.yaml` and `node_modules/`.

- [ ] **Step 2: Commit the lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile"
```

---

## Task 4: Users and Media collections

**Files:**
- Create: `src/collections/Users.ts`
- Create: `src/collections/Media.ts`

- [ ] **Step 1: Write `src/collections/Users.ts`**

```typescript
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
}
```

- [ ] **Step 2: Write `src/collections/Media.ts`**

```typescript
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 800, height: undefined },
    ],
    mimeTypes: ['image/*'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Accessibility + SEO alt text.' },
    },
  ],
}
```

- [ ] **Step 3: Commit**

```bash
git add src/collections/Users.ts src/collections/Media.ts
git commit -m "feat: add Users and Media collections"
```

---

## Task 5: Taxonomy collections (Subjects, ArtStyles, Tools)

**Files:**
- Create: `src/collections/Subjects.ts`
- Create: `src/collections/ArtStyles.ts`
- Create: `src/collections/Tools.ts`

- [ ] **Step 1: Write `src/collections/Subjects.ts`**

```typescript
import type { CollectionConfig } from 'payload'

// Admin controls the Subject list here — adding "Wedding" or "Pets" later
// requires zero code changes, just a new entry in this collection.
export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'sortOrder'],
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
      admin: { description: 'URL-safe identifier, e.g. "real-estate"' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Shown on the subject landing page for SEO/AEO.' },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Controls display order in the filter row.' },
    },
  ],
}
```

- [ ] **Step 2: Write `src/collections/ArtStyles.ts`**

```typescript
import type { CollectionConfig } from 'payload'

export const ArtStyles: CollectionConfig = {
  slug: 'art-styles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'colorHex'],
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
      name: 'colorHex',
      type: 'text',
      admin: { description: 'Hex color used for this style’s tag/dot in the UI, e.g. #C9A227' },
    },
    {
      name: 'wordChoiceGuide',
      type: 'group',
      admin: { description: 'Helps/hurts word list for this style — seeds model-specific prompt-writing notes.' },
      fields: [
        { name: 'helps', type: 'array', fields: [{ name: 'word', type: 'text' }] },
        { name: 'hurts', type: 'array', fields: [{ name: 'word', type: 'text' }] },
      ],
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
}
```

- [ ] **Step 3: Write `src/collections/Tools.ts`**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/collections/Subjects.ts src/collections/ArtStyles.ts src/collections/Tools.ts
git commit -m "feat: add Subjects, ArtStyles, Tools taxonomy collections"
```

---

## Task 6: Prompts collection

**Files:**
- Create: `src/collections/Prompts.ts`

- [ ] **Step 1: Write `src/collections/Prompts.ts`**

```typescript
import type { CollectionConfig } from 'payload'

export const Prompts: CollectionConfig = {
  slug: 'prompts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'artStyle', 'contentType'],
    group: 'Content',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
  },
  versions: {
    drafts: true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },

    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      hasMany: false,
    },
    {
      name: 'artStyle',
      type: 'relationship',
      relationTo: 'art-styles',
      required: true,
      hasMany: false,
    },
    {
      name: 'tools',
      type: 'relationship',
      relationTo: 'tools',
      required: true,
      hasMany: true,
      admin: { description: 'Which tools this prompt is tested/compatible with.' },
    },
    {
      name: 'contentType',
      type: 'select',
      required: true,
      options: [
        { label: 'Single-frame', value: 'single' },
        { label: 'Chain', value: 'chain' },
      ],
      defaultValue: 'single',
    },

    {
      name: 'referenceRequired',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Does running this prompt require the user to upload a reference photo?' },
    },
    {
      name: 'referenceNote',
      type: 'text',
      admin: {
        description: 'e.g. "Face only", "Face + outfit", "Outfit only (no face)", "Couple (multi-face)"',
        condition: (data) => Boolean(data.referenceRequired),
      },
    },

    { name: 'blurb', type: 'textarea', required: true },

    {
      name: 'promptText',
      type: 'textarea',
      admin: {
        description: 'The full copyable prompt text.',
        condition: (data) => data.contentType === 'single',
      },
    },

    {
      name: 'steps',
      type: 'array',
      admin: {
        description: 'Ordered steps — each carries context forward from the last.',
        condition: (data) => data.contentType === 'chain',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'note', type: 'text', required: true },
        { name: 'promptText', type: 'textarea', required: true },
        { name: 'exampleResult', type: 'upload', relationTo: 'media' },
      ],
    },

    {
      name: 'exampleResults',
      type: 'array',
      admin: {
        description: 'Result image variations shown in the gallery.',
        condition: (data) => data.contentType === 'single',
      },
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'note', type: 'text' },
      ],
    },

    {
      name: 'quickAnswer',
      type: 'textarea',
      admin: { description: 'Direct, citable 1–2 sentence summary shown at the top of the page.' },
    },
    {
      name: 'article',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'paragraphs', type: 'array', fields: [{ name: 'text', type: 'textarea' }] },
        { name: 'tips', type: 'array', fields: [{ name: 'text', type: 'text' }] },
      ],
    },
    {
      name: 'faqs',
      type: 'array',
      admin: { description: 'Ships as FAQPage JSON-LD schema on the frontend.' },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },

    {
      name: 'similarPrompts',
      type: 'relationship',
      relationTo: 'prompts',
      hasMany: true,
    },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/collections/Prompts.ts
git commit -m "feat: add Prompts collection"
```

---

## Task 7: Payload config

**Files:**
- Create: `src/payload.config.ts`

- [ ] **Step 1: Write `src/payload.config.ts`**

```typescript
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
  collections: [Users, Media, Subjects, ArtStyles, Tools, Prompts],
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
```

- [ ] **Step 2: Commit**

```bash
git add src/payload.config.ts
git commit -m "feat: wire payload.config.ts with postgres adapter and all collections"
```

---

## Task 8: Payload Next.js integration routes

**Files:**
- Create: `src/app/(payload)/layout.tsx`
- Create: `src/app/(payload)/custom.scss`
- Create: `src/app/(payload)/admin/importMap.js`
- Create: `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Create: `src/app/(payload)/admin/[[...segments]]/not-found.tsx`
- Create: `src/app/(payload)/api/[...slug]/route.ts`
- Create: `src/app/(payload)/api/graphql/route.ts`
- Create: `src/app/(payload)/api/graphql-playground/route.ts`
- Create: `src/app/favicon.ico` placeholder (skip if one already exists from a prior step)

These files are standard Payload/Next.js glue — they don't change per-project except the import
map, which gets regenerated in Task 9.

- [ ] **Step 1: Write `src/app/(payload)/layout.tsx`**

```typescript
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
```

- [ ] **Step 2: Create empty `src/app/(payload)/custom.scss`**

```scss
```

- [ ] **Step 3: Write a placeholder `src/app/(payload)/admin/importMap.js`**

```javascript
/** @type import('payload').ImportMap */
export const importMap = {}
```

This gets overwritten by the real generated map in Task 9 — Payload only needs the file to exist
right now so the layout above can import it.

- [ ] **Step 4: Write `src/app/(payload)/admin/[[...segments]]/page.tsx`**

```typescript
import type { Metadata } from 'next'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap })

export default Page
```

- [ ] **Step 5: Write `src/app/(payload)/admin/[[...segments]]/not-found.tsx`**

```typescript
import type { Metadata } from 'next'

import config from '@payload-config'
import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({ config, params, searchParams, importMap })

export default NotFound
```

- [ ] **Step 6: Write `src/app/(payload)/api/[...slug]/route.ts`**

```typescript
import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
```

- [ ] **Step 7: Write `src/app/(payload)/api/graphql/route.ts`**

```typescript
import config from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

export const POST = GRAPHQL_POST(config)

export const OPTIONS = REST_OPTIONS(config)
```

- [ ] **Step 8: Write `src/app/(payload)/api/graphql-playground/route.ts`**

```typescript
import config from '@payload-config'
import '@payloadcms/next/css'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

export const GET = GRAPHQL_PLAYGROUND_GET(config)
```

- [ ] **Step 9: Commit**

```bash
git add "src/app/(payload)"
git commit -m "feat: add Payload Next.js integration routes"
```

---

## Task 9: Environment config and SSH tunnel for local dev

**Files:**
- Create: `.env.example`
- Create: `scripts/db-tunnel.sh`

- [ ] **Step 1: Write `.env.example`**

```
DATABASE_URI=postgresql://promptgalaxy_admin:PASSWORD@127.0.0.1:5433/promptgalaxy_prod
PAYLOAD_SECRET=
```

- [ ] **Step 2: Write `scripts/db-tunnel.sh`** (opens a local port 5433 forwarding to the VPS's Postgres on 5432, so local dev talks to the one real database instead of a separate local copy)

```bash
#!/usr/bin/env bash
# Run this in its own terminal and leave it running while you use `pnpm dev`.
ssh -N -L 5433:127.0.0.1:5432 root@46.250.239.74
```

- [ ] **Step 3: Create your real `.env` (gitignored, not committed)**

```bash
cp .env.example .env
```
Edit `.env`: set `DATABASE_URI` password to the `<DB_PASSWORD>` from Task 1, and generate a
`PAYLOAD_SECRET`:
```bash
openssl rand -base64 32
```
Paste that value in as `PAYLOAD_SECRET`.

- [ ] **Step 4: Commit (only the example file and script — `.env` is gitignored)**

```bash
chmod +x scripts/db-tunnel.sh
git add .env.example scripts/db-tunnel.sh
git commit -m "chore: add env example and db tunnel helper script"
```

---

## Task 10: First run — generate types, start dev server, verify admin loads

**Files:** none (generates `src/payload-types.ts`, overwrites `src/app/(payload)/admin/importMap.js`)

- [ ] **Step 1: Start the DB tunnel in its own terminal**

```bash
bash scripts/db-tunnel.sh
```
Leave this running. Expected: no output, connection stays open (this is normal for `-N`).

- [ ] **Step 2: Generate the real import map**

In a second terminal:
```bash
pnpm generate:importmap
```
Expected: overwrites `src/app/(payload)/admin/importMap.js` with real (possibly empty, since we
have no custom admin components yet) content, exits 0.

- [ ] **Step 3: Generate types**

```bash
pnpm generate:types
```
Expected: creates `src/payload-types.ts`, exits 0. This confirms the Postgres connection works —
if `DATABASE_URI` or the tunnel is wrong, this step fails with a connection error.

- [ ] **Step 4: Start the dev server**

```bash
pnpm dev
```
Expected: `Ready in ...ms`, listening on `http://localhost:3000`.

- [ ] **Step 5: Verify the admin panel loads and create the first admin user**

Open `http://localhost:3000/admin` in a browser. Expected: Payload's "Create your first user"
screen appears (this is normal — the `users` table is empty). Create an account with your own
email/password. Expected: redirects to the admin dashboard showing collections grouped
"Taxonomy" (Subjects, Art Styles, Tools) and "Content" (Prompts), plus Media and Users.

- [ ] **Step 6: Commit the generated import map**

`src/payload-types.ts` is intentionally NOT committed — it's gitignored (see Task 2's
`.gitignore`) since it's fully derived from the collection files already in the repo and
regenerates identically via `pnpm generate:types`. Only the import map is real, committed state:

```bash
git add "src/app/(payload)/admin/importMap.js"
git commit -m "chore: generate payload import map"
```

---

## Task 11: Seed initial taxonomy

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Write `scripts/seed.ts`**

```typescript
import { getPayload } from 'payload'
import config from '../src/payload.config'

const subjects = [
  { name: 'Travel', slug: 'travel' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Portrait Photography', slug: 'portrait-photography' },
  { name: 'Retro', slug: 'retro' },
  { name: 'Comic', slug: 'comic' },
  { name: 'Painterly', slug: 'painterly' },
]

const tools = [
  { name: 'ChatGPT', slug: 'chatgpt', vendor: 'OpenAI', supportsReferenceImage: true, supportsChains: true },
  { name: 'Nano Banana', slug: 'nano-banana', vendor: 'Google', supportsReferenceImage: true, supportsChains: false },
  { name: 'Seedream', slug: 'seedream', vendor: 'ByteDance', supportsReferenceImage: false, supportsChains: false },
  { name: 'Flux', slug: 'flux', vendor: 'Black Forest Labs', supportsReferenceImage: false, supportsChains: false },
  { name: 'Midjourney', slug: 'midjourney', vendor: 'Midjourney Inc.', supportsReferenceImage: false, supportsChains: false },
]

async function seed() {
  const payload = await getPayload({ config })

  for (const subject of subjects) {
    const existing = await payload.find({
      collection: 'subjects',
      where: { slug: { equals: subject.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'subjects', data: subject })
      console.log(`created subject: ${subject.name}`)
    }
  }

  for (const tool of tools) {
    const existing = await payload.find({
      collection: 'tools',
      where: { slug: { equals: tool.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'tools', data: tool })
      console.log(`created tool: ${tool.name}`)
    }
  }

  console.log('seed complete')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
```

Note: Art Styles are intentionally left empty — the source plan only enumerates the 6 Subjects and
5 Tools explicitly; Art Styles (e.g. "Photorealistic", "Cyberpunk") weren't pinned down yet, so
that's a real admin-panel task for you rather than a guess baked into a seed script.

- [ ] **Step 2: Run it (with the DB tunnel from Task 10 still running)**

```bash
pnpm seed
```
Expected: prints `created subject: ...` six times, `created tool: ...` five times, then `seed complete`.

- [ ] **Step 3: Verify in the admin panel**

Refresh `http://localhost:3000/admin/collections/subjects` — expect 6 rows. Refresh
`http://localhost:3000/admin/collections/tools` — expect 5 rows.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: add taxonomy seed script"
```

---

## Task 12: Manual verification — one Prompt of each content type

**Files:** none (content created through the admin UI, not code)

- [ ] **Step 1: Create a single-frame prompt**

In `http://localhost:3000/admin/collections/prompts`, create a new prompt: set `contentType` to
"Single-frame", fill `title`, `slug`, `subject` (pick one seeded), `artStyle` (create one inline if
none exist yet), `tools` (pick one or more seeded), `blurb`, `promptText`. Expected: `promptText`
field is visible, `steps` field is hidden (conditional on `contentType === 'chain'`).

- [ ] **Step 2: Create a chain prompt**

Create another prompt with `contentType` set to "Chain". Expected: `promptText` field disappears,
`steps` array field appears instead. Add 2 steps with `label`, `note`, `promptText`.

- [ ] **Step 3: Verify the reference-image conditional field**

On either prompt, check `referenceRequired`. Expected: `referenceNote` field appears only once
checked, matching the "Reference Required" behavior from the project plan.

- [ ] **Step 4: Verify draft/publish**

Leave one prompt saved as a draft (don't click "Publish" — just "Save Draft" or leave it
unpublished), and click "Publish" on the other in the admin UI's document controls. Query the
public read API without auth:
```bash
curl -s http://localhost:3000/api/prompts | grep -o '"_status":"[a-z]*"'
```
Expected: only `"_status":"published"` appears — the draft one is filtered out for anonymous reads,
confirming the `access.read` rule in `src/collections/Prompts.ts` correctly checks Payload's real
publish state.

No commit — this task only creates database rows, not files.

---

## Task 13: PM2 deploy to the VPS

**Files:**
- Create: `ecosystem.config.js`

- [ ] **Step 1: Write `ecosystem.config.js`**

```javascript
module.exports = {
  apps: [
    {
      name: 'thepromptgalaxy',
      cwd: '/opt/apps/thepromptgalaxy',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
      },
    },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add ecosystem.config.js
git commit -m "chore: add PM2 ecosystem config for VPS deploy"
```

- [ ] **Step 3: Package the app for transfer**

```bash
tar --exclude=node_modules --exclude=.git --exclude=.next -czf ../thepromptgalaxy-deploy.tar.gz .
```

- [ ] **Step 4: Copy it to the VPS**

```bash
"/c/Program Files/PuTTY/pscp.exe" -pw <VPS_ROOT_PASSWORD> ../thepromptgalaxy-deploy.tar.gz root@46.250.239.74:/opt/apps/thepromptgalaxy-deploy.tar.gz
```

- [ ] **Step 5: Extract, install, build, and set the production `.env` on the VPS**

```bash
ssh root@46.250.239.74
mkdir -p /opt/apps/thepromptgalaxy
tar -xzf /opt/apps/thepromptgalaxy-deploy.tar.gz -C /opt/apps/thepromptgalaxy
cd /opt/apps/thepromptgalaxy
cp .env.example .env
```
Edit `.env` on the VPS: `DATABASE_URI=postgresql://promptgalaxy_admin:<DB_PASSWORD>@127.0.0.1:5432/promptgalaxy_prod`
(note: `127.0.0.1:5432` directly, no tunnel needed — the app runs on the same box as Postgres) and
the same `PAYLOAD_SECRET` value used locally.

```bash
pnpm install
pnpm build
```
Expected: build completes with `Compiled successfully`.

- [ ] **Step 6: Start with PM2 and verify**

```bash
pm2 start ecosystem.config.js
pm2 save
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3006/admin
```
Expected: `pm2 list` shows `thepromptgalaxy` as `online`; curl prints `200`.

- [ ] **Step 7: Verify reachable from outside** (no domain yet, so by IP:port)

From your local machine, open `http://46.250.239.74:3006/admin` in a browser. Expected: same admin
login screen as local dev, now pointed at the same production database.

No further commit — this task is a deploy operation, not a code change.

---

## Not covered by this plan (deliberately out of scope)
- Frontend browse/detail pages (Phase 2 of the project roadmap) — this plan only gets the CMS and
  admin control working.
- nginx vhost + Certbot SSL — blocked on a domain purchase, tracked separately.
- The VPS security hardening items in `docs/vps-security-todo.md` — independent of this plan,
  apply whenever ready.
- User accounts/saved prompts and submission/moderation workflow — flagged in the project plan as
  a later follow-up.
