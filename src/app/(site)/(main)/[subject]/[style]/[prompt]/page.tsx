import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { AdSlot } from '@/components/AdSlot'
import { FaqAccordion } from '@/components/FaqAccordion'
import { PromptCard } from '@/components/PromptCard'
import { QuickAnswer } from '@/components/QuickAnswer'
import { SaveButton } from '@/components/SaveButton'
import { CopyTextButton } from '@/components/site/CopyTextButton'
import { mediaSizeUrl } from '@/lib/mediaUrl'
import { promptCopyText, toPromptCard } from '@/lib/promptView'
import { getAdSettings, getPromptBySlug, getPromptsBySubject, getSavedCount } from '@/lib/queries'
import type { ArtStyle, Media, Prompt, Subject, Tool } from '@/payload-types'

export const revalidate = 3600
export const dynamicParams = true

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

  return {
    title: prompt.seo?.metaTitle || prompt.title,
    description: prompt.seo?.metaDescription || prompt.quickAnswer || prompt.blurb,
    alternates: { canonical: `https://thepromptgalaxy.com/${subject.slug}/${artStyle.slug}/${prompt.slug}/` },
  }
}

function imageOf(value: unknown, title: string): { url: string; alt: string } | null {
  const media = value && typeof value === 'object' ? (value as Media) : null
  const url = mediaSizeUrl(media, 'card')
  if (!url) return null
  return { url, alt: media?.alt || title }
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ subject: string; style: string; prompt: string }>
}) {
  const { subject: subjectSlug, style: styleSlug, prompt: promptSlug } = await params
  const prompt = await getPromptBySlug(promptSlug)
  if (!prompt) notFound()

  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  if (!subject?.slug || !artStyle?.slug || subject.slug !== subjectSlug || artStyle.slug !== styleSlug) notFound()

  const [adSettings, savedCount, siblings] = await Promise.all([
    getAdSettings(),
    getSavedCount(prompt.id),
    getPromptsBySubject(subject.id),
  ])
  const adsEnabled = Boolean(adSettings.enabled)
  const toolEntries = (prompt.tools ?? []) as { tool: Tool | number; fit: 'great' | 'good' }[]
  const tools = toolEntries.flatMap((entry) => (typeof entry.tool === 'object' && entry.tool ? [{ ...entry.tool, fit: entry.fit }] : []))
  const primaryTool = tools[0]
  const steps = prompt.steps ?? []
  const chain = Boolean(prompt.contentTypeUsesSteps)
  const copyText = promptCopyText(prompt)
  const example =
    (chain ? imageOf(steps[0]?.exampleResult, prompt.title) : imageOf(prompt.exampleResults?.[0]?.image, prompt.title)) ??
    imageOf(prompt.coverImage, prompt.title)

  const similar = (prompt.similarPrompts ?? []).filter(
    (item): item is Prompt => typeof item === 'object' && item !== null && item._status === 'published' && item.id !== prompt.id,
  )
  const relatedSource = similar.length > 0 ? similar : siblings.filter((item) => item.id !== prompt.id)
  const related = relatedSource
    .flatMap((item) => {
      const card = toPromptCard(item, 0, 'style')
      return card ? [card] : []
    })
    .slice(0, 4)

  const verifier = prompt.verification?.verifiedBy
  const verifierName = typeof verifier === 'object' && verifier !== null ? verifier.name : undefined
  const verifiedOn = prompt.verification?.lastVerified
    ? new Date(prompt.verification.lastVerified).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <>
      {adsEnabled && adSettings.leaderboardCode?.trim() && (
        <div className="page-pad" style={{ paddingTop: 16 }}>
          <AdSlot html={adSettings.leaderboardCode} />
        </div>
      )}

      <div className="crumb-bar">
        <Link href={`/${subject.slug}/`}>{subject.name}</Link>
        {' / '}
        {primaryTool?.slug ? <Link href={`/tool/${primaryTool.slug}/`}>{primaryTool.name}</Link> : <Link href={`/${subject.slug}/${artStyle.slug}/`}>{artStyle.name}</Link>}
        {' / '}
        {prompt.title}
      </div>

      <div className="detail-split">
        <div className="example-panel">
          {example && (
            <Image src={example.url} alt={example.alt} fill sizes="(max-width: 1100px) 100vw, 60vw" className="grayscale" style={{ objectFit: 'cover' }} />
          )}
          <span style={{ position: 'relative', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-200)' }}>
            Example output
          </span>
        </div>

        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chain && (
              <span className="badge" style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}>
                CHAIN{steps.length > 0 ? ` · ${steps.length} STEPS` : ''}
              </span>
            )}
            <span className="badge" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-divider)' }}>
              FREE
            </span>
          </div>

          <h1 style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}>{prompt.title}</h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--color-neutral-700)' }}>{prompt.blurb}</p>
          {prompt.quickAnswer && <QuickAnswer text={prompt.quickAnswer} />}

          <div style={{ display: 'flex', gap: 16, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              {savedCount.toLocaleString('en-US')} saves
            </span>
            {tools.map((tool) =>
              tool.slug ? (
                <Link key={tool.id} href={`/tool/${tool.slug}/`} className="tag tag-outline" style={{ textDecoration: 'none' }}>
                  {tool.name}
                  {tool.fit === 'great' ? ' · great fit' : ''}
                </Link>
              ) : null,
            )}
            <Link href={`/${subject.slug}/${artStyle.slug}/`} className="tag tag-neutral" style={{ textDecoration: 'none' }}>
              {artStyle.name}
            </Link>
            {prompt.referenceRequired && (
              <span className="tag tag-accent">Reference image{prompt.referenceNote ? ` — ${prompt.referenceNote}` : ''}</span>
            )}
          </div>

          <div style={{ borderTop: '2px solid var(--color-text)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {chain ? (
              steps.length === 0 ? (
                <p className="empty-state">This chain has no steps yet.</p>
              ) : (
                steps.map((step, index) => (
                  <div key={`${step.label}-${index}`} style={{ background: 'var(--color-surface)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-accent-700)' }}>
                      Step {index + 1} of {steps.length}
                      {step.label ? ` — ${step.label}` : ''}
                    </span>
                    <p style={{ margin: 0, fontSize: 14, fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}>{step.promptText}</p>
                    {step.note && <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)' }}>{step.note}</p>}
                  </div>
                ))
              )
            ) : (
              <div style={{ background: 'var(--color-surface)', padding: 16 }}>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-accent-700)' }}>Prompt</span>
                <p style={{ margin: '8px 0 0', fontSize: 14, fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}>
                  {prompt.promptText || 'No prompt text published yet.'}
                </p>
              </div>
            )}
          </div>

          <CopyTextButton text={copyText} label={chain ? 'Copy full chain' : 'Copy prompt'} />
          <SaveButton promptId={prompt.id} />
          {verifiedOn && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)' }}>
              {verifierName ? `Reviewed by ${verifierName} · ` : ''}Last updated {verifiedOn}
            </p>
          )}
          {adsEnabled && adSettings.sidebarCode?.trim() && <AdSlot html={adSettings.sidebarCode} />}
        </div>
      </div>

      {adsEnabled && adSettings.inContentCode?.trim() && (
        <div className="page-pad" style={{ paddingTop: 24 }}>
          <AdSlot html={adSettings.inContentCode} />
        </div>
      )}

      <div className="page-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 28, paddingBottom: 16, borderTop: '2px solid var(--color-text)' }}>
        <h3 style={{ margin: 0 }}>
          More {subject.name} prompts{primaryTool ? ` on ${primaryTool.name}` : ''}
        </h3>
        <Link href={primaryTool?.slug ? `/tool/${primaryTool.slug}/?subject=${subject.slug}` : `/${subject.slug}/`} style={{ fontSize: 14, fontWeight: 600 }}>
          See all →
        </Link>
      </div>
      <div className="card-grid page-pad" style={{ paddingBottom: 40 }}>
        {related.length === 0 ? (
          <p className="empty-state">No related prompts published yet.</p>
        ) : (
          related.map((card) => <PromptCard key={card.id} card={card} />)
        )}
      </div>

      {prompt.article?.heading && (
        <div className="page-pad" style={{ paddingBottom: 32, maxWidth: 760 }}>
          <h2 style={{ fontSize: 28 }}>{prompt.article.heading}</h2>
          {prompt.article.body && <RichText data={prompt.article.body} />}
        </div>
      )}

      {(prompt.faqs ?? []).length > 0 && (
        <div className="page-pad" style={{ paddingBottom: 40 }}>
          <FaqAccordion faqs={(prompt.faqs ?? []).map((faq) => ({ question: faq.question, answer: faq.answer }))} />
        </div>
      )}
    </>
  )
}
