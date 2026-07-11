import Link from 'next/link'
import {
  getSubjectsWithCounts,
  getArtStyles,
  getTools,
  getRecentPrompts,
  getTrendingPrompts,
  getAdSettings,
} from '@/lib/queries'
import { PromptCard } from '@/components/PromptCard'
import { NewlyPublishedCard } from '@/components/NewlyPublishedCard'
import { SearchForm } from '@/components/SearchForm'
import { AdSlot } from '@/components/AdSlot'

export const revalidate = 3600

const SEARCH_SUGGESTIONS = [
  'reference-image selfie',
  'product catalog',
  'comic portrait',
  'wedding photoshoot',
]

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Find a prompt',
    body: 'Browse by subject, art style, or tool — or search for exactly what you need.',
  },
  {
    title: 'Copy it',
    body: 'One click copies the exact prompt text, or every step for a multi-step chain.',
  },
  {
    title: 'Attach a reference photo',
    body: "If the prompt needs one, upload your own photo alongside it on the AI tool — we never handle uploads ourselves.",
  },
  {
    title: 'Run it on your tool',
    body: 'Paste it into whichever tool the prompt was tested on and generate your result.',
  },
]

// Small labeled wrapper matching the prompt detail page's AdSlotSection
// convention -- admin-controlled, renders nothing when disabled or empty so
// the homepage never shows an empty box. This is a plain Local API read
// (findGlobal), no cookies()/headers() -- doesn't affect this page's ISR.
function LeaderboardAdSlot({ code }: { code?: string | null }) {
  if (!code || !code.trim()) return null
  return (
    <section style={{ marginBottom: 48 }}>
      <div
        className="mono"
        style={{
          maxWidth: 728,
          margin: '0 auto',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '10px 14px',
          background: 'var(--ink-panel)',
        }}
      >
        <AdSlot html={code} />
      </div>
    </section>
  )
}

export default async function HomePage() {
  const [subjectsWithCounts, artStyles, tools, newlyPublished, trending, adSettings] = await Promise.all([
    getSubjectsWithCounts(),
    getArtStyles(),
    getTools(),
    getRecentPrompts(12),
    getTrendingPrompts(10),
    getAdSettings(),
  ])
  const adsEnabled = Boolean(adSettings.enabled)

  return (
    <div className="wrap" style={{ padding: '48px 24px' }}>
      <section style={{ marginBottom: 40 }}>
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

      {newlyPublished.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
            NEWLY PUBLISHED
          </div>
          <div className="newly-published-row">
            {newlyPublished.map((p) => (
              <NewlyPublishedCard key={p.id} prompt={p} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 56 }}>
        <h2 className="display" style={{ fontSize: 'clamp(26px, 4vw, 42px)', margin: '0 0 18px' }}>
          Find the exact prompt. Copy it. Run it.
        </h2>
        <div className="search-hero" style={{ maxWidth: 560 }}>
          <SearchForm />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {SEARCH_SUGGESTIONS.map((term) => (
            <Link
              key={term}
              href={`/search/?q=${encodeURIComponent(term)}`}
              className="mono"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12,
                color: 'var(--fade)',
                textDecoration: 'none',
              }}
            >
              {term}
            </Link>
          ))}
        </div>
      </section>

      <section id="subjects" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
          BROWSE BY SUBJECT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {subjectsWithCounts.map((s) => (
            <Link
              key={s.id}
              href={`/${s.slug}/`}
              style={{
                display: 'block',
                padding: '16px 18px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--ink-panel)',
                textDecoration: 'none',
                color: 'var(--paper)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--fade)' }}>
                {s.promptCount} prompt{s.promptCount === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
          BROWSE BY ART STYLE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {artStyles.map((style) => (
            <Link
              key={style.id}
              href={`/style/${style.slug}/`}
              className="mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                border: '1px solid var(--border)',
                borderRadius: 999,
                textDecoration: 'none',
                color: 'var(--paper)',
                fontSize: 12.5,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: style.colorHex ?? 'var(--steel)',
                  flexShrink: 0,
                }}
              />
              {style.name}
            </Link>
          ))}
        </div>
      </section>

      {adsEnabled && <LeaderboardAdSlot code={adSettings.leaderboardCode} />}

      {trending.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
            TRENDING THIS WEEK
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {trending.map(({ prompt, saveCount }) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                saveCount={saveCount}
                showChainBadge={Boolean(prompt.contentTypeUsesSteps)}
              />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 16 }}>
          HOW IT WORKS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div key={step.title}>
              <div className="mono" style={{ color: 'var(--amber)', fontSize: 20, marginBottom: 8 }}>
                {i + 1}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{step.title}</div>
              <p style={{ color: 'var(--fade)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {tools.length > 0 && (
        <section>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 12 }}>
            PROMPTS TESTED ACROSS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tools.map((t) => (
              <span
                key={t.id}
                className="mono"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 12,
                  color: 'var(--fade)',
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
