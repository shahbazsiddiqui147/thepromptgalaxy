import Link from 'next/link'
import type { Prompt, Subject, ArtStyle } from '@/payload-types'

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const href = `/${subject.slug}/${artStyle.slug}/${prompt.slug}/`

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
            height: 130,
            background: `linear-gradient(135deg, ${artStyle.colorHex ?? '#5C7A82'}55, var(--ink))`,
          }}
        />
        <div style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            {prompt.title}
          </div>
          <div style={{ fontSize: 12.5, color: '#6E7392', lineHeight: 1.4 }}>{prompt.blurb}</div>
        </div>
      </Link>
    </article>
  )
}
