import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPromptBySlug, getAdSettings, getSavedCount } from '@/lib/queries'
import { QuickAnswer } from '@/components/QuickAnswer'
import { CopyBox } from '@/components/CopyBox'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SaveButton } from '@/components/SaveButton'
import { AdSlot } from '@/components/AdSlot'
import { ExampleResultGallery } from '@/components/ExampleResultGallery'
import type { Subject, ArtStyle, Tool, Media, Prompt } from '@/payload-types'

export const revalidate = 3600
export const dynamicParams = true

// Small labeled wrapper matching this page's existing section-label
// convention (e.g. "TESTED ON" / "PROMPT"). Renders nothing when the slot
// has no embed code, so a disabled/empty slot never shows an empty box.
function AdSlotSection({ label, code }: { label: string; code?: string | null }) {
  if (!code || !code.trim()) return null
  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <div
        className="mono"
        style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}
      >
        {label}
      </div>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '10px 14px',
          background: 'var(--ink-panel)',
        }}
      >
        <AdSlot html={code} />
      </div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string; style: string; prompt: string }>
}): Promise<Metadata> {
  const { subject: subjectSlug, style: styleSlug, prompt: promptSlug } = await params
  const prompt = await getPromptBySlug(promptSlug)
  if (!prompt) return {}

  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  if (subject.slug !== subjectSlug || artStyle.slug !== styleSlug) return {}

  const canonicalUrl = `https://thepromptgalaxy.com/${subject.slug}/${artStyle.slug}/${prompt.slug}/`

  return {
    title: prompt.seo?.metaTitle || prompt.title,
    description: prompt.seo?.metaDescription || prompt.quickAnswer || prompt.blurb,
    alternates: { canonical: canonicalUrl },
  }
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ subject: string; style: string; prompt: string }>
}) {
  const { subject: subjectSlug, style: styleSlug, prompt: promptSlug } = await params
  const prompt = await getPromptBySlug(promptSlug)
  if (!prompt) notFound()

  // Plain Local API read, no cookies()/headers() involved -- doesn't affect
  // this page's ISR (`revalidate = 3600` above stays in effect).
  const adSettings = await getAdSettings()
  const adsEnabled = Boolean(adSettings.enabled)
  const savedCount = await getSavedCount(prompt.id)

  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const toolEntries = prompt.tools as { tool: Tool | number; fit: 'great' | 'good'; id?: string | null }[]

  // The URL's subject/style segments must match the prompt's actual taxonomy —
  // otherwise this is a stale/incorrect link, not a valid alternate path.
  if (subject.slug !== subjectSlug || artStyle.slug !== styleSlug) notFound()

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      {adsEnabled && <AdSlotSection label="AD SLOT" code={adSettings.leaderboardCode} />}

      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: subject.name, href: `/${subject.slug}/` },
          { label: artStyle.name, href: `/${subject.slug}/${artStyle.slug}/` },
          { label: prompt.title, href: `/${subject.slug}/${artStyle.slug}/${prompt.slug}/` },
        ]}
      />

      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)', margin: '12px 0' }}>
        {prompt.title}
      </h1>
      <p style={{ color: 'var(--fade)', fontSize: 15, maxWidth: 620, marginBottom: 16 }}>
        {prompt.blurb}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <span className="mono" style={{ background: 'var(--amber)', color: 'var(--ink)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {subject.name}
        </span>
        <span className="mono" style={{ background: 'var(--steel)', color: 'var(--paper)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {artStyle.name}
        </span>
        <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--rust)', color: 'var(--paper)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {prompt.contentTypeUsesSteps ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          )}
          {prompt.contentTypeUsesSteps ? 'Chain' : 'Single-frame'}
        </span>
        {prompt.referenceRequired && (
          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--amber)', color: 'var(--amber)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            Reference image required{prompt.referenceNote ? ` — ${prompt.referenceNote}` : ''}
          </span>
        )}
      </div>

      {prompt.verification?.lastVerified && (
        <p className="mono" style={{ color: 'var(--fade)', fontSize: 11, marginTop: -8, marginBottom: 16 }}>
          {(() => {
            const verifier = prompt.verification.verifiedBy
            const verifierName = typeof verifier === 'object' && verifier !== null ? verifier.name : undefined
            const formattedDate = new Date(prompt.verification.lastVerified).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
            return verifierName
              ? `Reviewed by ${verifierName} · Last updated ${formattedDate}`
              : `Last updated ${formattedDate}`
          })()}
        </p>
      )}

      {prompt.quickAnswer && <QuickAnswer text={prompt.quickAnswer} />}

      {(() => {
        const galleryResults = prompt.contentTypeUsesSteps
          ? (() => {
              const first = prompt.steps?.[0]?.exampleResult
              const image = typeof first === 'object' ? (first as Media | null) : null
              const imageUrl = image?.sizes?.card?.url || image?.url
              return imageUrl ? [{ imageUrl, alt: image?.alt || prompt.title, note: null }] : []
            })()
          : (prompt.exampleResults ?? []).flatMap((result) => {
              const image = typeof result.image === 'object' ? (result.image as Media | null) : null
              const imageUrl = image?.sizes?.card?.url || image?.url
              return imageUrl ? [{ imageUrl, alt: image?.alt || prompt.title, note: result.note }] : []
            })
        return (
          <ExampleResultGallery
            referenceRequired={Boolean(prompt.referenceRequired)}
            results={galleryResults}
            promptTitle={prompt.title}
          />
        )
      })()}

      <div className="prompt-layout" style={{ marginTop: 24 }}>
        <div>
          {prompt.contentTypeUsesSteps ? (
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 6 }}>
                CHAIN STEPS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(prompt.steps ?? []).map((step, i) => (
                  <div key={`${step.label}-${i}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span
                        className="mono"
                        style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--rust)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                      >
                        {i + 1}
                      </span>
                      <span className="mono" style={{ fontSize: 11 }}>{step.label.toUpperCase()}</span>
                      <span style={{ color: 'var(--fade)', fontSize: 12.5 }}>{step.note}</span>
                    </div>
                    <CopyBox text={step.promptText} />
                    {(() => {
                      const stepImage = typeof step.exampleResult === 'object' ? (step.exampleResult as Media | null) : null
                      const stepImageUrl = stepImage?.sizes?.card?.url || stepImage?.url
                      if (!stepImageUrl) return null
                      return (
                        <div
                          style={{
                            position: 'relative',
                            width: 160,
                            height: 160,
                            borderRadius: 4,
                            overflow: 'hidden',
                            marginTop: 10,
                            background: 'var(--ink-panel)',
                          }}
                        >
                          <Image
                            src={stepImageUrl}
                            alt={stepImage?.alt || step.label}
                            fill
                            sizes="160px"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
                PROMPT
              </div>
              {prompt.promptText && <CopyBox text={prompt.promptText} />}
            </div>
          )}

          {adsEnabled && <AdSlotSection label="AD SLOT" code={adSettings.inContentCode} />}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <SaveButton promptId={prompt.id} />
          </div>
          {savedCount > 0 && (
            <p className="mono" style={{ color: 'var(--fade)', fontSize: 11, marginTop: -10, marginBottom: 16 }}>
              {savedCount} {savedCount === 1 ? 'person' : 'people'} saved this
            </p>
          )}

          {adsEnabled && <AdSlotSection label="AD SLOT" code={adSettings.sidebarCode} />}

          {(() => {
            const similar = (prompt.similarPrompts ?? []).filter(
              (p): p is Prompt => typeof p === 'object' && p !== null && p._status === 'published',
            )
            if (similar.length === 0) return null
            return (
              <div style={{ marginTop: 24 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
                  SIMILAR PROMPTS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {similar.map((p) => {
                    const pSubject = p.subject as Subject
                    const pStyle = p.artStyle as ArtStyle
                    return (
                      <Link
                        key={p.id}
                        href={`/${pSubject.slug}/${pStyle.slug}/${p.slug}/`}
                        style={{
                          display: 'block',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          padding: '10px 14px',
                          fontSize: 13,
                          color: 'var(--paper)',
                          textDecoration: 'none',
                        }}
                      >
                        {p.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
          TESTED ON
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toolEntries.map((entry, i) => {
            const tool = typeof entry.tool === 'object' ? entry.tool : undefined
            if (!tool) return null
            return (
              <div
                key={entry.id ?? tool.id ?? i}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink-panel)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 14px' }}
              >
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{tool.name}</span>
                <span
                  className="mono"
                  style={{ border: '1px solid var(--sage)', color: 'var(--sage)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}
                >
                  {entry.fit === 'great' ? 'Great Fit' : 'Good Fit'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {prompt.article?.heading && (
        <div style={{ marginTop: 40, maxWidth: 620 }}>
          <h2 className="display" style={{ fontSize: 28 }}>{prompt.article.heading}</h2>
          {prompt.article.body && (
            <div style={{ color: '#B8BEDA', fontSize: 14.5, lineHeight: 1.7 }}>
              <RichText data={prompt.article.body} />
            </div>
          )}
        </div>
      )}

      {(prompt.faqs ?? []).length > 0 && (
        <FaqAccordion
          faqs={(prompt.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer }))}
        />
      )}
    </div>
  )
}
