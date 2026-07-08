import type { CollectionBeforeValidateHook } from 'payload'

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function autoSlugHook(sourceField: string): CollectionBeforeValidateHook {
  return ({ data, originalDoc }) => {
    const currentSlug = data?.slug ?? originalDoc?.slug
    const source = data?.[sourceField] ?? originalDoc?.[sourceField]
    if (!currentSlug && source) {
      return { ...data, slug: slugify(source) }
    }
    return data
  }
}
