import { getPayloadClient } from './payload-client'
import type { Subject, ArtStyle, Tool, Prompt } from '@/payload-types'

export const MIN_PROMPTS_FOR_COMBO_PAGE = 3

// Payload's Local API defaults `overrideAccess` to true, bypassing each collection's
// `access.read` control entirely -- every query below must filter status itself.
const PUBLISHED = { _status: { equals: 'published' } } as const

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
    where: { and: [{ tools: { equals: toolId } }, PUBLISHED] },
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
        PUBLISHED,
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

export async function getPromptBySlug(slug: string): Promise<Prompt | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'prompts',
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    depth: 2,
    limit: 1,
  })
  return result.docs[0] ?? null
}
