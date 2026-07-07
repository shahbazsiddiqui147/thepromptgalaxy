# Public Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing website (Homepage, Subject/Style/Tool/Chains archives, Prompt
detail pages) on top of the already-deployed Payload CMS, per the approved design spec.

**Architecture:** Next.js App Router server components reading Payload via its Local API
(in-process, no HTTP hop). ISR for caching + on-demand revalidation via a Payload `afterChange`
hook calling `revalidatePath` directly (same process). Content Type becomes a real admin-managed
collection, replacing the current hardcoded 2-option dropdown.

**Tech Stack:** Next.js 16 (App Router), Payload 3.85.2 Local API, `next/font/google` (real
self-hosted Google Fonts — no CDN dependency, unlike the sandboxed artifact previews), plain CSS
custom properties (no Tailwind — not currently a dependency, not adding one).

**Spec:** `docs/superpowers/specs/2026-07-07-public-frontend-design.md`

---

## Task 1: ContentTypes collection

**Files:**
- Create: `src/collections/ContentTypes.ts`

- [ ] **Step 1: Write `src/collections/ContentTypes.ts`**

```typescript
import type { CollectionConfig } from 'payload'

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
```

- [ ] **Step 2: Commit**

```bash
git add src/collections/ContentTypes.ts
git commit -m "feat: add ContentTypes collection"
```

---

## Task 2: Convert Prompts.contentType to a relationship

**Files:**
- Modify: `src/collections/Prompts.ts`

- [ ] **Step 1: Replace the `contentType` field and add the synced `contentTypeUsesSteps` field**

In `src/collections/Prompts.ts`, replace this block (currently lines 45–54):

```typescript
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
```

with:

```typescript
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
      required: true,
      hasMany: false,
    },
    {
      name: 'contentTypeUsesSteps',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
        description: 'Synced automatically from the selected Content Type — not editable directly.',
      },
    },
```

- [ ] **Step 2: Update the conditional fields that checked the old string value**

Replace (currently lines 73–80):

```typescript
    {
      name: 'promptText',
      type: 'textarea',
      admin: {
        description: 'The full copyable prompt text.',
        condition: (data) => data.contentType === 'single',
      },
    },
```

with:

```typescript
    {
      name: 'promptText',
      type: 'textarea',
      admin: {
        description: 'The full copyable prompt text.',
        condition: (data) => !data.contentTypeUsesSteps,
      },
    },
```

Replace (currently lines 82–95):

```typescript
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
```

with:

```typescript
    {
      name: 'steps',
      type: 'array',
      admin: {
        description: 'Ordered steps — each carries context forward from the last.',
        condition: (data) => Boolean(data.contentTypeUsesSteps),
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'note', type: 'text', required: true },
        { name: 'promptText', type: 'textarea', required: true },
        { name: 'exampleResult', type: 'upload', relationTo: 'media' },
      ],
    },
```

Replace (currently lines 97–108):

```typescript
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
```

with:

```typescript
    {
      name: 'exampleResults',
      type: 'array',
      admin: {
        description: 'Result image variations shown in the gallery.',
        condition: (data) => !data.contentTypeUsesSteps,
      },
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'note', type: 'text' },
      ],
    },
```

- [ ] **Step 3: Add the sync hook**

Add a `hooks` block to the collection config (as a sibling of `access`, `versions`, `fields` — after
the closing `]` of `fields`, before the final `}`):

```typescript
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (data.contentType) {
          const contentTypeId =
            typeof data.contentType === 'object' ? data.contentType.id : data.contentType
          const contentType = await req.payload.findByID({
            collection: 'content-types',
            id: contentTypeId,
          })
          data.contentTypeUsesSteps = Boolean(contentType?.usesSteps)
        }
        return data
      },
    ],
  },
```

- [ ] **Step 4: Commit**

```bash
git add src/collections/Prompts.ts
git commit -m "feat: convert Prompts.contentType to an admin-managed relationship"
```

---

## Task 3: Register ContentTypes in payload.config.ts

**Files:**
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Import and register the collection**

Change:

```typescript
import { Prompts } from './collections/Prompts'
```

to:

```typescript
import { Prompts } from './collections/Prompts'
import { ContentTypes } from './collections/ContentTypes'
```

Change:

```typescript
  collections: [Users, Media, Subjects, ArtStyles, Tools, Prompts],
```

to:

```typescript
  collections: [Users, Media, Subjects, ArtStyles, Tools, ContentTypes, Prompts],
```

- [ ] **Step 2: Commit**

```bash
git add src/payload.config.ts
git commit -m "feat: register ContentTypes collection in payload config"
```

---

## Task 4: Seed content types and fix existing test prompts

