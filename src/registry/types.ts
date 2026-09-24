import type { Role } from '@/lib/roles'

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'slug'

export type FieldDef = {
  /** camelCase key used in forms and in row objects. */
  name: string
  /** snake_case database column. */
  column: string
  label: string
  type: FieldType
  required?: boolean
  maxLength?: number
  options?: { value: string; label: string }[]
  default?: string | number | boolean
  help?: string
  /** Show as a column in the generic list screen. */
  list?: boolean
}

export type EntityDef = {
  /** URL segment under /admin, e.g. "categories". */
  key: string
  table: string
  singular: string
  plural: string
  /** Public URL prefix used to record redirects when a slug changes, e.g. "/category/". */
  publicPathPrefix?: string
  /** Field name whose value seeds the slug when none is typed. */
  slugSource?: string
  orderBy: string
  roles: { read: Role[]; write: Role[] }
  /** When present and the count is > 0, deleting is blocked with this message. `sql` receives the id as $1. */
  usage?: { sql: string; message: (count: number) => string }
  fields: FieldDef[]
}
