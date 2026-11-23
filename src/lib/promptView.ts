import type { ArtStyle, Prompt, Subject, Tool } from '@/payload-types'
import { mediaSizeUrl } from '@/lib/mediaUrl'

const TONES = [300, 400, 500, 600, 700, 800] as const

export type PromptTone = (typeof TONES)[number]

export type PromptCardData = {
  id: number
  title: string
  href: string
  eyebrow: string
  saves: number
  chain: boolean
  stepCount: number
  tone: PromptTone
  imageUrl: string | null
  imageAlt: string
  copyText: string
  subjectId: number
  subjectSlug: string
  subjectName: string
  styleId: number
  styleSlug: string
  styleName: string
  toolIds: number[]
  greatToolIds: number[]
  createdAt: string
}

type ToolEntry = { tool: Tool | number; fit?: 'great' | 'good' | null }

function relation<T extends { id: number }>(value: T | number | null | undefined): T | null {
  return value && typeof value === 'object' ? value : null
}

export function promptCopyText(prompt: Prompt): string {
  if (prompt.contentTypeUsesSteps) {
    return (prompt.steps ?? [])
      .map((step) => step.promptText)
      .filter((text): text is string => Boolean(text && text.trim()))
      .join('\n\n')
  }
  return prompt.promptText?.trim() ?? ''
}

export function toPromptCard(
  prompt: Prompt,
  saveCount = 0,
  eyebrow: 'subject' | 'style' = 'style',
): PromptCardData | null {
  const subject = relation<Subject>(prompt.subject as Subject | number)
  const artStyle = relation<ArtStyle>(prompt.artStyle as ArtStyle | number)
  if (!subject?.slug || !artStyle?.slug || !prompt.slug) return null

  const steps = prompt.steps ?? []
  const cover = typeof prompt.coverImage === 'object' ? prompt.coverImage : null
  const toolIds: number[] = []
  const greatToolIds: number[] = []
  for (const entry of (prompt.tools ?? []) as ToolEntry[]) {
    const tool = relation<Tool>(entry.tool)
    const id = tool?.id ?? (typeof entry.tool === 'number' ? entry.tool : null)
    if (id == null) continue
    toolIds.push(id)
    if (entry.fit === 'great') greatToolIds.push(id)
  }

  const createdAtValue = (prompt as { createdAt?: unknown }).createdAt

  return {
    id: prompt.id,
    title: prompt.title,
    href: `/${subject.slug}/${artStyle.slug}/${prompt.slug}/`,
    eyebrow: eyebrow === 'subject' ? subject.name : artStyle.name,
    saves: saveCount,
    chain: Boolean(prompt.contentTypeUsesSteps),
    stepCount: steps.length,
    tone: TONES[Math.abs(prompt.id) % TONES.length],
    imageUrl: mediaSizeUrl(cover, 'card'),
    imageAlt: cover?.alt || prompt.title,
    copyText: promptCopyText(prompt),
    subjectId: subject.id,
    subjectSlug: subject.slug,
    subjectName: subject.name,
    styleId: artStyle.id,
    styleSlug: artStyle.slug,
    styleName: artStyle.name,
    toolIds,
    greatToolIds,
    createdAt: typeof createdAtValue === 'string' ? createdAtValue : '',
  }
}

export function formatSaves(count: number): string {
  if (count >= 1000) {
    const value = count / 1000
    const digits = count >= 10000 ? 0 : 1
    return `${value.toFixed(digits).replace(/\.0$/, '')}k`
  }
  return String(count)
}

export function sortPromptCards(cards: PromptCardData[], sort: 'saved' | 'new'): PromptCardData[] {
  const next = [...cards]
  if (sort === 'new') {
    next.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title))
  } else {
    next.sort((a, b) => b.saves - a.saves || a.title.localeCompare(b.title))
  }
  return next
}