**Files:**
- Modify: `scripts/seed.ts`

- [ ] **Step 1: Add content types to the seed script**

Add near the top of `scripts/seed.ts`, after the `tools` array:

```typescript
const contentTypes = [
  { name: 'Single-frame', slug: 'single', usesSteps: false },
  { name: 'Chain', slug: 'chain', usesSteps: true },
]
```

Add a seeding loop inside `seed()`, after the `tools` loop and before `console.log('seed complete')`:

```typescript
  for (const contentType of contentTypes) {
    const existing = await payload.find({
      collection: 'content-types',
      where: { slug: { equals: contentType.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'content-types', data: contentType })
      console.log(`created content type: ${contentType.name}`)
    }
  }
```

- [ ] **Step 2: Run the seed script** (SSH tunnel to the VPS Postgres must be running — see
`scripts/db-tunnel.sh`)

```bash
pnpm seed
```
Expected: prints `created content type: Single-frame` and `created content type: Chain` (the
subjects/tools lines won't reprint since they already exist).

- [ ] **Step 3: Manually fix the two existing test prompts**

The schema change from Task 2 changes `contentType` from a text enum to a relationship — Payload's
Postgres adapter auto-syncs the column type in dev, which means the two test prompts created in an
earlier session (`Golden Hour Overlook`, `Studio to Tokyo Street Relocate`) will have lost their
`contentType` value (this only affects those 2 rows of pre-launch test data, not real content).

Log into `/admin` → Prompts → open each of the two existing prompts → re-select the correct
Content Type (`Single-frame` for Golden Hour Overlook, `Chain` for Studio to Tokyo Street Relocate)
→ Publish. Confirm the correct fields appear (Prompt Text for the first, Steps for the second).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: seed content types"
```

---

## Task 5: Trailing slashes

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add `trailingSlash: true`**

Change:

```typescript
const nextConfig: NextConfig = {
  images: {
```

to:

```typescript
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
```

- [ ] **Step 2: Verify redirect behavior**

```bash
pnpm dev
```
In another terminal, once ready:
```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/admin
```
Expected: `308 -> http://localhost:3000/admin/` (permanent redirect to the trailing-slash form).

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: enforce trailing slashes on all routes"
```

---

## Task 6: Fonts and design tokens

**Files:**
- Create: `src/app/(site)/fonts.ts`
- Create: `src/app/(site)/globals.css`

- [ ] **Step 1: Write `src/app/(site)/fonts.ts`**

Real Google Fonts, self-hosted at build time by Next.js (no runtime CDN dependency):

```typescript
import { Anton, Archivo, JetBrains_Mono } from 'next/font/google'

export const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

export const archivo = Archivo({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
```

- [ ] **Step 2: Write `src/app/(site)/globals.css`**

```css
:root {
  --ink: #12141f;
  --ink-panel: #1a1d2e;
  --border: #2a2e42;
  --paper: #e8ecf5;
  --amber: #c9a227;
  --rust: #b8472a;
  --steel: #5c7a82;
  --fade: #8a8fa8;
  --sage: #7c8b6f;
  --teal: #4f8a8b;
  --violet: #7b6c94;
  --coral: #d97757;
  --mustard: #c9a227;
  --plum: #8c5e71;
  --periwinkle: #6b7fbe;
  --leaf: #8fa876;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

body {
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-archivo), sans-serif;
  min-height: 100vh;
}

.display {
  font-family: var(--font-anton), sans-serif;
  letter-spacing: 0.01em;
  text-wrap: balance;
}

.mono {
  font-family: var(--font-mono), monospace;
}

button {
  font-family: inherit;
}

::selection {
  background: var(--amber);
  color: var(--ink);
}

:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}

.constellation {
  height: 14px;
  background-image: repeating-radial-gradient(
    circle at 12px 7px,
    #c9a22766 0px,
    #c9a22766 1.5px,
    transparent 2px,
    transparent 30px
  );
  background-size: 30px 14px;
}

.wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/fonts.ts" "src/app/(site)/globals.css"
git commit -m "feat: add self-hosted fonts and design tokens for the public site"
```

---

## Task 7: Data query layer

**Files:**
- Create: `src/lib/payload-client.ts`
- Create: `src/lib/queries.ts`

- [ ] **Step 1: Write `src/lib/payload-client.ts`**

```typescript
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getPayloadClient() {
  return getPayload({ config })
}
```

- [ ] **Step 2: Write `src/lib/queries.ts`**

```typescript
import { getPayloadClient } from './payload-client'
import type { Subject, ArtStyle, Tool, Prompt } from '@/payload-types'

export const MIN_PROMPTS_FOR_COMBO_PAGE = 3

export async function getSubjects(): Promise<Subject[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({ collection: 'subjects', limit: 100, sort: 'sortOrder' })
  return result.docs
}

export async function getArtStyles(): Promise<ArtStyle[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({ collection: 'art-styles', limit: 100, sort: 'sortOrder' })
  return result.docs
}

export async function getTools(): Promise<Tool[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'tools',
    where: { active: { equals: true } },
    limit: 100,
    sort: 'sortOrder',
  })
  return result.docs
}

export async function getSubjectBySlug(slug: string): Promise<Subject | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'subjects',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getArtStyleBySlug(slug: string): Promise<ArtStyle | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'art-styles',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getToolBySlug(slug: string): Promise<Tool | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'tools',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getPromptsBySubject(subjectId: number): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ subject: { equals: subjectId } }, { _status: { equals: 'published' } }] },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

