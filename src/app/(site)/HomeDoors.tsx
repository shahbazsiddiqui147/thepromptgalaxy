'use client'

import Link from 'next/link'
import { useState } from 'react'

type Item = { id: number; slug: string; name: string; count: number }
type Props = {
  total: number
  categories: Item[]
  tools: Item[]
  pairCounts: { categoryId: number; toolId: number; count: number }[]
}

export function HomeDoors({ total, categories, tools, pairCounts }: Props) {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [toolId, setToolId] = useState<number | null>(null)
  const category = categories.find((c) => c.id === categoryId) ?? null
  const tool = tools.find((t) => t.id === toolId) ?? null
  const pair = (c: number, t: number) => pairCounts.find((p) => p.categoryId === c && p.toolId === t)?.count ?? 0

  let heroLine = `${total.toLocaleString('en-US')} prompts. Start from what you know.`
  let cta: { label: string; href: string } | null = null
  if (category && tool) {
    heroLine = `${category.name} prompts for ${tool.name}.`
    cta = { label: `Show ${category.name} × ${tool.name} prompts`, href: `/category/${category.slug}/?tool=${tool.slug}` }
  } else if (category) {
    heroLine = `${category.name}. Pick a tool, or browse all.`
    cta = { label: `Show all ${category.name} prompts`, href: `/category/${category.slug}/` }
  } else if (tool) {
    heroLine = `${tool.name}. Pick what you are making, or browse all.`
    cta = { label: `Show all ${tool.name} prompts`, href: `/tool/${tool.slug}/` }
  }

  if (categories.length === 0 && tools.length === 0) {
    return (
      <div className="hero">
        <h1>No prompts yet.</h1>
      </div>
    )
  }

  return (
    <>
      <div className="hero">
        <h1>{heroLine}</h1>
        {cta ? (
          <div className="hero-cta">
            <Link href={cta.href} className="btn btn-primary">
              {cta.label} <span style={{ marginLeft: 8 }}>→</span>
            </Link>
            <button type="button" className="link-btn" onClick={() => { setCategoryId(null); setToolId(null) }}>
              Clear selection ×
            </button>
          </div>
        ) : null}
      </div>
      <div className="doors">
        <div className="door" id="categories">
          <span className="kicker">Door 01</span>
          <h2>What are you making?</h2>
          <div className="door-list">
            {categories.map((c, i) => {
              const on = c.id === categoryId
              return (
                <button key={c.id} type="button" className={`door-row${on ? ' on' : ''}`} onClick={() => setCategoryId(on ? null : c.id)}>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="name">{c.name}</span>
                  <span className="count">{tool ? `${pair(c.id, tool.id)} with ${tool.name}` : c.count}</span>
                  <span>{on ? '✓' : '→'}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="door door-red" id="tools">
          <span className="kicker">Door 02</span>
          <h2>Which tool do you use?</h2>
          <div className="door-tools">
            {tools.map((t) => {
              const on = t.id === toolId
              return (
                <button key={t.id} type="button" className={`door-tool${toolId && !on ? ' dim' : ''}${on ? ' on' : ''}`} onClick={() => setToolId(on ? null : t.id)}>
                  <span className="name">{t.name}</span>
                  <span className="count">{category ? `${pair(category.id, t.id)} in ${category.name}` : t.count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
