import Link from 'next/link'
import { PromptCard } from '@/components/PromptCard'
import type { PromptCardData } from '@/lib/promptView'

type Tab = { key: string; href: string; label: string; count: string; current: boolean }
type Chip = { key: string; href: string; label: string; current: boolean }

export function CatalogView({
  kicker,
  title,
  mirror,
  tabs,
  headline,
  fitLabel,
  chips,
  sort,
  sortSavedHref,
  sortNewHref,
  cards,
}: {
  kicker: string
  title: string
  mirror: { href: string; title: string; body: string; tone: 'surface' | 'accent' } | null
  tabs: Tab[]
  headline: string
  fitLabel?: string | null
  chips: Chip[]
  sort: 'saved' | 'new'
  sortSavedHref: string
  sortNewHref: string
  cards: PromptCardData[]
}) {
  return (
    <>
      <div className="hero-split">
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginBottom: 12 }}>{kicker}</div>
          <h1 className="display-xl">{title}</h1>
        </div>
        {mirror ? (
          <Link
            href={mirror.href}
            className="mirror-card"
            style={
              mirror.tone === 'accent'
                ? { background: 'var(--color-accent)', color: 'var(--color-bg)' }
                : { background: 'var(--color-surface)', color: 'inherit' }
            }
          >
            <span style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Mirror</span>
            <span
              style={{
                display: 'block',
                fontWeight: 800,
                fontSize: 16,
                color: mirror.tone === 'accent' ? 'inherit' : 'var(--color-accent-700)',
              }}
            >
              {mirror.title}
            </span>
            <span>{mirror.body}</span>
          </Link>
        ) : (
          <div className="mirror-card" style={{ background: 'var(--color-surface)' }}>
            <span style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Mirror</span>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 16 }}>Nothing to mirror yet</span>
            <span>Prompts will connect this page to the other door.</span>
          </div>
        )}
      </div>

      <div className="tab-row">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} className="tab-link" aria-current={tab.current ? 'page' : undefined}>
            <span style={{ fontWeight: 800 }}>{tab.label}</span>
            {tab.count && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{tab.count}</span>}
          </Link>
        ))}
      </div>

      <div className="filter-bar">
        <span style={{ fontWeight: 800, fontSize: 17 }}>{headline}</span>
        {fitLabel && <span className="tag tag-accent">{fitLabel}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="tag tag-neutral"
              style={{
                textDecoration: 'none',
                background: chip.current ? 'var(--color-accent)' : 'var(--color-neutral-200)',
                color: chip.current ? 'var(--color-bg)' : 'var(--color-text)',
              }}
            >
              {chip.label}
            </Link>
          ))}
        </div>
        <span>Price: All</span>
        <Link href={sort === 'saved' ? sortNewHref : sortSavedHref} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
          Sort: {sort === 'saved' ? 'Most saved' : 'Newest'} ▾
        </Link>
      </div>

      <div className="card-grid page-pad" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {cards.length === 0 ? (
          <p className="empty-state">No prompts published here yet.</p>
        ) : (
          cards.map((card) => <PromptCard key={card.id} card={card} />)
        )}
      </div>
    </>
  )
}