export async function getPromptsByArtStyle(artStyleId: number): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ artStyle: { equals: artStyleId } }, { _status: { equals: 'published' } }] },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

export async function getPromptsByTool(toolId: number): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ tools: { equals: toolId } }, { _status: { equals: 'published' } }] },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

export async function getPromptsBySubjectAndStyle(
  subjectId: number,
  artStyleId: number,
): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: {
      and: [
        { subject: { equals: subjectId } },
        { artStyle: { equals: artStyleId } },
        { _status: { equals: 'published' } },
      ],
    },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

export async function getChainPrompts(): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: {
      and: [{ contentTypeUsesSteps: { equals: true } }, { _status: { equals: 'published' } }],
    },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

export async function getRecentPrompts(limit = 8): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { _status: { equals: 'published' } },
    depth: 2,
    sort: '-createdAt',
    limit,
  })
  return result.docs
}

export async function getPromptBySlug(slug: string): Promise<Prompt | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    depth: 2,
    limit: 1,
  })
  return result.docs[0] ?? null
}
```

- [ ] **Step 3: Verify types resolve**

```bash
pnpm generate:types
pnpm exec tsc --noEmit
```
Expected: no errors. (`generate:types` must run after Task 2's schema change so `Prompt` in
`payload-types.ts` reflects the new relationship field.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/payload-client.ts src/lib/queries.ts
git commit -m "feat: add Payload query layer for the public frontend"
```

---

## Task 8: Shared UI components

**Files:**
- Create: `src/components/JsonLd.tsx`
- Create: `src/components/Breadcrumbs.tsx`
- Create: `src/components/PromptCard.tsx`
- Create: `src/components/CopyBox.tsx`
- Create: `src/components/QuickAnswer.tsx`
- Create: `src/components/FaqAccordion.tsx`

- [ ] **Step 1: Write `src/components/JsonLd.tsx`**

```typescript
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

- [ ] **Step 2: Write `src/components/Breadcrumbs.tsx`**

```typescript
import Link from 'next/link'
import { JsonLd } from './JsonLd'

