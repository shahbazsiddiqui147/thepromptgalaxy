import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPromptBySlug, getAdSettings, getSavedCount } from '@/lib/queries'
import { QuickAnswer } from '@/components/QuickAnswer'
import { CopyBox } from '@/components/CopyBox'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SaveButton } from '@/components/SaveButton'
import { AdSlot } from '@/components/AdSlot'
import type { Subject, ArtStyle, Tool, Media } from '@/payload-types'

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
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: subject.name, href: `/${subject.slug}/` },
          { label: artStyle.name, href: `/${subject.slug}/${artStyle.slug}/` },
          { label: prompt.title, href: `/${subject.slug}/${artStyle.slug}/${prompt.slug}/` },
        ]}
      />

      {adsEnabled && <AdSlotSection label="AD SLOT" code={adSettings.leaderboardCode} />}

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
        <span className="mono" style={{ background: 'var(--rust)', color: 'var(--paper)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
          {prompt.contentTypeUsesSteps ? 'Chain' : 'Single-frame'}
        </span>
        {prompt.referenceRequired && (
          <span className="mono" style={{ border: '1px solid var(--amber)', color: 'var(--amber)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }}>
            Reference image required{prompt.referenceNote ? ` — ${prompt.referenceNote}` : ''}
          </span>
        )}
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SaveButton promptId={prompt.id} />
        {savedCount > 0 && (
          <span className="mono" style={{ color: 'var(--fade)', fontSize: 11 }}>
            {savedCount} {savedCount === 1 ? 'person' : 'people'} saved this
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

      {prompt.referenceRequired && (() => {
        // Purely illustrative -- the site never handles a visitor's uploaded
        // photo. This just shows what a reference-image prompt does: your own
        // photo goes in, a restyled result comes out. Reuse whatever example
        // image is already on the prompt (chain-step or single-frame) as the
        // "result" side; if none exists yet, the box just stays a placeholder.
        const outputImage = prompt.contentTypeUsesSteps
          ? (() => {
              const first = prompt.steps?.[0]?.exampleResult
              return typeof first === 'object' ? (first as Media | null) : null
            })()
          : (() => {
              const first = prompt.exampleResults?.[0]?.image
              return typeof first === 'object' ? (first as Media | null) : null
            })()
        const outputUrl = outputImage?.sizes?.card?.url || outputImage?.url

        return (
          <div style={{ marginTop: 20, marginBottom: 24 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
              REFERENCE → RESULT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 4,
                  border: '1px dashed var(--border)',
                  background: 'var(--ink-panel)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--fade)',
                  flexShrink: 0,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
                </svg>
                <span className="mono" style={{ fontSize: 9.5, textAlign: 'center', padding: '0 8px' }}>
                  your reference photo
                </span>
              </div>
              <span style={{ color: 'var(--fade)', fontSize: 20 }} aria-hidden="true">→</span>
              <div
                style={{
                  width: 160,
                  height: 120,
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'var(--ink-panel)',
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }}
              >
                {outputUrl ? (
                  <Image
                    src={outputUrl}
                    alt={outputImage?.alt || prompt.title}
                    fill
                    sizes="160px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--fade)' }}>example output</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
          {(prompt.exampleResults ?? []).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
                EXAMPLE RESULTS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {(prompt.exampleResults ?? []).map((result, i) => {
                  const image = typeof result.image === 'object' ? (result.image as Media | null) : null
                  const imageUrl = image?.sizes?.card?.url || image?.url
                  if (!imageUrl) return null
                  return (
                    <figure key={i} style={{ margin: 0 }}>
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 4,
                          overflow: 'hidden',
                          background: 'var(--ink-panel)',
                        }}
                      >
                        <Image
                          src={imageUrl}
                          alt={image?.alt || prompt.title}
                          fill
                          sizes="200px"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      {result.note && (
                        <figcaption style={{ fontSize: 11.5, color: 'var(--fade)', marginTop: 6 }}>
                          {result.note}
                        </figcaption>
                      )}
                    </figure>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {adsEnabled && <AdSlotSection label="AD SLOT" code={adSettings.inContentCode} />}

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
                  style={
                    entry.fit === 'great'
                      ? { background: 'var(--amber)', color: 'var(--ink)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }
                      : { border: '1px solid var(--amber)', color: 'var(--amber)', padding: '4px 9px', borderRadius: 2, fontSize: 11 }
                  }
                >
                  {entry.fit === 'great' ? 'Great Fit' : 'Good Fit'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {adsEnabled && <AdSlotSection label="AD SLOT" code={adSettings.sidebarCode} />}

      {prompt.article?.heading && (
        <div style={{ marginTop: 40, maxWidth: 620 }}>
          <h2 className="display" style={{ fontSize: 22 }}>{prompt.article.heading}</h2>
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
