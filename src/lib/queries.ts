import { cache } from 'react'
import { getPayloadClient } from './payload-client'
import type { Subject, ArtStyle, Tool, Prompt } from '@/payload-types'

export const MIN_PROMPTS_FOR_COMBO_PAGE = 3

// Payload's Local API defaults `overrideAccess` to true, bypassing each collection's
// `access.read` control entirely -- every query below must filter status itself.
const PUBLISHED = { _status: { equals: 'published' } } as const

export const getAdSettings = cache(async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'ad-settings' })
})

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

export const getSubjectBySlug = cache(async (slug: string): Promise<Subject | null> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'subjects',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
})

export const getArtStyleBySlug = cache(async (slug: string): Promise<ArtStyle | null> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'art-styles',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
})

export const getToolBySlug = cache(async (slug: string): Promise<Tool | null> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'tools',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
})

export async function getPromptsBySubject(subjectId: number): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ subject: { equals: subjectId } }, PUBLISHED] },
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
    where: { and: [{ artStyle: { equals: artStyleId } }, PUBLISHED] },
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
    where: { and: [{ 'tools.tool': { equals: toolId } }, PUBLISHED] },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

export const getPromptsBySubjectAndStyle = cache(
  async (subjectId: number, artStyleId: number): Promise<Prompt[]> => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'prompts',
      where: {
        and: [
          { subject: { equals: subjectId } },
          { artStyle: { equals: artStyleId } },
          PUBLISHED,
        ],
      },
      depth: 2,
      sort: '-createdAt',
      limit: 100,
    })
    return result.docs
  },
)

export async function getChainPrompts(): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: {
      and: [{ contentTypeUsesSteps: { equals: true } }, PUBLISHED],
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
    where: PUBLISHED,
    depth: 2,
    sort: '-createdAt',
    limit,
  })
  return result.docs
}

export async function getPromptsByIds(ids: number[]): Promise<Prompt[]> {
  if (ids.length === 0) return []
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ id: { in: ids } }, PUBLISHED] },
    depth: 2,
    limit: 100,
  })
  return result.docs
}

export const getPromptBySlug = cache(async (slug: string): Promise<Prompt | null> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    depth: 2,
    limit: 1,
  })
  return result.docs[0] ?? null
})

function escapeLikeQuery(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

export async function searchPrompts(query: string): Promise<Prompt[]> {
  const payload = await getPayloadClient()
  const escaped = escapeLikeQuery(query)
  const result = await payload.find({
    collection: 'prompts',
    where: {
      and: [
        PUBLISHED,
        {
          or: [{ title: { like: escaped } }, { blurb: { like: escaped } }],
        },
      ],
    },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })
  return result.docs
}

// Public, non-personal aggregate -- safe to compute in a static/ISR page body.
export async function getSavedCount(promptId: number): Promise<number> {
  const payload = await getPayloadClient()
  const result = await payload.count({
    collection: 'customers',
    where: { savedPrompts: { equals: promptId } },
  })
  return result.totalDocs
}