type Crumb = { label: string; href: string }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: `https://thepromptgalaxy.com${crumb.href}`,
    })),
  }

  return (
    <nav className="mono" style={{ fontSize: 11, color: 'var(--fade)', display: 'flex', gap: 6 }}>
      <JsonLd data={schema} />
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} style={{ display: 'flex', gap: 6 }}>
          {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
          {i === crumbs.length - 1 ? (
            <span>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} style={{ color: 'var(--fade)' }}>
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Write `src/components/PromptCard.tsx`**

```typescript
import Link from 'next/link'
import type { Prompt, Subject, ArtStyle } from '@/payload-types'

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const href = `/${subject.slug}/${artStyle.slug}/${prompt.slug}/`

  return (
    <article
      style={{
        background: 'var(--paper)',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            height: 130,
            background: `linear-gradient(135deg, ${artStyle.colorHex ?? '#5C7A82'}55, var(--ink))`,
          }}
        />
        <div style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            {prompt.title}
          </div>
          <div style={{ fontSize: 12.5, color: '#6E7392', lineHeight: 1.4 }}>{prompt.blurb}</div>
        </div>
      </Link>
    </article>
  )
}
```

- [ ] **Step 4: Write `src/components/CopyBox.tsx`**

```typescript
'use client'

import { useState } from 'react'

export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be unavailable; still flip UI state
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div style={{ position: 'relative' }}>
      <pre
        style={{
          background: 'var(--ink-panel)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '18px 50px 18px 18px',
          color: 'var(--paper)',
          fontSize: 13.5,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          margin: 0,
        }}
      >
        {text}
      </pre>
      <button
        onClick={onCopy}
        title="Copy prompt"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: copied ? '#3E5A3F' : '#232640',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: 7,
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/QuickAnswer.tsx`**

```typescript
export function QuickAnswer({ text }: { text: string }) {
  return (
    <div
      style={{
        background: '#1E2138',
        border: '1px solid #C9A22755',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 4,
        padding: '14px 16px',
        marginBottom: 24,
      }}
    >
      <div className="mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '0.15em', marginBottom: 6 }}>
        QUICK ANSWER
      </div>
      <p style={{ color: 'var(--paper)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  )
}
```

- [ ] **Step 6: Write `src/components/FaqAccordion.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { JsonLd } from './JsonLd'

type Faq = { question: string; answer: string }

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  return (
    <div style={{ marginTop: 40 }}>
      <JsonLd data={schema} />
      <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 4 }}>
        FREQUENTLY ASKED QUESTIONS
      </div>
      {faqs.map((f, i) => (
        <div key={f.question} style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '14px 4px',
              textAlign: 'left',
              color: 'var(--paper)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span>{f.question}</span>
            <span style={{ color: 'var(--amber)' }}>{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && (
            <p style={{ color: 'var(--fade)', fontSize: 13.5, lineHeight: 1.55, margin: '0 4px 16px' }}>
              {f.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/JsonLd.tsx src/components/Breadcrumbs.tsx src/components/PromptCard.tsx src/components/CopyBox.tsx src/components/QuickAnswer.tsx src/components/FaqAccordion.tsx
git commit -m "feat: add shared UI components for the public frontend"
```

---

## Task 9: Site layout

**Files:**
- Create: `src/app/(site)/layout.tsx`

- [ ] **Step 1: Write `src/app/(site)/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { anton, archivo, jetbrainsMono } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Prompt Galaxy',
  description: 'Every look, every tool, charted in one place.',
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="constellation" />
        <header className="wrap" style={{ padding: '16px 24px' }}>
          <Link href="/" style={{ color: 'var(--paper)', textDecoration: 'none' }} className="display">
            THE PROMPT GALAXY
          </Link>
        </header>
        <main>{children}</main>
        <div className="constellation" />
        <footer className="wrap" style={{ padding: '20px 24px 40px' }}>
          <p className="mono" style={{ color: 'var(--fade)', fontSize: 11 }}>
            &copy; {new Date().getFullYear()} The Prompt Galaxy
          </p>
        </footer>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(site)/layout.tsx"
git commit -m "feat: add public site layout"
```

---

## Task 10: Homepage

**Files:**
- Create: `src/app/(site)/page.tsx`

- [ ] **Step 1: Write `src/app/(site)/page.tsx`**

```typescript
import Link from 'next/link'
import { getSubjects, getRecentPrompts, getChainPrompts } from '@/lib/queries'
import { PromptCard } from '@/components/PromptCard'
import type { Subject } from '@/payload-types'

export const revalidate = 3600

export default async function HomePage() {
  const [subjects, recentPrompts, chainPrompts] = await Promise.all([
    getSubjects(),
    getRecentPrompts(8),
    getChainPrompts(),
  ])

  return (
    <div className="wrap" style={{ padding: '48px 24px' }}>
      <section style={{ marginBottom: 48 }}>
        <div className="eyebrow mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '0.2em', marginBottom: 10 }}>
          THEPROMPTGALAXY.COM
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 6vw, 64px)', margin: 0 }}>
          THE PROMPT GALAXY
        </h1>
        <p style={{ color: 'var(--fade)', fontSize: 16, maxWidth: 560, marginTop: 14 }}>
          Every look, every tool, charted in one place. Start wherever you think: the subject, the
          look, the tool, or the format.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
          FEATURED PROMPTS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {recentPrompts.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
          BROWSE BY SUBJECT
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {subjects.map((s: Subject) => (
            <Link
              key={s.id}
              href={`/${s.slug}/`}
              className="mono"
              style={{
                padding: '8px 16px',
                borderRadius: 2,
                border: '1px solid var(--border)',
                color: 'var(--paper)',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              {s.name}
            </Link>
          ))}
          <Link
            href="/style/"
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--fade)', textDecoration: 'none', fontSize: 13 }}
          >
            All styles →
          </Link>
          <Link
            href="/tool/"
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--fade)', textDecoration: 'none', fontSize: 13 }}
          >
            All tools →
          </Link>
          <Link
            href="/chains/"
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--fade)', textDecoration: 'none', fontSize: 13 }}
          >
            Chains →
          </Link>
        </div>
      </section>

      {chainPrompts.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
            PROMPT CHAINS
          </div>
          <p style={{ color: 'var(--fade)', fontSize: 13, marginBottom: 16, maxWidth: 560 }}>
            Multi-step sequences where each frame carries context forward — nobody else in this
            space does this.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {chainPrompts.slice(0, 4).map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
          <Link href="/chains/" className="mono" style={{ color: 'var(--amber)', fontSize: 13 }}>
            View all chains →
          </Link>
        </section>
      )}

      <section style={{ marginBottom: 48 }}>
        <div
          className="mono"
          style={{
            maxWidth: 728,
            height: 90,
            margin: '0 auto',
            border: '1px dashed #3A3F5C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--fade)',
            letterSpacing: '0.1em',
          }}
        >
          AD SLOT · 728×90
        </div>
      </section>

      <section style={{ maxWidth: 620 }}>
        <p style={{ color: 'var(--fade)', fontSize: 13.5, lineHeight: 1.6 }}>
          The Prompt Galaxy is a library of AI image-generation prompts organized by subject, art
          style, and tool — including multi-step prompt chains and reference-image prompts, not
          just single-shot text.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(site)/page.tsx"
git commit -m "feat: add homepage"
```

---

## Task 11: Subject archive page

**Files:**
- Create: `src/components/ArchiveListing.tsx`
- Create: `src/app/(site)/[subject]/page.tsx`

- [ ] **Step 1: Write `src/components/ArchiveListing.tsx`**

```typescript
import { PromptCard } from './PromptCard'
import { Breadcrumbs } from './Breadcrumbs'
import { JsonLd } from './JsonLd'
import type { Prompt, Subject, ArtStyle } from '@/payload-types'

type Crumb = { label: string; href: string }

export function ArchiveListing({
  title,
  intro,
  prompts,
  crumbs,
  canonicalUrl,
}: {
  title: string
  intro: string
  prompts: Prompt[]
  crumbs: Crumb[]
  canonicalUrl: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: prompts.map((p, i) => {
        const promptSubject = p.subject as Subject
        const promptArtStyle = p.artStyle as ArtStyle
        return {
          '@type': 'ListItem',
          position: i + 1,
          url: `https://thepromptgalaxy.com/${promptSubject.slug}/${promptArtStyle.slug}/${p.slug}/`,
          name: p.title,
        }
      }),
    },
  }

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <JsonLd data={schema} />
      <Breadcrumbs crumbs={crumbs} />
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)', margin: '12px 0' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--fade)', fontSize: 15, maxWidth: 620, marginBottom: 24 }}>{intro}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {prompts.map((p) => (
          <PromptCard key={p.id} prompt={p} />
        ))}
        {prompts.length === 0 && (
          <p style={{ color: 'var(--fade)', gridColumn: '1/-1' }}>No prompts here yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/(site)/[subject]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getSubjects, getSubjectBySlug, getPromptsBySubject } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export async function generateStaticParams() {
  const subjects = await getSubjects()
  return subjects.map((s) => ({ subject: s.slug }))
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectSlug } = await params
  const subject = await getSubjectBySlug(subjectSlug)
  if (!subject) notFound()

  const prompts = await getPromptsBySubject(subject.id)

  return (
    <ArchiveListing
      title={subject.name}
      intro={subject.description || `Browse every ${subject.name} prompt in the library.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: subject.name, href: `/${subject.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/${subject.slug}/`}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ArchiveListing.tsx "src/app/(site)/[subject]/page.tsx"
git commit -m "feat: add Subject archive page"
```

---

## Task 12: Style archive page

**Files:**
- Create: `src/app/(site)/style/[style]/page.tsx`
- Create: `src/app/(site)/style/page.tsx`

- [ ] **Step 1: Write `src/app/(site)/style/[style]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getArtStyles, getArtStyleBySlug, getPromptsByArtStyle } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export async function generateStaticParams() {
  const styles = await getArtStyles()
  return styles.map((s) => ({ style: s.slug }))
}

export default async function StylePage({ params }: { params: Promise<{ style: string }> }) {
  const { style: styleSlug } = await params
  const artStyle = await getArtStyleBySlug(styleSlug)
  if (!artStyle) notFound()

  const prompts = await getPromptsByArtStyle(artStyle.id)

  return (
    <ArchiveListing
      title={artStyle.name}
      intro={`Every prompt tagged with the ${artStyle.name} art style, across all subjects.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: artStyle.name, href: `/style/${artStyle.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/style/${artStyle.slug}/`}
    />
  )
}
```

- [ ] **Step 2: Write `src/app/(site)/style/page.tsx`** (hub page listing all styles)

```typescript
import Link from 'next/link'
import { getArtStyles } from '@/lib/queries'

export const revalidate = 3600

export default async function StyleHubPage() {
  const styles = await getArtStyles()

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)' }}>Art Styles</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {styles.map((s) => (
          <Link
            key={s.id}
            href={`/style/${s.slug}/`}
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--paper)', textDecoration: 'none', fontSize: 13 }}
          >
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/style"
git commit -m "feat: add Style archive and hub pages"
```

---

## Task 13: Tool archive page

**Files:**
- Create: `src/app/(site)/tool/[tool]/page.tsx`
- Create: `src/app/(site)/tool/page.tsx`

- [ ] **Step 1: Write `src/app/(site)/tool/[tool]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getTools, getToolBySlug, getPromptsByTool } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export async function generateStaticParams() {
  const tools = await getTools()
  return tools.map((t) => ({ tool: t.slug }))
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolSlug } = await params
  const tool = await getToolBySlug(toolSlug)
  if (!tool) notFound()

  const prompts = await getPromptsByTool(tool.id)

  return (
    <ArchiveListing
      title={tool.name}
      intro={`Every prompt tested and tagged compatible with ${tool.name}.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: tool.name, href: `/tool/${tool.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/tool/${tool.slug}/`}
    />
  )
}
```

- [ ] **Step 2: Write `src/app/(site)/tool/page.tsx`** (hub page listing all tools)

```typescript
import Link from 'next/link'
import { getTools } from '@/lib/queries'

export const revalidate = 3600

export default async function ToolHubPage() {
  const tools = await getTools()

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)' }}>Tools</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {tools.map((t) => (
          <Link
            key={t.id}
            href={`/tool/${t.slug}/`}
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--paper)', textDecoration: 'none', fontSize: 13 }}
          >
            {t.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/tool"
git commit -m "feat: add Tool archive and hub pages"
```

---

## Task 14: Subject+Style combo archive page

**Files:**
- Create: `src/app/(site)/[subject]/[style]/page.tsx`

- [ ] **Step 1: Write `src/app/(site)/[subject]/[style]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import {
  getSubjectBySlug,
  getArtStyleBySlug,
  getPromptsBySubjectAndStyle,
  MIN_PROMPTS_FOR_COMBO_PAGE,
} from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600
export const dynamicParams = true

export default async function SubjectStylePage({
  params,
}: {
  params: Promise<{ subject: string; style: string }>
}) {
  const { subject: subjectSlug, style: styleSlug } = await params
  const [subject, artStyle] = await Promise.all([
    getSubjectBySlug(subjectSlug),
    getArtStyleBySlug(styleSlug),
  ])
  if (!subject || !artStyle) notFound()

  const prompts = await getPromptsBySubjectAndStyle(subject.id, artStyle.id)

  // Content-threshold gate: don't serve a thin combination page — see design spec §7.
  if (prompts.length < MIN_PROMPTS_FOR_COMBO_PAGE) notFound()

  return (
    <ArchiveListing
      title={`${artStyle.name} ${subject.name}`}
      intro={`${subject.name} prompts in the ${artStyle.name} style.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: subject.name, href: `/${subject.slug}/` },
        { label: artStyle.name, href: `/${subject.slug}/${artStyle.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/${subject.slug}/${artStyle.slug}/`}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(site)/[subject]/[style]"
git commit -m "feat: add Subject+Style combo archive page with content-threshold gating"
```

---

## Task 15: Prompt detail page

**Files:**
- Create: `src/app/(site)/[subject]/[style]/[prompt]/page.tsx`

- [ ] **Step 1: Write `src/app/(site)/[subject]/[style]/[prompt]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getPromptBySlug } from '@/lib/queries'
import { QuickAnswer } from '@/components/QuickAnswer'
import { CopyBox } from '@/components/CopyBox'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import type { Subject, ArtStyle, Tool } from '@/payload-types'

export const revalidate = 3600
export const dynamicParams = true

export default async function PromptPage({
  params,
}: {
  params: Promise<{ subject: string; style: string; prompt: string }>
}) {
  const { subject: subjectSlug, style: styleSlug, prompt: promptSlug } = await params
  const prompt = await getPromptBySlug(promptSlug)
  if (!prompt) notFound()

  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const tools = prompt.tools as Tool[]

  // The URL's subject/style segments must match the prompt's actual taxonomy —
  // otherwise this is a stale/incorrect link, not a valid alternate path.
  if (subject.slug !== subjectSlug || artStyle.slug !== styleSlug) notFound()

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: subject.name, href: `/${subject.slug}/` },
          { label: artStyle.name, href: `/${subject.slug}/${artStyle.slug}/` },
          { label: prompt.title, href: `/${subject.slug}/${artStyle.slug}/${prompt.slug}/` },
        ]}
      />
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)', margin: '12px 0' }}>
        {prompt.title}
      </h1>
      <p style={{ color: 'var(--fade)', fontSize: 15, maxWidth: 620, marginBottom: 16 }}>
        {prompt.blurb}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <span className="mono" style={{ background: 'var(--amber)', color: 'var(--ink)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {subject.name}
        </span>
        <span className="mono" style={{ background: 'var(--steel)', color: 'var(--paper)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {artStyle.name}
        </span>
        <span className="mono" style={{ background: 'var(--rust)', color: 'var(--paper)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {prompt.contentTypeUsesSteps ? 'Chain' : 'Single-frame'}
        </span>
        {prompt.referenceRequired && (
          <span className="mono" style={{ border: '1px solid var(--amber)', color: 'var(--amber)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
            Reference image required{prompt.referenceNote ? ` — ${prompt.referenceNote}` : ''}
          </span>
        )}
      </div>

      {prompt.quickAnswer && <QuickAnswer text={prompt.quickAnswer} />}

      {prompt.contentTypeUsesSteps ? (
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 6 }}>
            CHAIN STEPS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(prompt.steps ?? []).map((step, i) => (
              <div key={`${step.label}-${i}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span
                    className="mono"
                    style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--rust)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                  >
                    {i + 1}
                  </span>
                  <span className="mono" style={{ fontSize: 11 }}>{step.label.toUpperCase()}</span>
                  <span style={{ color: 'var(--fade)', fontSize: 12.5 }}>{step.note}</span>
                </div>
                <CopyBox text={step.promptText} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
            PROMPT
          </div>
          {prompt.promptText && <CopyBox text={prompt.promptText} />}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
          TESTED ON
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tools.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--ink-panel)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 14px' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {prompt.article?.heading && (
        <div style={{ marginTop: 40, maxWidth: 620 }}>
          <h2 className="display" style={{ fontSize: 22 }}>{prompt.article.heading}</h2>
          {(prompt.article.paragraphs ?? []).map((p, i) => (
            <p key={i} style={{ color: '#B8BEDA', fontSize: 14.5, lineHeight: 1.7, marginBottom: 14 }}>
              {p.text}
            </p>
          ))}
          {(prompt.article.tips ?? []).length > 0 && (
            <>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', margin: '20px 0 10px' }}>
                TIPS FOR BETTER RESULTS
              </div>
              <ul>
                {(prompt.article.tips ?? []).map((t, i) => (
                  <li key={i} style={{ color: '#B8BEDA', fontSize: 13.5, lineHeight: 1.6, marginBottom: 8 }}>
                    {t.text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {(prompt.faqs ?? []).length > 0 && (
        <FaqAccordion
          faqs={(prompt.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer }))}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(site)/[subject]/[style]/[prompt]"
git commit -m "feat: add Prompt detail page"
```

---

## Task 16: Chains archive page

**Files:**
- Create: `src/app/(site)/chains/page.tsx`

- [ ] **Step 1: Write `src/app/(site)/chains/page.tsx`**

```typescript
import { getChainPrompts } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export default async function ChainsPage() {
  const prompts = await getChainPrompts()

  return (
    <ArchiveListing
      title="Prompt Chains"
      intro="Multi-step prompt sequences — each step carries context forward from the last, run in order in the same conversation."
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: 'Chains', href: '/chains/' },
      ]}
      canonicalUrl="https://thepromptgalaxy.com/chains/"
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(site)/chains"
git commit -m "feat: add Chains archive page"
```

---

## Task 17: Browse page (interactive, noindex)

**Files:**
- Create: `src/app/(site)/browse/page.tsx`
- Create: `src/app/(site)/browse/BrowseClient.tsx`

- [ ] **Step 1: Write `src/app/(site)/browse/BrowseClient.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { PromptCard } from '@/components/PromptCard'
import type { Prompt, Subject, ArtStyle, Tool } from '@/payload-types'

export function BrowseClient({
  prompts,
  subjects,
  tools,
}: {
  prompts: Prompt[]
  subjects: Subject[]
  tools: Tool[]
}) {
  const [activeSubject, setActiveSubject] = useState<string>('All')
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      const subject = p.subject as Subject
      const promptTools = p.tools as Tool[]
      const subjectMatch = activeSubject === 'All' || subject.slug === activeSubject
      const toolMatch =
        activeTools.size === 0 || promptTools.some((t) => activeTools.has(t.slug))
      return subjectMatch && toolMatch
    })
  }, [prompts, activeSubject, activeTools])

  const toggleTool = (slug: string) => {
    setActiveTools((prev) => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)' }}>Browse</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        <button
          onClick={() => setActiveSubject('All')}
          style={{
            padding: '8px 16px',
            border: `1px solid ${activeSubject === 'All' ? 'var(--amber)' : 'var(--border)'}`,
            background: activeSubject === 'All' ? 'var(--amber)' : 'transparent',
            color: activeSubject === 'All' ? 'var(--ink)' : 'var(--paper)',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubject(s.slug)}
            style={{
              padding: '8px 16px',
              border: `1px solid ${activeSubject === s.slug ? 'var(--amber)' : 'var(--border)'}`,
              background: activeSubject === s.slug ? 'var(--amber)' : 'transparent',
              color: activeSubject === s.slug ? 'var(--ink)' : 'var(--paper)',
              cursor: 'pointer',
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTool(t.slug)}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: `1px solid ${activeTools.has(t.slug) ? 'var(--steel)' : 'var(--border)'}`,
              background: activeTools.has(t.slug) ? 'rgba(92,122,130,0.18)' : 'transparent',
              color: activeTools.has(t.slug) ? '#BFD3D7' : 'var(--fade)',
              cursor: 'pointer',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {filtered.map((p) => (
          <PromptCard key={p.id} prompt={p} />
        ))}
        {filtered.length === 0 && <p style={{ color: 'var(--fade)' }}>No prompts match these filters.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/(site)/browse/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { getRecentPrompts, getSubjects, getTools } from '@/lib/queries'
import { BrowseClient } from './BrowseClient'

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default async function BrowsePage() {
  const [prompts, subjects, tools] = await Promise.all([
    getRecentPrompts(200),
    getSubjects(),
    getTools(),
  ])

  return <BrowseClient prompts={prompts} subjects={subjects} tools={tools} />
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/browse"
git commit -m "feat: add interactive Browse page (noindex)"
```

---

## Task 18: On-demand revalidation

**Files:**
- Modify: `src/collections/Prompts.ts`

- [ ] **Step 1: Add an `afterChange` hook that revalidates affected pages**

In `src/collections/Prompts.ts`, add the import at the top:

```typescript
import { revalidatePath } from 'next/cache'
```

Extend the existing `hooks` block (added in Task 2) to include `afterChange`:

```typescript
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (data.contentType) {
          const contentTypeId =
            typeof data.contentType === 'object' ? data.contentType.id : data.contentType
          const contentType = await req.payload.findByID({
            collection: 'content-types',
            id: contentTypeId,
          })
          data.contentTypeUsesSteps = Boolean(contentType?.usesSteps)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const subject =
          typeof doc.subject === 'object'
            ? doc.subject
            : await req.payload.findByID({ collection: 'subjects', id: doc.subject })
        const artStyle =
          typeof doc.artStyle === 'object'
            ? doc.artStyle
            : await req.payload.findByID({ collection: 'art-styles', id: doc.artStyle })

        revalidatePath('/')
        revalidatePath(`/${subject.slug}/`)
        revalidatePath(`/${subject.slug}/${artStyle.slug}/`)
        revalidatePath(`/${subject.slug}/${artStyle.slug}/${doc.slug}/`)
        revalidatePath(`/style/${artStyle.slug}/`)
        revalidatePath('/chains/')
      },
    ],
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/collections/Prompts.ts
git commit -m "feat: revalidate affected pages when a prompt is published or edited"
```

---

## Task 19: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the DB tunnel and dev server**

```bash
bash scripts/db-tunnel.sh   # separate terminal, leave running
pnpm dev
```

- [ ] **Step 2: Fix the two pre-existing test prompts** (if not already done in Task 4 Step 3)

Visit `http://localhost:3000/admin/collections/prompts`, open each, re-set Content Type, Publish.

- [ ] **Step 3: Verify each page type loads with real content**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/travel/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/style/photorealistic/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/tool/chatgpt/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chains/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/travel/photorealistic/golden-hour-overlook/
```
Expected: all `200`.

- [ ] **Step 4: Verify trailing-slash redirect**

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/travel
```
Expected: `308` redirecting to `/travel/`.

- [ ] **Step 5: Verify the content-threshold gate**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/travel/photorealistic/
```
Expected: `404` (only 1 prompt currently exists for this combination, below the threshold of 3) —
confirms thin combination pages aren't served.

- [ ] **Step 6: Verify JSON-LD is present**

```bash
curl -s http://localhost:3000/travel/photorealistic/golden-hour-overlook/ | grep -o 'application/ld+json'
```
Expected: at least one match (from `FaqAccordion`'s `FAQPage` schema and `Breadcrumbs`'s
`BreadcrumbList` schema).

- [ ] **Step 7: Verify `/browse/` is noindex**

```bash
curl -s http://localhost:3000/browse/ | grep -i 'noindex'
```
Expected: a match in the response headers or meta tags.

No commit — this task is verification only.
