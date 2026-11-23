'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { formatSaves, toPromptCard, type PromptCardData } from '@/lib/promptView'
import type { Prompt } from '@/payload-types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null

  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ marginLeft: 'auto', padding: '5px 9px', fontSize: 12, gap: 6 }}
      onClick={async (event) => {
        event.preventDefault()
        event.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          // Clipboard can be unavailable; the label still confirms the attempt.
        }
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function PromptCard({
  prompt,
  saveCount,
  card,
  eyebrow,
}: {
  prompt?: Prompt
  saveCount?: number
  card?: PromptCardData
  /** Homepage cards label the subject; listings label the art style. */
  eyebrow?: 'subject' | 'style'
}) {
  const model = card ?? (prompt ? toPromptCard(prompt, saveCount ?? 0, eyebrow ?? 'style') : null)
  if (!model) return null

  const tone = model.tone
  const captionColor = tone >= 600 ? 'var(--color-neutral-200)' : 'var(--color-neutral-800)'

  return (
    <article className="prompt-card">
      <Link href={model.href} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="prompt-card-media" style={{ background: `var(--color-neutral-${tone})` }}>
          {model.imageUrl && (
            <Image
              src={model.imageUrl}
              alt={model.imageAlt}
              fill
              sizes="(max-width: 800px) 100vw, 25vw"
              className="grayscale"
              style={{ objectFit: 'cover' }}
            />
          )}
          <div className="prompt-card-badges">
            <span className="badge" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              FREE
            </span>
            {model.chain && (
              <span className="badge" style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}>
                CHAIN{model.stepCount > 0 ? ` · ${model.stepCount} STEPS` : ''}
              </span>
            )}
          </div>
          <span style={{ position: 'relative', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: captionColor }}>
            Example output
          </span>
        </div>
        <div className="prompt-card-body">
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-700)', fontWeight: 600 }}>
            {model.eyebrow}
          </span>
          <span style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{model.title}</span>
        </div>
      </Link>
      <div className="prompt-card-meta" style={{ padding: '0 12px 10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {formatSaves(model.saves)}
        </span>
        <CopyButton text={model.copyText} />
      </div>
    </article>
  )
}
