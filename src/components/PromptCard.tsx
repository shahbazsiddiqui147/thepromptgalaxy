import Image from 'next/image'
import Link from 'next/link'
import type { Prompt, Subject, ArtStyle, Media } from '@/payload-types'

export function PromptCard({
  prompt,
  saveCount,
  showChainBadge,
}: {
  prompt: Prompt
  /** Renders a small "♥ {n}" mono label in the card footer -- only when explicitly passed (not just >= 0). */
  saveCount?: number
  /** Renders a corner "CHAIN" badge over the cover image -- only when true AND the prompt is actually a chain. */
  showChainBadge?: boolean
}) {
  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const href = `/${subject.slug}/${artStyle.slug}/${prompt.slug}/`
  const coverImage = typeof prompt.coverImage === 'object' ? (prompt.coverImage as Media | null) : null
  const coverImageUrl = coverImage?.sizes?.card?.url || coverImage?.url

  return (
    <article
      style={{
        background: 'var(--paper)',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            aspectRatio: '1 / 1',
            position: 'relative',
            background: `linear-gradient(135deg, ${artStyle.colorHex ?? '#5C7A82'}55, var(--ink))`,
          }}
        >
          {coverImageUrl && (
            <Image
              src={coverImageUrl}
              alt={coverImage?.alt || prompt.title}
              fill
              sizes="(max-width: 768px) 100vw, 240px"
              style={{ objectFit: 'cover' }}
            />
          )}
          {showChainBadge && prompt.contentTypeUsesSteps && (
            <span
              className="mono"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'var(--rust)',
                color: 'var(--paper)',
                padding: '3px 7px',
                borderRadius: 2,
                fontSize: 9.5,
                letterSpacing: '0.08em',
              }}
            >
              CHAIN
            </span>
          )}
        </div>
        <div style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            {prompt.title}
          </div>
          <div style={{ fontSize: 12.5, color: '#6E7392', lineHeight: 1.4 }}>{prompt.blurb}</div>
          {saveCount !== undefined && (
            <div className="mono" style={{ fontSize: 11, color: '#6E7392', marginTop: 8 }}>
              ♥ {saveCount}
            </div>
          )}
        </div>
      </Link>
    </article>
  )
}
