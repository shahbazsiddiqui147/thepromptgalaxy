import Link from 'next/link'
import { getSubjects, getRecentPrompts, getChainPrompts } from '@/lib/queries'
import { PromptCard } from '@/components/PromptCard'
import type { Subject } from '@/payload-types'

export const revalidate = 3600

export default async function HomePage() {
  const [subjects, recentPrompts, chainPrompts] = await Promise.all([
    getSubjects(),
    getRecentPrompts(8),
    getChainPrompts(),
  ])

  return (
    <div className="wrap" style={{ padding: '48px 24px' }}>
      <section style={{ marginBottom: 48 }}>
        <div className="eyebrow mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '0.2em', marginBottom: 10 }}>
          THEPROMPTGALAXY.COM
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 6vw, 64px)', margin: 0 }}>
          THE PROMPT GALAXY
        </h1>
        <p style={{ color: 'var(--fade)', fontSize: 16, maxWidth: 560, marginTop: 14 }}>
          Every look, every tool, charted in one place. Start wherever you think: the subject, the
          look, the tool, or the format.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
          FEATURED PROMPTS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {recentPrompts.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
          BROWSE BY SUBJECT
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {subjects.map((s: Subject) => (
            <Link
              key={s.id}
              href={`/${s.slug}/`}
              className="mono"
              style={{
                padding: '8px 16px',
                borderRadius: 2,
                border: '1px solid var(--border)',
                color: 'var(--paper)',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              {s.name}
            </Link>
          ))}
          <Link
            href="/style/"
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--fade)', textDecoration: 'none', fontSize: 13 }}
          >
            All styles →
          </Link>
          <Link
            href="/tool/"
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--fade)', textDecoration: 'none', fontSize: 13 }}
          >
            All tools →
          </Link>
          <Link
            href="/chains/"
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--fade)', textDecoration: 'none', fontSize: 13 }}
          >
            Chains →
          </Link>
        </div>
      </section>

      {chainPrompts.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
            PROMPT CHAINS
          </div>
          <p style={{ color: 'var(--fade)', fontSize: 13, marginBottom: 16, maxWidth: 560 }}>
            Multi-step sequences where each frame carries context forward — nobody else in this
            space does this.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {chainPrompts.slice(0, 4).map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
          <Link href="/chains/" className="mono" style={{ color: 'var(--amber)', fontSize: 13 }}>
            View all chains →
          </Link>
        </section>
      )}

      <section style={{ marginBottom: 48 }}>
        <div
          className="mono"
          style={{
            maxWidth: 728,
            height: 90,
            margin: '0 auto',
            border: '1px dashed #3A3F5C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--fade)',
            letterSpacing: '0.1em',
          }}
        >
          AD SLOT · 728×90
        </div>
      </section>

      <section style={{ maxWidth: 620 }}>
        <p style={{ color: 'var(--fade)', fontSize: 13.5, lineHeight: 1.6 }}>
          The Prompt Galaxy is a library of AI image-generation prompts organized by subject, art
          style, and tool — including multi-step prompt chains and reference-image prompts, not
          just single-shot text.
        </p>
      </section>
    </div>
  )
}
