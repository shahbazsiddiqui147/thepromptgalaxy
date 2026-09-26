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
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Filled in from the name as you type. Edit it only if you want a different address.' },
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
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Filled in from the name as you type. Edit it only if you want a different address.' },
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
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Filled in from the name as you type. Edit it only if you want a different address.' },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive styles disappear from the public site.' },
  ],
}

export const RESERVED_PAGE_SLUGS = [
  'admin', 'login', 'logout', 'register', 'account', 'category', 'tool', 'style', 'prompt', 'media', 'premium',
  'search', 'submit', 'api', 'sitemap-xml', 'sitemap.xml', 'robots-txt', 'robots.txt', '_next', 'favicon-ico', 'favicon.ico',
]

export const pages: EntityDef = {
  key: 'pages',
  table: 'pages',
  singular: 'Page',
  plural: 'Pages',
  publicPathPrefix: '/',
  slugSource: 'title',
  orderBy: 'sort_order ASC, title ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  reservedSlugs: RESERVED_PAGE_SLUGS,
  fields: [
    { name: 'title', column: 'title', label: 'Title', type: 'text', required: true, maxLength: 120, list: true },
    { name: 'slug', column: 'slug', label: 'Address', type: 'slug', list: true, help: 'The page lives at /address/ on the site. Filled in from the title as you type.' },
    { name: 'body', column: 'body_html', label: 'Content', type: 'richtext' },
    { name: 'isPublished', column: 'is_published', label: 'Published', type: 'boolean', default: false, list: true, help: 'Unpublished pages return a 404 on the site.' },
    { name: 'showInFooter', column: 'show_in_footer', label: 'Show in footer', type: 'boolean', default: true },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
    { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  ],
}

export const ENTITIES: Record<string, EntityDef> = { categories, tools, styles, pages }

export function getEntity(key: string): EntityDef | undefined {
  return Object.hasOwn(ENTITIES, key) ? ENTITIES[key] : undefined
}
