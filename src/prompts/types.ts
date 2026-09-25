export const PROMPT_STATUSES = ['draft', 'published', 'archived'] as const
export type PromptStatus = (typeof PROMPT_STATUSES)[number]

export const LIMITS = {
  title: 140,
  summary: 300,
  promptText: 8000,
  stepLabel: 80,
  faqQuestion: 300,
  faqAnswer: 2000,
  quickAnswer: 600,
  article: 60000,
  seoTitle: 120,
  seoDescription: 300,
  referenceNote: 200,
  steps: 12,
  tools: 30,
  styles: 30,
  faqs: 20,
  similar: 12,
} as const

export type PromptToolInput = { toolId: number; fit: 'great' | 'good'; isPrimary: boolean }
export type PromptStepInput = { label: string; text: string; exampleMediaId: number | null }
export type PromptFaqInput = { question: string; answer: string }

export type PromptInput = {
  title: string
  /** Empty means "generate from the title" (or keep the current one). */
  slug: string
  summary: string
  /** 0 means "not chosen yet". */
  categoryId: number
  isChain: boolean
  promptText: string
  steps: PromptStepInput[]
  isPremium: boolean
  referenceRequired: boolean
  referenceNote: string
  exampleMediaId: number | null
  quickAnswer: string
  articleHtml: string
  tools: PromptToolInput[]
  styleIds: number[]
  faqs: PromptFaqInput[]
  similarIds: number[]
  seoTitle: string
  seoDescription: string
  status: PromptStatus
  /** Editing the slug of an already published prompt changes its public URL; this must be ticked on purpose. */
  changePublishedSlug: boolean
}

export type PromptFormState = { errors: Record<string, string> }

export function emptyPrompt(): PromptInput {
  return {
    title: '',
    slug: '',
    summary: '',
    categoryId: 0,
    isChain: false,
    promptText: '',
    steps: [],
    isPremium: false,
    referenceRequired: false,
    referenceNote: '',
    exampleMediaId: null,
    quickAnswer: '',
    articleHtml: '',
    tools: [],
    styleIds: [],
    faqs: [],
    similarIds: [],
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    changePublishedSlug: false,
  }
}
