import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CatalogView } from '@/components/site/CatalogView'
import { catalogHref } from '@/lib/catalog'
import { getPublishedPrompts, getSaveCountMap, getSubjects, getToolBySlug, getTools } from '@/lib/queries'
import { sortPromptCards, toPromptCard } from '@/lib/promptView'
import type { Subject } from '@/payload-types'

export const revalidate = 3600

export async function generateStaticParams() {
  const tools = await getTools()
  return tools.flatMap((tool) => (tool.slug ? [{ tool: tool.slug }] : []))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>
}): Promise<Metadata> {
  const { tool: toolSlug } = await params
  const tool = await getToolBySlug(toolSlug)
  if (!tool) return {}
  return {
    title: tool.name,
    description: `Every prompt tested and tagged compatible with ${tool.name}.`,
    alternates: { canonical: `https://thepromptgalaxy.com/tool/${tool.slug}/` },
  }
}

function formatCount(count: number) {
  return count.toLocaleString('en-US')
}

export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ tool: string }>
  searchParams: Promise<{ subject?: string; style?: string; sort?: string }>
}) {
  const [{ tool: toolSlug }, query] = await Promise.all([params, searchParams])
  const tool = await getToolBySlug(toolSlug)
  if (!tool?.slug) notFound()

  const [prompts, subjects, saveCounts] = await Promise.all([getPublishedPrompts(), getSubjects(), getSaveCountMap()])
  const allCards = prompts.flatMap((prompt) => {
    const card = toPromptCard(prompt, saveCounts[prompt.id] ?? 0, 'style')
    return card ? [card] : []
  })
  const toolCards = allCards.filter((card) => card.toolIds.includes(tool.id))
  const sort = query.sort === 'new' ? 'new' : 'saved'
  const activeSubject = subjects.find((subject) => subject.slug === query.subject) ?? null
  const path = `/tool/${tool.slug}/`

  const countForSubject = (subject: Subject) => toolCards.filter((card) => card.subjectId === subject.id).length
  const rankedSubjects = [...subjects].sort((a, b) => countForSubject(b) - countForSubject(a))
  const visibleSubjects = rankedSubjects.filter((subject) => countForSubject(subject) > 0 || subject.id === activeSubject?.id)
  const hiddenSubjects = subjects.length - visibleSubjects.length

  const subjectFiltered = activeSubject ? toolCards.filter((card) => card.subjectId === activeSubject.id) : toolCards
  const styleNames = new Map<string, string>()
  for (const card of subjectFiltered) styleNames.set(card.styleSlug, card.styleName)
  const activeStyle = query.style && styleNames.has(query.style) ? query.style : null
  const visible = sortPromptCards(
    activeStyle ? subjectFiltered.filter((card) => card.styleSlug === activeStyle) : subjectFiltered,
    sort,
  )

  const href = (next: { subject?: string | null; style?: string | null; sort?: 'saved' | 'new' }) =>
    catalogHref(path, {
      subject: next.subject === undefined ? activeSubject?.slug : next.subject,
      style: next.style === undefined ? activeStyle : next.style,
      sort: next.sort === undefined ? sort : next.sort,
    })

  const tabs = [
    {
      key: 'all',
      href: href({ subject: null }),
      label: 'All categories',
      count: formatCount(toolCards.length),
      current: !activeSubject,
    },
    ...visibleSubjects.flatMap((subject) =>
      subject.slug
        ? [
            {
              key: subject.slug,
              href: href({ subject: subject.slug, style: null }),
              label: subject.name,
              count: formatCount(countForSubject(subject)),
              current: subject.id === activeSubject?.id,
            },
          ]
        : [],
    ),
  ]
  if (hiddenSubjects > 0) {
    tabs.push({ key: 'more', href: '/#categories', label: `+ ${hiddenSubjects} more`, count: '', current: false })
  }

  const chips = [...styleNames.entries()].map(([slug, name]) => ({
    key: slug,
    href: href({ style: activeStyle === slug ? null : slug }),
    label: name,
    current: activeStyle === slug,
  }))

  const topSubject = rankedSubjects.find((subject) => countForSubject(subject) > 0 && subject.slug) ?? null
  const mirror = topSubject?.slug
    ? {
        href: `/${topSubject.slug}/?tool=${encodeURIComponent(tool.slug)}`,
        title: `${topSubject.name}: ${formatCount(allCards.filter((card) => card.subjectId === topSubject.id).length)} prompts →`,
        body: `${tool.name}'s top category.`,
        tone: 'accent' as const,
      }
    : null

  const headline = activeSubject
    ? `${formatCount(visible.length)} ${activeSubject.name.toLowerCase()} prompts tested on ${tool.name}`
    : `${formatCount(visible.length)} prompts tested on ${tool.name}`

  return (
    <CatalogView
      kicker={`By tool / ${tool.name}`}
      title={tool.name}
      mirror={mirror}
      tabs={tabs}
      headline={headline}
      chips={chips}
      sort={sort}
      sortSavedHref={href({ sort: 'saved' })}
      sortNewHref={href({ sort: 'new' })}
      cards={visible}
    />
  )
}

