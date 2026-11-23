'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Where } from 'payload'
import {
  andWhere,
  checked,
  clientUploadsEnabled,
  dashboardContext,
  formatPayloadError,
  isNextRedirect,
  numberValue,
  optionalId,
  stringList,
  textValue,
  type FormState,
} from '@/lib/dashboard/http'
import { toMediaCard, type MediaCard } from '@/lib/dashboard/media'

const mediaSelect = {
  alt: true,
  filename: true,
  url: true,
  mimeType: true,
  filesize: true,
  width: true,
  height: true,
  sizes: true,
  createdAt: true,
} as const

export async function browseMedia(query: string, page = 1): Promise<{ docs: MediaCard[]; totalDocs: number; totalPages: number; page: number; clientUploads: boolean }> {
  const { payload, user } = await dashboardContext()
  const q = query.trim()
  const where: Where | undefined = q
    ? { or: [{ alt: { contains: q } }, { filename: { contains: q } }] }
    : undefined
  const result = await payload.find({
    collection: 'media',
    where,
    page: Math.max(1, page),
    limit: 24,
    depth: 0,
    sort: '-createdAt',
    select: mediaSelect,
    user,
    overrideAccess: false,
  })
  return {
    docs: result.docs.map((doc) => toMediaCard(doc)),
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page ?? 1,
    clientUploads: clientUploadsEnabled(),
  }
}

export async function updateMediaAlt(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = optionalId(formData.get('id'))
  const alt = textValue(formData, 'alt')
  if (!id) return { error: 'Missing image.', message: null }
  if (!alt) return { error: 'Alt text is required.', message: null }
  const { payload, user } = await dashboardContext()
  try {
    await payload.update({
      collection: 'media',
      id,
      data: { alt },
      depth: 0,
      user,
      overrideAccess: false,
    })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { error: formatPayloadError(error), message: null }
  }
  return { error: null, message: 'Alt text saved.' }
}

export async function deleteMedia(formData: FormData): Promise<void> {
  const id = optionalId(formData.get('id'))
  if (!id) redirect('/dashboard/media/')
  const { payload, user } = await dashboardContext()
  try {
    await payload.delete({ collection: 'media', id, user, overrideAccess: false })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    redirect('/dashboard/media/?error=delete')
  }
  redirect('/dashboard/media/?deleted=1')
}

export async function saveSiteSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { payload, user } = await dashboardContext()
  try {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        logo: optionalId(formData.get('logo')),
        favicon: optionalId(formData.get('favicon')),
      },
      depth: 0,
      user,
      overrideAccess: false,
    })
    revalidatePath('/', 'layout')
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { error: formatPayloadError(error), message: null }
  }
  redirect('/dashboard/site-settings/?saved=1')
}

export async function saveAdSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { payload, user } = await dashboardContext()
  try {
    await payload.updateGlobal({
      slug: 'ad-settings',
      data: {
        enabled: checked(formData, 'enabled'),
        leaderboardCode: textValue(formData, 'leaderboardCode'),
        inContentCode: textValue(formData, 'inContentCode'),
        sidebarCode: textValue(formData, 'sidebarCode'),
      },
      depth: 0,
      user,
      overrideAccess: false,
    })
    revalidatePath('/', 'layout')
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { error: formatPayloadError(error), message: null }
  }
  redirect('/dashboard/ad-settings/?saved=1')
}

const TAXONOMY = {
  subjects: { collection: 'subjects', href: '/dashboard/subjects/' },
  'art-styles': { collection: 'art-styles', href: '/dashboard/art-styles/' },
  tools: { collection: 'tools', href: '/dashboard/tools/' },
  'content-types': { collection: 'content-types', href: '/dashboard/content-types/' },
} as const

export type TaxonomyKind = keyof typeof TAXONOMY

function taxonomyOf(value: FormDataEntryValue | null): TaxonomyKind | null {
  if (typeof value !== 'string') return null
  return value in TAXONOMY ? (value as TaxonomyKind) : null
}

export async function saveTaxonomy(_prev: FormState, formData: FormData): Promise<FormState> {
  const kind = taxonomyOf(formData.get('kind'))
  if (!kind) return { error: 'Unknown collection.', message: null }
  const name = textValue(formData, 'name')
  if (!name) return { error: 'Name is required.', message: null }

  const id = optionalId(formData.get('id'))
  const { payload, user } = await dashboardContext()
  const spec = TAXONOMY[kind]

  const data =
    kind === 'subjects'
      ? {
          name,
          description: textValue(formData, 'description'),
          colorHex: textValue(formData, 'colorHex'),
          sortOrder: numberValue(formData, 'sortOrder'),
          icon: optionalId(formData.get('icon')),
        }
      : kind === 'art-styles'
        ? {
            name,
            colorHex: textValue(formData, 'colorHex'),
            sortOrder: numberValue(formData, 'sortOrder'),
            wordChoiceGuide: {
              helps: stringList(formData, 'helps').map((word) => ({ word })),
              hurts: stringList(formData, 'hurts').map((word) => ({ word })),
            },
          }
        : kind === 'tools'
          ? {
              name,
              vendor: textValue(formData, 'vendor'),
              sortOrder: numberValue(formData, 'sortOrder'),
              supportsReferenceImage: checked(formData, 'supportsReferenceImage'),
              supportsChains: checked(formData, 'supportsChains'),
              active: checked(formData, 'active'),
            }
          : {
              name,
              usesSteps: checked(formData, 'usesSteps'),
              sortOrder: numberValue(formData, 'sortOrder'),
            }

  try {
    const doc = id
      ? await payload.update({
          collection: spec.collection,
          id,
          data,
          depth: 0,
          user,
          overrideAccess: false,
        })
      : await payload.create({
          collection: spec.collection,
          data,
          depth: 0,
          user,
          overrideAccess: false,
        })
    redirect(`${spec.href}${doc.id}/?saved=1`)
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { error: formatPayloadError(error), message: null }
  }
}

export async function deleteTaxonomy(formData: FormData): Promise<void> {
  const kind = taxonomyOf(formData.get('kind'))
  const id = optionalId(formData.get('id'))
  if (!kind || !id) redirect('/dashboard/')
  const spec = TAXONOMY[kind]
  const { payload, user } = await dashboardContext()
  try {
    await payload.delete({ collection: spec.collection, id, user, overrideAccess: false })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    redirect(`${spec.href}${id}/?error=delete`)
  }
  redirect(`${spec.href}?deleted=1`)
}

export async function searchPrompts(query: string): Promise<{ id: number; title: string; status: string }[]> {
  const { payload, user } = await dashboardContext()
  const q = query.trim()
  const where = andWhere([q ? { title: { contains: q } } : null])
  const result = await payload.find({
    collection: 'prompts',
    where,
    limit: 12,
    depth: 0,
    draft: true,
    sort: '-updatedAt',
    select: { title: true, _status: true },
    user,
    overrideAccess: false,
  })
  return result.docs.map((doc) => ({
    id: doc.id,
    title: doc.title || `Prompt ${doc.id}`,
    status: doc._status || 'draft',
  }))
}
