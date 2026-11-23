import type { Metadata } from 'next'
import { dashboardContext, clientUploadsEnabled, findOrNotFound, one, readId } from '@/lib/dashboard/http'
import { articleToHtml } from '@/lib/dashboard/lexicalHtml'
import { PromptEditor, type PromptEditorInitial } from '@/components/dashboard/PromptEditor'
import type { UploadedMedia } from '@/components/dashboard/uploadMedia'
import type { ArtStyle, ContentType, Media, Prompt, Subject, Tool, User } from '@/payload-types'

export const metadata: Metadata = { title: 'Edit prompt' }

function mediaOf(value: number | Media | null | undefined): UploadedMedia | null {
  if (!value || typeof value !== 'object') return null
  return {
    id: value.id,
    alt: value.alt,
    filename: value.filename ?? null,
    url: value.url ?? null,
    thumb: value.sizes?.thumbnail?.url || value.url || null,
  }
}

function relId(value: number | { id: number } | null | undefined): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object') return value.id
  return null
}

export default async function EditPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string | string[] }>
}) {
  const { id: raw } = await params
  const id = readId(raw)
  const query = await searchParams
  const { payload, user } = await dashboardContext()
  const access = { user, overrideAccess: false as const }

  const [doc, subjects, artStyles, tools, contentTypes, users] = await Promise.all([
    findOrNotFound(() =>
      payload.findByID({
        collection: 'prompts',
        id,
        depth: 1,
        draft: true,
        ...access,
      }),
    ),
    payload.find({ collection: 'subjects', limit: 300, depth: 0, sort: 'sortOrder', select: { name: true, slug: true, colorHex: true }, ...access }),
    payload.find({ collection: 'art-styles', limit: 300, depth: 0, sort: 'sortOrder', select: { name: true, slug: true, colorHex: true }, ...access }),
    payload.find({ collection: 'tools', limit: 300, depth: 0, sort: 'sortOrder', select: { name: true, vendor: true }, ...access }),
    payload.find({ collection: 'content-types', limit: 100, depth: 0, sort: 'sortOrder', select: { name: true, usesSteps: true }, ...access }),
    payload.find({ collection: 'users', limit: 100, depth: 0, sort: 'email', select: { email: true, name: true }, ...access }),
  ])

  const prompt = doc as Prompt
  const initial: PromptEditorInitial = {
    id: prompt.id,
    title: prompt.title || '',
    blurb: prompt.blurb || '',
    slug: prompt.slug ?? null,
    status: prompt._status === 'published' ? 'published' : 'draft',
    subject: relId(prompt.subject),
    artStyle: relId(prompt.artStyle),
    contentType: relId(prompt.contentType),
    tools: (prompt.tools ?? []).map((row) => ({
      id: row.id ?? undefined,
      tool: relId(row.tool),
      fit: row.fit === 'great' ? 'great' : 'good',
    })),
    cover: mediaOf(prompt.coverImage),
    referenceRequired: Boolean(prompt.referenceRequired),
    referenceNote: prompt.referenceNote ?? '',
    promptText: prompt.promptText ?? '',
    steps: (prompt.steps ?? []).map((step) => ({
      id: step.id ?? undefined,
      label: step.label || '',
      note: step.note || '',
      promptText: step.promptText || '',
      example: mediaOf(step.exampleResult),
    })),
    examples: (prompt.exampleResults ?? []).map((row) => ({
      id: row.id ?? undefined,
      image: mediaOf(typeof row.image === 'object' ? row.image : null),
      note: row.note ?? '',
    })),
    quickAnswer: prompt.quickAnswer ?? '',
    articleHeading: prompt.article?.heading ?? '',
    articleHtml: articleToHtml(prompt.article?.body),
    articleBody: prompt.article?.body ?? null,
    faqs: (prompt.faqs ?? []).map((faq) => ({ id: faq.id ?? undefined, question: faq.question, answer: faq.answer })),
    similar: (prompt.similarPrompts ?? []).flatMap((item) =>
      typeof item === 'object' && item ? [{ id: item.id, title: item.title }] : [],
    ),
    metaTitle: prompt.seo?.metaTitle ?? '',
    metaDescription: prompt.seo?.metaDescription ?? '',
    verifiedBy: relId(prompt.verification?.verifiedBy),
    lastVerified: prompt.verification?.lastVerified ?? null,
  }

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Prompts</p>
          <h1>{prompt.title || 'Edit prompt'}</h1>
        </div>
      </header>
      <PromptEditor
        initial={initial}
        saved={one(query.saved) === '1'}
        clientUploads={clientUploadsEnabled()}
        subjects={subjects.docs.map((item) => ({ id: item.id, label: (item as Subject).name, slug: (item as Subject).slug, color: (item as Subject).colorHex }))}
        artStyles={artStyles.docs.map((item) => ({ id: item.id, label: (item as ArtStyle).name, slug: (item as ArtStyle).slug, color: (item as ArtStyle).colorHex }))}
        tools={tools.docs.map((item) => ({ id: item.id, label: (item as Tool).vendor ? `${(item as Tool).name} · ${(item as Tool).vendor}` : (item as Tool).name }))}
        contentTypes={contentTypes.docs.map((item) => ({ id: item.id, label: (item as ContentType).name, usesSteps: Boolean((item as ContentType).usesSteps) }))}
        verifiers={users.docs.map((item) => ({ id: item.id, label: (item as User).name || (item as User).email }))}
      />
    </>
  )
}
