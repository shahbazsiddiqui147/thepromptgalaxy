import { describe, expect, it } from 'vitest'
import { categories } from '@/registry/entities'
import { formDataToInput, validateInput } from '@/registry/validate'

const valid = {
  name: 'Portrait',
  slug: '',
  description: '',
  sortOrder: '',
  isActive: 'on',
  supportsStyles: 'on',
  seoTitle: '',
  seoDescription: '',
}

describe('validateInput', () => {
  it('accepts valid input and applies defaults', () => {
    const result = validateInput(categories, valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({ name: 'Portrait', slug: '', sortOrder: 0, isActive: true, supportsStyles: true })
  })

  it('requires the name', () => {
    const result = validateInput(categories, { ...valid, name: '   ' })
    expect(result).toEqual({ ok: false, errors: { name: 'Required' } })
  })

  it('enforces max length', () => {
    const result = validateInput(categories, { ...valid, name: 'x'.repeat(81) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toMatch(/at most 80/)
  })

  it('validates slug format', () => {
    const bad = validateInput(categories, { ...valid, slug: 'Not A Slug' })
    expect(bad.ok).toBe(false)
    const good = validateInput(categories, { ...valid, slug: 'good-slug-2' })
    expect(good.ok).toBe(true)
  })

  it('parses whole numbers and rejects other input', () => {
    const ok = validateInput(categories, { ...valid, sortOrder: '12' })
    expect(ok.ok && ok.value.sortOrder).toBe(12)
    const bad = validateInput(categories, { ...valid, sortOrder: '1.5' })
    expect(bad.ok).toBe(false)
  })

  it('treats a missing checkbox as false', () => {
    const result = validateInput(categories, { ...valid, isActive: false })
    expect(result.ok && result.value.isActive).toBe(false)
  })
})

describe('formDataToInput', () => {
  it('maps form fields and turns absent checkboxes into false', () => {
    const form = new FormData()
    form.set('name', 'Portrait')
    form.set('isActive', 'on')
    const input = formDataToInput(categories, form)
    expect(input.name).toBe('Portrait')
    expect(input.isActive).toBe(true)
    expect(input.supportsStyles).toBe(false)
    expect(input.slug).toBe('')
  })
})
