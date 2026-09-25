import { sanitizeRichText } from '@/lib/sanitize'
import {
  LIMITS,
  PROMPT_STATUSES,
  type PromptFaqInput,
  type PromptInput,
  type PromptStatus,
  type PromptStepInput,
  type PromptToolInput,
} from '@/prompts/types'
import { SLUG_PATTERN } from '@/registry/validate'

export type ParseResult = { ok: true; value: PromptInput } | { ok: false; errors: Record<string, string> }

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

function items(value: unknown, max: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : []
}

function uniqueInts(value: unknown, max: number): number[] {
  const out: number[] = []
  for (const entry of items(value, max)) {
    const n = positiveInt(entry)
    if (n !== null && !out.includes(n)) out.push(n)
  }
  return out
}

export function parsePromptPayload(raw: unknown): ParseResult {
  const r = asRecord(raw)
  const errors: Record<string, string> = {}
  const limit = (field: string, value: string, max: number) => {
    if (value.length > max) errors[field] = `Must be at most ${max} characters`
  }

  const title = str(r.title)
  if (!title) errors.title = 'Required'
  limit('title', title, LIMITS.title)

  const slug = str(r.slug)
  if (slug && (slug.length > 80 || !SLUG_PATTERN.test(slug))) {
    errors.slug = 'Use lower-case letters, numbers and single hyphens'
  }

  const summary = str(r.summary)
  limit('summary', summary, LIMITS.summary)

  const categoryId = positiveInt(r.categoryId)
  if (!categoryId) errors.categoryId = 'Choose a category'

  const isChain = r.isChain === true
  const promptText = isChain ? '' : str(r.promptText)
  limit('promptText', promptText, LIMITS.promptText)

  const steps: PromptStepInput[] = isChain
    ? items(r.steps, LIMITS.steps).map((entry) => {
        const step = asRecord(entry)
        return { label: str(step.label), text: str(step.text), exampleMediaId: positiveInt(step.exampleMediaId) }
      })
    : []
  if (steps.some((step) => step.text === '' || step.text.length > LIMITS.promptText || step.label.length > LIMITS.stepLabel)) {
    errors.steps = `Every step needs prompt text (at most ${LIMITS.promptText} characters) and a label of at most ${LIMITS.stepLabel}.`
  }

  const tools: PromptToolInput[] = []
  for (const entry of items(r.tools, LIMITS.tools)) {
    const tool = asRecord(entry)
    const toolId = positiveInt(tool.toolId)
    if (toolId === null || tools.some((t) => t.toolId === toolId)) continue
    tools.push({ toolId, fit: tool.fit === 'great' ? 'great' : 'good', isPrimary: tool.isPrimary === true })
  }
  const primaryIndex = tools.findIndex((t) => t.isPrimary)
  tools.forEach((tool, index) => {
    tool.isPrimary = index === (primaryIndex === -1 ? 0 : primaryIndex)
  })

  const faqs: PromptFaqInput[] = []
  for (const entry of items(r.faqs, LIMITS.faqs)) {
    const faq = asRecord(entry)
    const question = str(faq.question)
    const answer = str(faq.answer)
    if (!question && !answer) continue
    if (!question || !answer || question.length > LIMITS.faqQuestion || answer.length > LIMITS.faqAnswer) {
      errors.faqs = 'Every FAQ needs a question and an answer of reasonable length.'
    }
    faqs.push({ question, answer })
  }

  const quickAnswer = str(r.quickAnswer)
  limit('quickAnswer', quickAnswer, LIMITS.quickAnswer)
  const articleHtml = sanitizeRichText(typeof r.articleHtml === 'string' ? r.articleHtml : '')
  limit('articleHtml', articleHtml, LIMITS.article)
  const referenceNote = str(r.referenceNote)
  limit('referenceNote', referenceNote, LIMITS.referenceNote)
  const seoTitle = str(r.seoTitle)
  limit('seoTitle', seoTitle, LIMITS.seoTitle)
  const seoDescription = str(r.seoDescription)
  limit('seoDescription', seoDescription, LIMITS.seoDescription)

  const status: PromptStatus = PROMPT_STATUSES.includes(r.status as PromptStatus) ? (r.status as PromptStatus) : 'draft'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      title,
      slug,
      summary,
      categoryId: categoryId as number,
      isChain,
      promptText,
      steps,
      isPremium: r.isPremium === true,
      referenceRequired: r.referenceRequired === true,
      referenceNote,
      exampleMediaId: positiveInt(r.exampleMediaId),
      quickAnswer,
      articleHtml,
      tools,
      styleIds: uniqueInts(r.styleIds, LIMITS.styles),
      faqs,
      similarIds: uniqueInts(r.similarIds, LIMITS.similar),
      seoTitle,
      seoDescription,
      status,
      changePublishedSlug: r.changePublishedSlug === true,
    },
  }
}

/** What a prompt still needs before it can be published. An empty list means it is ready. */
export function publishProblems(input: PromptInput): string[] {
  const problems: string[] = []
  if (!input.summary) problems.push('Add a summary.')
  if (input.isChain) {
    if (input.steps.length < 2) problems.push('A chain needs at least two steps.')
  } else if (!input.promptText) {
    problems.push('Add the prompt text.')
  }
  if (input.tools.length === 0) problems.push('Choose at least one tool.')
  if (input.exampleMediaId === null) problems.push('Upload an example image.')
  return problems
}
