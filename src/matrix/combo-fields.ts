import type { FieldDef } from '@/registry/types'

/** Fields of a category × tool combination, validated with the same registry validator as entities. */
export const COMBO_FIELDS: FieldDef[] = [
  { name: 'sortOrder', column: 'sort_order', label: 'Order within the category', type: 'number', default: 0 },
  { name: 'isFeatured', column: 'is_featured', label: 'Featured', type: 'boolean', help: 'Show this tool first on the category page.' },
  { name: 'isIndexable', column: 'is_indexable', label: 'Indexable combination page', type: 'boolean', help: 'Let search engines index this category + tool page with its own title and intro.' },
  { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
  { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  { name: 'intro', column: 'intro', label: 'Intro text', type: 'textarea', maxLength: 1000 },
]
