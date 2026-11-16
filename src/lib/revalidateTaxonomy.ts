import { revalidatePath } from 'next/cache'
import type { PayloadRequest } from 'payload'

function run(req: PayloadRequest, label: string, fn: () => void) {
  try {
    fn()
  } catch (err) {
    req.payload.logger.error({ err, msg: `Revalidation failed for ${label}` })
  }
}

function revalidateSlug(pathFor: (slug: string) => string, slug?: string | null, previousSlug?: string | null) {
  if (slug) revalidatePath(pathFor(slug))
  if (previousSlug && previousSlug !== slug) revalidatePath(pathFor(previousSlug))
}

/** Subject name/slug is on the homepage, browse, the subject page, and every nested URL. */
export function revalidateSubject(
  req: PayloadRequest,
  slug?: string | null,
  previousSlug?: string | null,
) {
  run(req, 'subject', () => {
    revalidatePath('/')
    revalidatePath('/browse/')
    revalidateSlug((value) => `/${value}/`, slug, previousSlug)
    revalidatePath('/[subject]/[style]', 'page')
    revalidatePath('/[subject]/[style]/[prompt]', 'page')
  })
}

/** Tool name is on the homepage, browse, the tool archive, and prompt pages. */
export function revalidateTool(
  req: PayloadRequest,
  slug?: string | null,
  previousSlug?: string | null,
) {
  run(req, 'tool', () => {
    revalidatePath('/')
    revalidatePath('/browse/')
    revalidatePath('/tool/')
    revalidateSlug((value) => `/tool/${value}/`, slug, previousSlug)
    revalidatePath('/[subject]/[style]/[prompt]', 'page')
  })
}

/** Art style name is on the homepage, the style archive, combo pages, and prompt pages. */
export function revalidateArtStyle(
  req: PayloadRequest,
  slug?: string | null,
  previousSlug?: string | null,
) {
  run(req, 'art style', () => {
    revalidatePath('/')
    revalidatePath('/style/')
    revalidateSlug((value) => `/style/${value}/`, slug, previousSlug)
    revalidatePath('/[subject]/[style]', 'page')
    revalidatePath('/[subject]/[style]/[prompt]', 'page')
  })
}
