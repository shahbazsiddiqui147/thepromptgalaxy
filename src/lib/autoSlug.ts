import type { CollectionBeforeValidateHook } from 'payload'

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

export function autoSlugHook(sourceField: string): CollectionBeforeValidateHook {
  return async ({ data, originalDoc, req, collection }) => {
    const currentSlug = data?.slug ?? originalDoc?.slug
    const source = data?.[sourceField] ?? originalDoc?.[sourceField]
    if (!currentSlug && source) {
      const base = slugify(source)
      let candidate = base
      let suffix = 2
      while (true) {
        const existing = await req.payload.find({
          collection: collection.slug,
          where: {
            and: [
              { slug: { equals: candidate } },
              ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
            ],
          },
          limit: 1,
        })
        if (existing.totalDocs === 0) break
        candidate = `${base}-${suffix}`
        suffix++
      }
      return { ...data, slug: candidate }
    }
    return data
  }
}
