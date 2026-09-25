import { describe, expect, it } from 'vitest'
import { parsePromptPayload, publishProblems } from '@/prompts/input'
import { emptyPrompt, type PromptInput } from '@/prompts/types'

const valid = {
  ...emptyPrompt(),
  title: 'Studio headshot, 85mm',
  summary: 'Clean three-point lighting.',
  categoryId: 3,
  promptText: 'Use the attached photo as reference.',
  exampleMediaId: 9,
  tools: [{ toolId: 1, fit: 'great', isPrimary: true }],
}

function parse(overrides: Record<string, unknown> = {}) {
  return parsePromptPayload({ ...valid, ...overrides })
}

describe('parsePromptPayload', () => {
  it('accepts a valid single prompt and trims text', () => {
    const result = parse({ title: '  Studio headshot  ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBe('Studio headshot')
  })

  it('requires a title and a category', () => {
    const result = parse({ title: '  ', categoryId: 0 })
    expect(result).toEqual({ ok: false, errors: { title: 'Required', categoryId: 'Choose a category' } })
  })

  it('validates the slug format and text lengths', () => {
    const result = parse({ slug: 'Not A Slug', summary: 'x'.repeat(301) })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.slug).toMatch(/lower-case/)
      expect(result.errors.summary).toMatch(/at most 300/)
    }
  })

  it('marks the first tool primary when none is, and keeps only one primary', () => {
    const none = parse({ tools: [{ toolId: 1, fit: 'good' }, { toolId: 2, fit: 'good' }] })
    const two = parse({ tools: [{ toolId: 1, isPrimary: true }, { toolId: 2, isPrimary: true }] })
    expect(none.ok && none.value.tools.map((t) => t.isPrimary)).toEqual([true, false])
    expect(two.ok && two.value.tools.map((t) => t.isPrimary)).toEqual([true, false])
  })

  it('removes duplicate tools and ignores invalid ids', () => {
    const result = parse({ tools: [{ toolId: 1 }, { toolId: 1 }, { toolId: 'x' }, { toolId: -3 }] })
    expect(result.ok && result.value.tools.map((t) => t.toolId)).toEqual([1])
  })

  it('drops the single prompt text for chains and requires text in every step', () => {
    const chain = parse({ isChain: true, promptText: 'ignored', steps: [{ text: 'one' }, { text: 'two', label: 'Grade' }] })
    expect(chain.ok && chain.value.promptText).toBe('')
    expect(chain.ok && chain.value.steps).toHaveLength(2)
    const bad = parse({ isChain: true, steps: [{ text: 'one' }, { text: '  ' }] })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors.steps).toMatch(/every step/i)
  })

  it('clears steps for a single prompt', () => {
    const result = parse({ isChain: false, steps: [{ text: 'stray' }] })
    expect(result.ok && result.value.steps).toEqual([])
  })

  it('drops blank FAQs but rejects half-filled ones', () => {
    const ok = parse({ faqs: [{ question: '', answer: '' }, { question: 'Q?', answer: 'A.' }] })
    expect(ok.ok && ok.value.faqs).toEqual([{ question: 'Q?', answer: 'A.' }])
    const bad = parse({ faqs: [{ question: 'Q?', answer: '' }] })
    expect(bad.ok).toBe(false)
  })

  it('sanitizes the article', () => {
    const result = parse({ articleHtml: '<p>Hi</p><script>alert(1)</script>' })
    expect(result.ok && result.value.articleHtml).toBe('<p>Hi</p>')
  })

  it('falls back to draft for an unknown status and de-duplicates ids', () => {
    const result = parse({ status: 'weird', styleIds: [2, 2, 5], similarIds: [7, 7] })
    expect(result.ok && result.value.status).toBe('draft')
    expect(result.ok && result.value.styleIds).toEqual([2, 5])
    expect(result.ok && result.value.similarIds).toEqual([7])
  })

  it('treats non-object input as an empty form', () => {
    expect(parsePromptPayload('nope').ok).toBe(false)
  })
})

describe('publishProblems', () => {
  const base = (): PromptInput => ({ ...emptyPrompt(), ...valid, tools: [{ toolId: 1, fit: 'great', isPrimary: true }] }) as PromptInput

  it('is empty for a complete single prompt', () => {
    expect(publishProblems(base())).toEqual([])
  })

  it('lists every missing requirement', () => {
    const problems = publishProblems({ ...base(), summary: '', promptText: '', tools: [], exampleMediaId: null })
    expect(problems).toHaveLength(4)
    expect(problems.join(' ')).toMatch(/summary/i)
    expect(problems.join(' ')).toMatch(/prompt text/i)
    expect(problems.join(' ')).toMatch(/tool/i)
    expect(problems.join(' ')).toMatch(/example image/i)
  })

  it('needs at least two steps for a chain', () => {
    const chain = { ...base(), isChain: true, promptText: '', steps: [{ label: '', text: 'one', exampleMediaId: null }] }
    expect(publishProblems(chain).join(' ')).toMatch(/two steps/i)
    const ok = { ...chain, steps: [...chain.steps, { label: '', text: 'two', exampleMediaId: null }] }
    expect(publishProblems(ok)).toEqual([])
  })
})
