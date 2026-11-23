'use server'

import { redirect } from 'next/navigation'
import type { Prompt } from '@/payload-types'
import {
  dashboardContext,
  formatPayloadError,
  isNextRedirect,
  optionalId,
  textValue,
} from '@/lib/dashboard/http'
import { parsePromptInput, type PromptInput } from '@/lib/dashboard/promptInput'

export type SavePromptState = {
  error: string | null
  message: string | null
  slug: string | null
  status: 'draft' | 'published' | null
}

const idlePromptState: SavePromptState = { error: null, message: null, slug: null, status: null }

type Intent = 'draft' | 'publish' | 'unpublish'

function intentOf(value: FormDataEntryValue | null): Intent {
  if (value === 'publish' || value === 'unpublish' || value === 'draft') return value
  return 'draft'
}

function validate(input: PromptInput, intent: Intent, usesSteps: boolean): string | null {
  if (!input.title) return 'Title is required.'
  if (intent === 'unpublish') return null
  if (!input.blurb) return 'Blurb is required.'
  if (!input.subject) return 'Choose a subject.'
  if (!input.artStyle) return 'Choose an art style.'
  if (!input.contentType) return 'Choose a content type.'
  const tools = input.tools.filter((row) => row.tool)
  if (tools.length === 0) return 'Add at least one tool.'
  if (intent !== 'publish') return null
  if (usesSteps) {
    const steps = input.steps.filter((step) => step.label || step.note || step.promptText)
    if (steps.length === 0) return 'Add at least one step before publishing a chain.'
    const incomplete = steps.find((step) => !step.label || !step.note || !step.promptText.trim())
    if (incomplete) return 'Every step needs a label, a note, and prompt text before publishing.'
  }
  const halfFaq = input.faqs.find((faq) => (faq.question && !faq.answer) || (!faq.question && faq.answer))
  if (halfFaq) return 'Each FAQ needs both a question and an answer.'
  const halfExample = input.exampleResults.find((row) => !row.image && row.note)
  if (halfExample) return 'Example results need an image.'
  return null
}

function toData(input: PromptInput, usesSteps: boolean, status: 'draft' | 'published') {
  const tools = input.tools
    .filter((row) => row.tool)
    .map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      tool: row.tool as number,
      fit: row.fit,
    }))
  const steps = input.steps
    .filter((step) => step.label || step.note || step.promptText || step.exampleResult)
    .map((step) => ({
      ...(step.id ? { id: step.id } : {}),
      label: step.label,
      note: step.note,
      promptText: step.promptText,
      exampleResult: step.exampleResult,
    }))
  const exampleResults = input.exampleResults
    .filter((row) => row.image)
    .map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      image: row.image as number,
      note: row.note,
    }))
  const faqs = input.faqs
    .filter((faq) => faq.question && faq.answer)
    .map((faq) => ({
      ...(faq.id ? { id: faq.id } : {}),
      question: faq.question,
      answer: faq.answer,
    }))

  return {
    title: input.title,
    blurb: input.blurb,
    subject: input.subject as number,
    artStyle: input.artStyle as number,
    contentType: input.contentType as number,
    tools,
    coverImage: input.coverImage,
    referenceRequired: input.referenceRequired,
    referenceNote: input.referenceRequired ? input.referenceNote : '',
    promptText: usesSteps ? input.promptText : input.promptText,
    steps,
    exampleResults,
    quickAnswer: input.quickAnswer,
    article: {
      heading: input.articleHeading,
      body: input.articleBody,
    },
    faqs,
    similarPrompts: input.similarPrompts,
    seo: {
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    },
    verification: {
      verifiedBy: input.verifiedBy,
      lastVerified: input.lastVerified,
    },
    _status: status,
  }
}

export async function savePrompt(_prev: SavePromptState, formData: FormData): Promise<SavePromptState> {
  const intent = intentOf(formData.get('intent'))
  const id = optionalId(formData.get('id'))
  const raw = textValue(formData, 'payload')
  const input = parsePromptInput(raw)
  if (!input) return { ...idlePromptState, error: 'The form could not be read. Try again.' }

  const { payload, user } = await dashboardContext()

  let usesSteps = false
  if (input.contentType) {
    try {
      const contentType = await payload.findByID({
        collection: 'content-types',
        id: input.contentType,
        depth: 0,
        select: { usesSteps: true },
        user,
        overrideAccess: false,
      })
      usesSteps = Boolean(contentType.usesSteps)
    } catch (error) {
      if (isNextRedirect(error)) throw error
      return { ...idlePromptState, error: 'The selected content type could not be loaded.' }
    }
  }

  const problem = validate(input, intent, usesSteps)
  if (problem) return { ...idlePromptState, error: problem }

  const status: 'draft' | 'published' = intent === 'publish' ? 'published' : 'draft'
  const data = toData(input, usesSteps, status)
  const draft = intent === 'draft'

  try {
    const doc = id
      ? await payload.update({
          collection: 'prompts',
          id,
          data,
          draft,
          depth: 0,
          user,
          overrideAccess: false,
        })
      : await payload.create({
          collection: 'prompts',
          data,
          draft,
          depth: 0,
          user,
          overrideAccess: false,
        })

    if (!id) redirect(`/dashboard/prompts/${doc.id}/?saved=1`)

    const saved = doc as Prompt
    const label = intent === 'publish' ? 'Published.' : intent === 'unpublish' ? 'Unpublished. It is now a draft.' : 'Draft saved.'
    return {
      error: null,
      message: label,
      slug: saved.slug ?? null,
      status: saved._status === 'published' ? 'published' : 'draft',
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { ...idlePromptState, error: formatPayloadError(error) }
  }
}

export async function deletePrompt(formData: FormData): Promise<void> {
  const id = optionalId(formData.get('id'))
  if (!id) redirect('/dashboard/prompts/')
  const { payload, user } = await dashboardContext()
  try {
    await payload.delete({ collection: 'prompts', id, user, overrideAccess: false })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    redirect(`/dashboard/prompts/${id}/?error=delete`)
  }
  redirect('/dashboard/prompts/?deleted=1')
}
