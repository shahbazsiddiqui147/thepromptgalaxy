import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPromptBySlug } from '@/lib/queries'
import { QuickAnswer } from '@/components/QuickAnswer'
import { CopyBox } from '@/components/CopyBox'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import type { Subject, ArtStyle, Tool } from '@/payload-types'

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

  const canonicalUrl = `https://thepromptgalaxy.com/${subject.slug}/${artStyle.slug}/${prompt.slug}/`

  return {
    title: prompt.title,
    description: prompt.quickAnswer || prompt.blurb,
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

  const subject = prompt.subject as Subject
  const artStyle = prompt.artStyle as ArtStyle
  const tools = prompt.tools as Tool[]

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

      {prompt.quickAnswer && <QuickAnswer text={prompt.quickAnswer} />}

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

      <div style={{ marginTop: 32 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
          TESTED ON
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tools.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--ink-panel)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 14px' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {prompt.article?.heading && (
        <div style={{ marginTop: 40, maxWidth: 620 }}>
          <h2 className="display" style={{ fontSize: 22 }}>{prompt.article.heading}</h2>
          {(prompt.article.paragraphs ?? []).map((p, i) => (
            <p key={i} style={{ color: '#B8BEDA', fontSize: 14.5, lineHeight: 1.7, marginBottom: 14 }}>
              {p.text}
            </p>
          ))}
          {(prompt.article.tips ?? []).length > 0 && (
            <>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', margin: '20px 0 10px' }}>
                TIPS FOR BETTER RESULTS
              </div>
              <ul>
                {(prompt.article.tips ?? []).map((t, i) => (
                  <li key={i} style={{ color: '#B8BEDA', fontSize: 13.5, lineHeight: 1.6, marginBottom: 8 }}>
                    {t.text}
                  </li>
                ))}
              </ul>
            </>
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
