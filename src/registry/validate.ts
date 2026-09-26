import { sanitizeRichText } from '@/lib/sanitize'
import type { FieldDef } from '@/registry/types'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> }

const DEFAULT_MAX: Record<string, number> = { text: 200, textarea: 2000, slug: 80, richtext: 60000 }

export function validateInput(
  entity: { fields: FieldDef[] },
  raw: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {}
  const value: Record<string, unknown> = {}

  for (const field of entity.fields) {
    const input = raw[field.name]
    switch (field.type) {
      case 'boolean':
        value[field.name] = input === true || input === 'on' || input === 'true'
        break
      case 'number': {
        const text = String(input ?? '').trim()
        if (text === '') {
          if (field.required) errors[field.name] = 'Required'
          else value[field.name] = typeof field.default === 'number' ? field.default : 0
        } else if (!/^-?\d+$/.test(text)) {
          errors[field.name] = 'Enter a whole number'
        } else {
          value[field.name] = Number(text)
        }
        break
      }
      case 'select': {
        const text = String(input ?? '')
        if (!field.options?.some((option) => option.value === text)) {
          errors[field.name] = 'Choose one of the listed options'
        } else {
          value[field.name] = text
        }
        break
      }
      case 'richtext': {
        const html = sanitizeRichText(String(input ?? ''))
        const max = field.maxLength ?? DEFAULT_MAX.richtext
        if (html === '' && field.required) errors[field.name] = 'Required'
        else if (html.length > max) errors[field.name] = `Must be at most ${max} characters`
        else value[field.name] = html
        break
      }
      default: {
        const text = String(input ?? '').trim()
        const max = field.maxLength ?? DEFAULT_MAX[field.type]
        if (text === '' && field.required) errors[field.name] = 'Required'
        else if (text.length > max) errors[field.name] = `Must be at most ${max} characters`
        else if (field.type === 'slug' && text !== '' && !SLUG_PATTERN.test(text)) {
          errors[field.name] = 'Use lower-case letters, numbers and single hyphens'
        } else value[field.name] = text
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value }
}

/** Turns a submitted form into the plain object validateInput expects. */
export function formDataToInput(entity: { fields: FieldDef[] }, formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of entity.fields) {
    out[field.name] = field.type === 'boolean' ? formData.get(field.name) !== null : String(formData.get(field.name) ?? '')
  }
  return out
}

/** Default values for a blank "new" form. */
export function defaultsFor(entity: { fields: FieldDef[] }): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of entity.fields) {
    out[field.name] = field.default ?? (field.type === 'boolean' ? false : '')
  }
  return out
}
