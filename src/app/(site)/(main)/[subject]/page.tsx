import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CatalogView } from '@/components/site/CatalogView'
import { catalogHref } from '@/lib/catalog'
import { getPublishedPrompts, getSaveCountMap, getSubjectBySlug, getSubjects, getTools } from '@/lib/queries'
import { sortPromptCards, toPromptCard, type PromptCardData } from '@/lib/promptView'
import type { Tool } from '@/payload-types'

export const revalidate = 3600

export async function generateStaticParams() {
  const subjects = await getSubjects()
  return subjects.flatMap((subject) => (subject.slug ? [{ subject: subject.slug }] : []))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string }>
}): Promise<Metadata> {
  const { subject: subjectSlug } = await params
  const subject = await getSubjectBySlug(subjectSlug)
  if (!subject) return {}
  return {
    title: subject.name,
    description: subject.description || `Browse every ${subject.name} prompt in the library.`,
    alternates: { canonical: `https://thepromptgalaxy.com/${subject.slug}/` },
  }
}

function formatCount(count: number) {
  return count.toLocaleString('en-US')
}

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>
  searchParams: Promise<{ tool?: string; style?: string; sort?: string }>
}) {
  const [{ subject: subjectSlug }, query] = await Promise.all([params, searchParams])
  const subject = await getSubjectBySlug(subjectSlug)
  if (!subject?.slug) notFound()

  const [prompts, tools, saveCounts] = await Promise.all([getPublishedPrompts(), getTools(), getSaveCountMap()])
  const allCards = prompts.flatMap((prompt) => {
    const card = toPromptCard(prompt, saveCounts[prompt.id] ?? 0, 'style')
    return card ? [card] : []
  })
  const subjectCards = allCards.filter((card) => card.subjectId === subject.id)
  const sort = query.sort === 'new' ? 'new' : 'saved'
  const activeTool = tools.find((tool) => tool.slug === query.tool) ?? null
  const path = `/${subject.slug}/`

  const countForTool = (tool: Tool) => subjectCards.filter((card) => card.toolIds.includes(tool.id)).length
  const rankedTools = [...tools].sort((a, b) => countForTool(b) - countForTool(a))
  const visibleTools = rankedTools.filter((tool) => countForTool(tool) > 0 || tool.id === activeTool?.id)
  const hiddenTools = tools.length - visibleTools.length

  const toolFiltered = activeTool ? subjectCards.filter((card) => card.toolIds.includes(activeTool.id)) : subjectCards
  const styleNames = new Map<string, string>()
  for (const card of toolFiltered) styleNames.set(card.styleSlug, card.styleName)
  const activeStyle = query.style && styleNames.has(query.style) ? query.style : null
  const visible = sortPromptCards(
    activeStyle ? toolFiltered.filter((card) => card.styleSlug === activeStyle) : toolFiltered,
    sort,
  )

  const href = (next: { tool?: string | null; style?: string | null; sort?: 'saved' | 'new' }) =>
    catalogHref(path, {
      tool: next.tool === undefined ? activeTool?.slug : next.tool,
      style: next.style === undefined ? activeStyle : next.style,
      sort: next.sort === undefined ? sort : next.sort,
    })

  const tabs = [
    {
      key: 'all',
      href: href({ tool: null }),
      label: 'All tools',
      count: formatCount(subjectCards.length),
      current: !activeTool,
    },
    ...visibleTools.map((tool) => ({
      key: tool.slug ?? String(tool.id),
      href: href({ tool: tool.slug, style: null }),
      label: tool.name,
      count: formatCount(countForTool(tool)),
      current: tool.id === activeTool?.id,
    })),
  ]
  if (hiddenTools > 0) {
    tabs.push({ key: 'more', href: '/tool/', label: `+ ${hiddenTools} more`, count: '', current: false })
  }

  const chips = [...styleNames.entries()].map(([slug, name]) => ({
    key: slug,
    href: href({ style: activeStyle === slug ? null : slug }),
    label: name,
    current: activeStyle === slug,
  }))

  const topTool = rankedTools.find((tool) => countForTool(tool) > 0) ?? null
  const mirror = topTool?.slug
    ? {
        href: `/tool/${topTool.slug}/?subject=${encodeURIComponent(subject.slug)}`,
        title: `${topTool.name}: ${formatCount(allCards.filter((card) => card.toolIds.includes(topTool.id)).length)} prompts →`,
        body: mirrorBody(allCards, topTool, subject.name, subject.id),
        tone: 'surface' as const,
      }
    : null

  const headline = activeTool
    ? `${formatCount(visible.length)} ${subject.name.toLowerCase()} prompts tested on ${activeTool.name}`
    : `${formatCount(visible.length)} ${subject.name.toLowerCase()} prompts`

  const showFit = Boolean(activeTool && toolFiltered.some((card) => activeTool && card.greatToolIds.includes(activeTool.id)))

  return (
    <CatalogView
      kicker={`By category / ${subject.name}`}
      title={subject.name}
      mirror={mirror}
      tabs={tabs}
      headline={headline}
      fitLabel={showFit ? 'Great fit only' : null}
      chips={chips}
      sort={sort}
      sortSavedHref={href({ sort: 'saved' })}
      sortNewHref={href({ sort: 'new' })}
      cards={visible}
    />
  )
}

function mirrorBody(cards: PromptCardData[], tool: Tool, subjectName: string, subjectId: number) {
  const counts = new Map<number, number>()
  for (const card of cards) {
    if (!card.toolIds.includes(tool.id)) continue
    counts.set(card.subjectId, (counts.get(card.subjectId) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top && top[0] === subjectId) return `${subjectName} is its top category.`
  return `${subjectName} is one of its categories.`
}
