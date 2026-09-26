import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { PromptCard } from '@/components/site/PromptCard'
import { getPool } from '@/db/pool'
import { listCards } from '@/site/cards'
import { getPublicPrompt, type PublicPrompt } from '@/site/prompt'
import { compactNumber, type Card } from '@/site/types'
import { CopyButton } from './CopyButton'

const load = cache((slug: string) => getPublicPrompt(getPool(), slug))
const SITE = process.env.SITE_URL ?? 'https://thepromptgalaxy.com'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = await load(slug)
  if (!p) return {}
  const image = p.exampleMediaId ? `/media/${p.exampleMediaId}/card/` : undefined
  return {
    title: `${p.seoTitle || p.title} – ThePromptGalaxy`,
    description: p.seoDescription || p.summary || undefined,
    alternates: { canonical: `/prompt/${slug}/` },
    openGraph: { title: p.seoTitle || p.title, description: p.seoDescription || p.summary || undefined, type: 'article', images: image ? [image] : undefined },
  }
}

function jsonLd(p: PublicPrompt) {
  const url = `${SITE}/prompt/${p.slug}/`
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'CreativeWork',
      name: p.title,
      description: p.summary || undefined,
      url,
      image: p.exampleMediaId ? `${SITE}/media/${p.exampleMediaId}/card/` : undefined,
      author: p.author ? { '@type': 'Person', name: p.author } : undefined,
      datePublished: p.publishedAt.toISOString(),
      dateModified: p.updatedAt.toISOString(),
      isAccessibleForFree: !p.isPremium,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: p.category.name, item: `${SITE}/category/${p.category.slug}/` },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    },
  ]
  if (p.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: p.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
}

async function related(p: PublicPrompt): Promise<{ heading: string; cards: Card[] }> {
  if (p.similar.length > 0) return { heading: 'Similar prompts', cards: p.similar.slice(0, 4) }
  const primary = p.tools.find((t) => t.isPrimary) ?? p.tools[0]
  const { cards } = await listCards(getPool(), { categoryId: p.category.id, toolId: primary?.id, limit: 5, offset: 0 })
  const others = cards.filter((c) => c.id !== p.id).slice(0, 4)
  return { heading: primary ? `More ${p.category.name} prompts on ${primary.name}` : `More ${p.category.name} prompts`, cards: others }
}

export default async function PromptPage({ params }: Props) {
  const { slug } = await params
  const p = await load(slug)
  if (!p) notFound()
  const primary = p.tools.find((t) => t.isPrimary) ?? p.tools[0]
  const more = await related(p)
  const fullChain = p.isChain && !p.isPremium ? p.steps.map((s) => s.text ?? '').join('\n\n') : ''

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(p) }} />
      <div className="crumbs">
        <Link href={`/category/${p.category.slug}/`}>{p.category.name}</Link>
        {primary ? (
          <>
            {' / '}
            <Link href={`/category/${p.category.slug}/?tool=${primary.slug}`}>{primary.name}</Link>
          </>
        ) : null}
        {' / '}
        {p.title}
      </div>

      <div className="detail">
        <div className="detail-img">
          {p.exampleMediaId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${p.exampleMediaId}/card/`} alt={`Example output: ${p.title}`} />
          ) : null}
        </div>
        <div>
          <div style={{ display: 'flex', gap: 6 }}>
            {p.isChain ? <span className="tag b-chain" style={{ borderRadius: 0 }}>CHAIN · {p.steps.length} STEPS</span> : null}
            {p.isPremium ? <span className="tag b-premium" style={{ borderRadius: 0 }}>PREMIUM</span> : <span className="tag tag-neutral" style={{ borderRadius: 0 }}>FREE</span>}
          </div>
          <h1>{p.title}</h1>
          {p.summary ? <p>{p.summary}</p> : null}
          <div className="detail-meta">
            {p.author ? <span>By <b>@{p.author}</b></span> : null}
            <span>{compactNumber(p.saveCount)} saves</span>
            {p.tools.map((t) => (
              <Link key={t.id} href={`/tool/${t.slug}/`} className="tag tag-outline" style={{ textDecoration: 'none' }}>
                {t.name}
                {t.fit === 'great' ? <span className="fit">Great fit</span> : null}
              </Link>
            ))}
            {p.styles.map((s) => (
              <Link key={s.id} href={`/style/${s.slug}/`} className="tag tag-neutral" style={{ textDecoration: 'none' }}>
                {s.name}
              </Link>
            ))}
          </div>

          {p.referenceRequired ? (
            <p className="tag tag-accent" style={{ marginBottom: 12 }}>
              Needs a reference photo{p.referenceNote ? `: ${p.referenceNote}` : ''}
            </p>
          ) : null}

          {p.isPremium ? (
            <div className="locked">
              <strong>This is a premium prompt.</strong>
              <p style={{ margin: '8px 0 16px' }}>Go Premium to unlock the full prompt{p.isChain ? ' chain' : ''}.</p>
              <Link href="/premium/" className="btn btn-primary">Go Premium</Link>
            </div>
          ) : p.isChain ? (
            <>
              {p.steps.map((s, i) => (
                <div key={i} className="prompt-box">
                  <span className="step-label">Step {i + 1} of {p.steps.length}{s.label ? ` · ${s.label}` : ''}</span>
                  <p>{s.text}</p>
                  <CopyButton text={s.text ?? ''} label={`Copy step ${i + 1}`} />
                  {s.exampleMediaId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${s.exampleMediaId}/card/`} alt={`Result of step ${i + 1}`} />
                  ) : null}
                </div>
              ))}
              <CopyButton text={fullChain} label="Copy full chain" block />
            </>
          ) : (
            <>
              <div className="prompt-box">
                <p>{p.promptText}</p>
              </div>
              <CopyButton text={p.promptText ?? ''} block />
            </>
          )}
        </div>
      </div>

      {p.quickAnswer ? (
        <div className="article">
          <h3>Quick answer</h3>
          <p>{p.quickAnswer}</p>
        </div>
      ) : null}
      {p.articleHtml ? <div className="article" dangerouslySetInnerHTML={{ __html: p.articleHtml }} /> : null}
      {p.faqs.length > 0 ? (
        <div className="faq">
          <h3>Frequently asked questions</h3>
          {p.faqs.map((f, i) => (
            <details key={i}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      ) : null}

      {more.cards.length > 0 ? (
        <>
          <div className="section-head">
            <h3>{more.heading}</h3>
            <Link href={`/category/${p.category.slug}/`}>See all →</Link>
          </div>
          <div className="grid-cards">
            {more.cards.map((card) => (
              <PromptCard key={card.id} card={card} />
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
