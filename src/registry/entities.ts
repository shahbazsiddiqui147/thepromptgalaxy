import type { EntityDef } from '@/registry/types'

export const categories: EntityDef = {
  key: 'categories',
  table: 'categories',
  singular: 'Category',
  plural: 'Categories',
  publicPathPrefix: '/category/',
  slugSource: 'name',
  orderBy: 'sort_order ASC, name ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  usage: {
    sql: 'SELECT count(*)::int AS n FROM prompts WHERE category_id = $1',
    message: (n) => `${n} prompt(s) use this category. Deactivate it instead of deleting it.`,
  },
  fields: [
    { name: 'name', column: 'name', label: 'Name', type: 'text', required: true, maxLength: 80, list: true },
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Leave empty to generate it from the name.' },
    { name: 'description', column: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive categories disappear from the public site.' },
    { name: 'supportsStyles', column: 'supports_styles', label: 'Supports art styles', type: 'boolean', default: true, help: 'Show the style filter on this category.' },
    { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
    { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  ],
}

export const tools: EntityDef = {
  key: 'tools',
  table: 'tools',
  singular: 'Tool',
  plural: 'Tools',
  publicPathPrefix: '/tool/',
  slugSource: 'name',
  orderBy: 'sort_order ASC, name ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  usage: {
    sql: 'SELECT count(*)::int AS n FROM prompt_tools WHERE tool_id = $1',
    message: (n) => `${n} prompt(s) are tested on this tool. Deactivate it instead of deleting it.`,
  },
  fields: [
    { name: 'name', column: 'name', label: 'Name', type: 'text', required: true, maxLength: 80, list: true },
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Leave empty to generate it from the name.' },
    { name: 'vendor', column: 'vendor', label: 'Vendor', type: 'text', maxLength: 80, list: true },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive tools disappear from the public site.' },
    { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
    { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  ],
}

export const styles: EntityDef = {
  key: 'styles',
  table: 'styles',
  singular: 'Style',
  plural: 'Styles',
  publicPathPrefix: '/style/',
  slugSource: 'name',
  orderBy: 'sort_order ASC, name ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  usage: {
    sql: 'SELECT count(*)::int AS n FROM prompt_styles WHERE style_id = $1',
    message: (n) => `${n} prompt(s) use this style. Deactivate it instead of deleting it.`,
  },
  fields: [
    { name: 'name', column: 'name', label: 'Name', type: 'text', required: true, maxLength: 80, list: true },
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Leave empty to generate it from the name.' },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive styles disappear from the public site.' },
  ],
}

export const ENTITIES: Record<string, EntityDef> = { categories, tools, styles }

export function getEntity(key: string): EntityDef | undefined {
  return Object.hasOwn(ENTITIES, key) ? ENTITIES[key] : undefined
}
