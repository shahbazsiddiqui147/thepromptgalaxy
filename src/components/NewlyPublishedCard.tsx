import Image from 'next/image'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { Prompt, Subject, ArtStyle, Media } from '@/payload-types'

// A fixed-width card for the homepage's horizontally-scrolling "Newly
// Published" row. Visually related to PromptCard but shows subject + time
// instead of the blurb, so it's a minimal sibling rather than a PromptCard
// variant.
export function NewlyPublishedCard({ prompt }: { prompt: Prompt }) {
  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const href = `/${subject.slug}/${artStyle.slug}/${prompt.slug}/`
  const coverImage = typeof prompt.coverImage === 'object' ? (prompt.coverImage as Media | null) : null
  const coverImageUrl = coverImage?.sizes?.card?.url || coverImage?.url

  return (
    <Link
      href={href}
      style={{ flex: '0 0 220px', width: 220, textDecoration: 'none', color: 'inherit' }}
    >
      <article
        style={{
          background: 'var(--paper)',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
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
              sizes="220px"
              style={{ objectFit: 'cover' }}
            />
          )}
        </div>
        <div style={{ padding: '12px 14px 14px' }}>
          <div
            className="mono"
            style={{ fontSize: 10.5, color: 'var(--steel)', letterSpacing: '0.06em', marginBottom: 5 }}
          >
            {subject.name.toUpperCase()} · {formatRelativeTime(prompt.createdAt)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>
            {prompt.title}
          </div>
        </div>
      </article>
    </Link>
  )
}
