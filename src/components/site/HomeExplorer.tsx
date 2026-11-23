'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type DoorItem = { id: number; slug: string; name: string; count: number }
type PairCount = { subjectId: number; toolId: number; count: number }
type StyleChip = { subjectId: number; slug: string; name: string }

function formatCount(n: number) {
  return n.toLocaleString('en-US')
}

export function HomeExplorer({
  totalPrompts,
  subjects,
  tools,
  pairs,
  styles,
}: {
  totalPrompts: number
  subjects: DoorItem[]
  tools: DoorItem[]
  pairs: PairCount[]
  styles: StyleChip[]
}) {
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [toolId, setToolId] = useState<number | null>(null)

  const subject = subjects.find((item) => item.id === subjectId) ?? null
  const tool = tools.find((item) => item.id === toolId) ?? null

  const pairCount = (nextSubjectId: number, nextToolId: number) =>
    pairs.find((pair) => pair.subjectId === nextSubjectId && pair.toolId === nextToolId)?.count ?? 0

  const hero = useMemo(() => {
    if (subject && tool) return `${subject.name} prompts for ${tool.name}.`
    if (subject) return `${subject.name}. Pick a tool, or browse all.`
    if (tool) return `${tool.name}. Pick what you're making, or browse all.`
    if (totalPrompts > 0) return `${formatCount(totalPrompts)} prompts. Start from what you know.`
    return 'Start from what you know.'
  }, [subject, tool, totalPrompts])

  let ctaHref = ''
  let ctaLabel = ''
  if (subject && tool) {
    ctaHref = `/${subject.slug}/?tool=${encodeURIComponent(tool.slug)}`
    ctaLabel = `Show ${subject.name} × ${tool.name} prompts`
  } else if (subject) {
    ctaHref = `/${subject.slug}/`
    ctaLabel = `Show all ${subject.name} prompts`
  } else if (tool) {
    ctaHref = `/tool/${tool.slug}/`
    ctaLabel = `Show all ${tool.name} prompts`
  }

  const visibleStyles = subject ? styles.filter((style) => style.subjectId === subject.id) : []

  return (
    <>
      <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 32, borderBottom: '2px solid var(--color-text)' }}>
        <h1 className="display-hero">{hero}</h1>
        {(subject || tool) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <Link href={ctaHref} className="btn btn-primary" style={{ fontSize: 15, padding: '12px 16px' }}>
              {ctaLabel}
              <span style={{ marginLeft: 8 }}>→</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubjectId(null)
                setToolId(null)
              }}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-accent-700)',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear selection ×
            </button>
          </div>
        )}
      </div>

      <div className="door-grid" id="categories">
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column' }}>
          <span className="kicker">Door 01</span>
          <h2 style={{ fontSize: 44, letterSpacing: '-0.03em', margin: '6px 0 20px' }}>What are you making?</h2>
          <div style={{ borderTop: '2px solid var(--color-text)' }}>
            {subjects.length === 0 && <p className="empty-state">No categories published yet.</p>}
            {subjects.map((item, index) => {
              const active = item.id === subjectId
              const count = tool ? pairCount(item.id, tool.id) : item.count
              const countLabel = tool ? `${formatCount(count)} with ${tool.name}` : formatCount(item.count)
              return (
                <button
                  key={item.id}
                  type="button"
                  className="door-row"
                  aria-pressed={active}
                  onClick={() => setSubjectId(active ? null : item.id)}
                  style={{ background: active ? 'var(--color-accent-100)' : 'transparent' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent)' }}>{String(index + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: active ? 'var(--color-accent-700)' : 'var(--color-text)' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{countLabel}</span>
                  <span style={{ color: active ? 'var(--color-accent-700)' : 'var(--color-text)' }}>{active ? '✓' : '→'}</span>
                </button>
              )
            })}
          </div>
          {subjects.length > 0 && (
            <Link href="/browse/" style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: 'var(--color-accent-700)', textDecoration: 'none' }}>
              All {subjects.length} categories →
            </Link>
          )}
        </div>

        <div style={{ padding: 32, background: 'var(--color-accent)', color: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Door 02</span>
          <h2 style={{ fontSize: 44, letterSpacing: '-0.03em', margin: '6px 0 20px' }}>Which tool do you use?</h2>
          <div className="tool-grid">
            {tools.length === 0 && <p>No tools published yet.</p>}
            {tools.map((item) => {
              const active = item.id === toolId
              const count = subject ? pairCount(subject.id, item.id) : item.count
              const countLabel = subject ? `${formatCount(count)} in ${subject.name}` : formatCount(item.count)
              return (
                <button
                  key={item.id}
                  type="button"
                  className="tool-row"
                  aria-pressed={active}
                  onClick={() => setToolId(active ? null : item.id)}
                  style={{ opacity: !tool || active ? 1 : 0.55 }}
                >
                  <span style={{ fontSize: 17, fontWeight: 800, textDecoration: active ? 'underline' : 'none' }}>{item.name}</span>
                  <span style={{ fontSize: 12 }}>{countLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ paddingTop: 28, paddingBottom: 8, borderTop: '2px solid var(--color-text)' }}>
        <h3 style={{ margin: '0 0 6px' }}>Art styles</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, maxWidth: 640 }}>
          Styles are a third filter, not a top-level door — they only apply within image categories, so they show up once you&apos;ve picked a category or tool, not before.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {!subject && <span className="tag tag-neutral">Pick a category above to see its styles</span>}
          {subject && visibleStyles.length === 0 && <span className="tag tag-neutral">No art styles in this category yet</span>}
          {subject &&
            visibleStyles.map((style) => (
              <Link key={style.slug} href={`/${subject.slug}/?style=${encodeURIComponent(style.slug)}`} className="tag tag-neutral" style={{ textDecoration: 'none' }}>
                {style.name}
              </Link>
            ))}
        </div>
      </div>
    </>
  )
}
