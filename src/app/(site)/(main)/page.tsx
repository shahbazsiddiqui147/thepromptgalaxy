import Link from 'next/link'
import { AdSlot } from '@/components/AdSlot'
import { PromptCard } from '@/components/PromptCard'
import { HomeExplorer } from '@/components/site/HomeExplorer'
import {
  getAdSettings,
  getChainPrompts,
  getPublishedPrompts,
  getSaveCountMap,
  getSubjects,
  getTools,
} from '@/lib/queries'
import { toPromptCard } from '@/lib/promptView'

export const revalidate = 3600

const STEPS = [
  { n: '01', title: 'Pick a category or tool', body: 'Start from what you’re making, or the tool you already use.' },
  { n: '02', title: 'Copy a tested prompt', body: 'Every prompt shows a real example output before you copy it.' },
  { n: '03', title: 'Save what works', body: 'Save prompts to come back to, or submit your own once you’ve tested it.' },
]

export default async function HomePage() {
  const [subjects, tools, prompts, saveCounts, chains, adSettings] = await Promise.all([
    getSubjects(),
    getTools(),
    getPublishedPrompts(),
    getSaveCountMap(),
    getChainPrompts(),
    getAdSettings(),
  ])

  const cards = prompts.flatMap((prompt) => {
    const card = toPromptCard(prompt, saveCounts[prompt.id] ?? 0, 'subject')
    return card ? [card] : []
  })

  const subjectCounts = new Map(subjects.map((subject) => [subject.id, 0]))
  const toolCounts = new Map(tools.map((tool) => [tool.id, 0]))
  const pairs: { subjectId: number; toolId: number; count: number }[] = []
  const pairIndex = new Map<string, number>()

  for (const card of cards) {
    subjectCounts.set(card.subjectId, (subjectCounts.get(card.subjectId) ?? 0) + 1)
    for (const toolId of card.toolIds) {
      toolCounts.set(toolId, (toolCounts.get(toolId) ?? 0) + 1)
      const key = `${card.subjectId}:${toolId}`
      const index = pairIndex.get(key)
      if (index == null) {
        pairIndex.set(key, pairs.length)
        pairs.push({ subjectId: card.subjectId, toolId, count: 1 })
      } else {
        pairs[index].count += 1
      }
    }
  }

  const styles = cards
    .filter((card, index, list) => list.findIndex((item) => item.subjectId === card.subjectId && item.styleSlug === card.styleSlug) === index)
    .map((card) => ({ subjectId: card.subjectId, slug: card.styleSlug, name: card.styleName }))

  const saved = [...cards].sort((a, b) => b.saves - a.saves || b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  const chain = chains[0]
  const chainCard = chain ? toPromptCard(chain, saveCounts[chain.id] ?? 0, 'subject') : null
  const chainSteps = (chain?.steps ?? []).slice(0, 3).map((step, index) => ({
    n: index + 1,
    text: step.promptText,
  }))
  const adsEnabled = Boolean(adSettings.enabled)

  return (
    <>
      <HomeExplorer
        totalPrompts={cards.length}
        subjects={subjects.map((subject) => ({
          id: subject.id,
          slug: subject.slug ?? '',
          name: subject.name,
          count: subjectCounts.get(subject.id) ?? 0,
        }))}
        tools={tools.map((tool) => ({
          id: tool.id,
          slug: tool.slug ?? '',
          name: tool.name,
          count: toolCounts.get(tool.id) ?? 0,
        }))}
        pairs={pairs}
        styles={styles}
      />

      {adsEnabled && adSettings.leaderboardCode?.trim() && (
        <div className="page-pad" style={{ paddingTop: 24 }}>
          <AdSlot html={adSettings.leaderboardCode} />
        </div>
      )}

      <div className="page-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 28, paddingBottom: 16, borderTop: '2px solid var(--color-text)', marginTop: 20 }}>
        <h3 style={{ margin: 0 }}>Most saved</h3>
        <Link href="/browse/" style={{ fontSize: 14, color: 'var(--color-accent-700)', fontWeight: 600, textDecoration: 'none' }}>
          See all →
        </Link>
      </div>
      <div className="card-grid page-pad" style={{ paddingBottom: 40 }}>
        {saved.length === 0 ? (
          <p className="empty-state">No prompts published yet. Categories and tools are ready for the first one.</p>
        ) : (
          saved.map((card) => <PromptCard key={card.id} card={card} />)
        )}
      </div>

      <div className="steps-grid" style={{ borderTop: '2px solid var(--color-text)', padding: '40px 32px' }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ padding: '0 24px', borderLeft: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-accent)' }}>{step.n}</span>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{step.title}</span>
            <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{step.body}</span>
          </div>
        ))}
      </div>

      <div className="chain-grid" style={{ borderTop: '2px solid var(--color-text)' }}>
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <span className="kicker">Prompt chains</span>
          <h2 style={{ fontSize: 38, letterSpacing: '-0.02em', margin: 0, maxWidth: 420 }}>Some jobs take more than one prompt.</h2>
          <p style={{ margin: 0, fontSize: 15, maxWidth: 420 }}>
            Chains walk you through a sequence, tested step by step, so the output holds together across each pass.
          </p>
          <Link href={chainCard?.href ?? '/chains/'} style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none', color: 'var(--color-accent-700)' }}>
            {chainCard ? 'See a chain example →' : 'Browse chains →'}
          </Link>
        </div>
        <div style={{ borderLeft: '2px solid var(--color-text)', padding: 40, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--color-surface)' }}>
          {chainSteps.length === 0 && <p style={{ margin: 0, fontSize: 14 }}>No prompt chains published yet.</p>}
          {chainSteps.map((step) => (
            <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span className="step-num">{step.n}</span>
              <span style={{ fontSize: 14, paddingTop: 2 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="banner">
        <div>
          <h2 style={{ fontSize: 34, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Unlock every premium prompt.</h2>
          <p style={{ margin: 0, fontSize: 15, maxWidth: 480 }}>Premium subscriptions are not open yet. Published prompts stay free to copy.</p>
        </div>
        <Link href="/premium/" className="btn" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 15, padding: '14px 20px' }}>
          Go Premium
          <span style={{ marginLeft: 8 }}>→</span>
        </Link>
      </div>
    </>
  )
}
