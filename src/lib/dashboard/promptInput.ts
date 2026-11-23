import type { ArticleBody } from '@/lib/dashboard/lexicalHtml'

export type PromptInput = {
  title: string
  blurb: string
  subject: number | null
  artStyle: number | null
  contentType: number | null
  tools: { id?: string; tool: number | null; fit: 'great' | 'good' }[]
  coverImage: number | null
  referenceRequired: boolean
  referenceNote: string
  promptText: string
  steps: { id?: string; label: string; note: string; promptText: string; exampleResult: number | null }[]
  exampleResults: { id?: string; image: number | null; note: string }[]
  quickAnswer: string
  articleHeading: string
  articleBody: ArticleBody | null
  faqs: { id?: string; question: string; answer: string }[]
  similarPrompts: number[]
  metaTitle: string
  metaDescription: string
  verifiedBy: number | null
  lastVerified: string | null
}

function idOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function rowId(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function isArticleBody(value: unknown): value is ArticleBody {
  if (!value || typeof value !== 'object') return false
  const root = (value as { root?: unknown }).root
  if (!root || typeof root !== 'object') return false
  return Array.isArray((root as { children?: unknown }).children)
}

export function parsePromptInput(raw: string): PromptInput | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const data = parsed as Record<string, unknown>

  const tools = Array.isArray(data.tools)
    ? data.tools.flatMap((row) => {
        if (!row || typeof row !== 'object') return []
        const item = row as Record<string, unknown>
        const fit = item.fit === 'great' ? 'great' : 'good'
        return [{ id: rowId(item.id), tool: idOf(item.tool), fit: fit as 'great' | 'good' }]
      })
    : []

  const steps = Array.isArray(data.steps)
    ? data.steps.flatMap((row) => {
        if (!row || typeof row !== 'object') return []
        const item = row as Record<string, unknown>
        return [
          {
            id: rowId(item.id),
            label: text(item.label),
            note: text(item.note),
            promptText: typeof item.promptText === 'string' ? item.promptText : '',
            exampleResult: idOf(item.exampleResult),
          },
        ]
      })
    : []

  const exampleResults = Array.isArray(data.exampleResults)
    ? data.exampleResults.flatMap((row) => {
        if (!row || typeof row !== 'object') return []
        const item = row as Record<string, unknown>
        return [{ id: rowId(item.id), image: idOf(item.image), note: text(item.note) }]
      })
    : []

  const faqs = Array.isArray(data.faqs)
    ? data.faqs.flatMap((row) => {
        if (!row || typeof row !== 'object') return []
        const item = row as Record<string, unknown>
        return [{ id: rowId(item.id), question: text(item.question), answer: typeof item.answer === 'string' ? item.answer.trim() : '' }]
      })
    : []

  const similarPrompts = Array.isArray(data.similarPrompts)
    ? data.similarPrompts.flatMap((value) => {
        const id = idOf(value)
        return id ? [id] : []
      })
    : []

  return {
    title: text(data.title),
    blurb: typeof data.blurb === 'string' ? data.blurb.trim() : '',
    subject: idOf(data.subject),
    artStyle: idOf(data.artStyle),
    contentType: idOf(data.contentType),
    tools,
    coverImage: idOf(data.coverImage),
    referenceRequired: Boolean(data.referenceRequired),
    referenceNote: text(data.referenceNote),
    promptText: typeof data.promptText === 'string' ? data.promptText : '',
    steps,
    exampleResults,
    quickAnswer: typeof data.quickAnswer === 'string' ? data.quickAnswer.trim() : '',
    articleHeading: text(data.articleHeading),
    articleBody: data.articleBody == null ? null : isArticleBody(data.articleBody) ? data.articleBody : null,
    faqs,
    similarPrompts,
    metaTitle: text(data.metaTitle).slice(0, 60),
    metaDescription: text(data.metaDescription).slice(0, 160),
    verifiedBy: idOf(data.verifiedBy),
    lastVerified: typeof data.lastVerified === 'string' && data.lastVerified ? data.lastVerified : null,
  }
}
