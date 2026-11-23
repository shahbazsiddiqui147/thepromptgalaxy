'use client'

import { useState, useMemo } from 'react'
import { PromptCard } from '@/components/PromptCard'
import type { Prompt, Subject, Tool } from '@/payload-types'

export function BrowseClient({
  prompts,
  subjects,
  tools,
}: {
  prompts: Prompt[]
  subjects: Subject[]
  tools: Tool[]
}) {
  const [activeSubject, setActiveSubject] = useState<string>('All')
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      const subject = p.subject as Subject
      const promptTools = p.tools as { tool: Tool | number; fit: string }[]
      const subjectMatch = activeSubject === 'All' || (subject.slug ?? '') === activeSubject
      const toolMatch =
        activeTools.size === 0 ||
        promptTools.some((t) => {
          const slug = typeof t.tool === 'object' ? t.tool?.slug : undefined
          return activeTools.has(slug ?? '')
        })
      return subjectMatch && toolMatch
    })
  }, [prompts, activeSubject, activeTools])

  const toggleTool = (slug: string) => {
    setActiveTools((prev) => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  return (
    <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 56 }}>
      <span className="kicker">Browse</span>
      <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '-0.03em', margin: '8px 0 16px' }}>Browse</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        <button
          onClick={() => setActiveSubject('All')}
          aria-pressed={activeSubject === 'All'}
          style={{
            padding: '8px 16px',
            border: `1px solid ${activeSubject === 'All' ? 'var(--color-accent)' : 'var(--color-divider)'}`,
            background: activeSubject === 'All' ? 'var(--color-accent)' : 'transparent',
            color: activeSubject === 'All' ? 'var(--color-bg)' : 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubject(s.slug ?? '')}
            aria-pressed={activeSubject === (s.slug ?? '')}
            style={{
              padding: '8px 16px',
              border: `1px solid ${activeSubject === (s.slug ?? '') ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              background: activeSubject === (s.slug ?? '') ? 'var(--color-accent)' : 'transparent',
              color: activeSubject === (s.slug ?? '') ? 'var(--color-bg)' : 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTool(t.slug ?? '')}
            aria-pressed={activeTools.has(t.slug ?? '')}
            style={{
              padding: '7px 14px',
              border: `1px solid ${activeTools.has(t.slug ?? '') ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              background: activeTools.has(t.slug ?? '') ? 'var(--color-accent-100)' : 'transparent',
              color: activeTools.has(t.slug ?? '') ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
              cursor: 'pointer',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {filtered.map((p) => (
          <PromptCard key={p.id} prompt={p} />
        ))}
        {filtered.length === 0 && <p className="empty-state">No prompts match these filters.</p>}
      </div>
    </div>
  )
}
