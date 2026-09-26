import type { Metadata } from 'next'
import Link from 'next/link'
import { PromptCard } from '@/components/site/PromptCard'
import { getPool } from '@/db/pool'
import { getHome } from '@/site/hubs'
import { HomeDoors } from './HomeDoors'

export async function generateMetadata(): Promise<Metadata> {
  const { totals } = await getHome(getPool())
  return {
    title: 'ThePromptGalaxy – tested AI prompts',
    description: `${totals.prompts} tested prompts across ${totals.tools} AI tools and ${totals.categories} categories. Every prompt shows a real example before you copy it.`,
    alternates: { canonical: '/' },
  }
}

const STEPS = [
  { n: '01', title: 'Pick a category or tool', body: 'Start from what you are making, or the tool you already use.' },
  { n: '02', title: 'Copy a tested prompt', body: 'Every prompt shows a real example output before you copy it.' },
  { n: '03', title: 'Save what works', body: 'Save prompts to come back to, or submit your own once you have tested it.' },
]

export default async function HomePage() {
  const home = await getHome(getPool())
  return (
    <>
      <HomeDoors total={home.totals.prompts} categories={home.categories} tools={home.tools} pairCounts={home.pairCounts} />

      {home.styles.length > 0 ? (
        <>
          <div className="section-head">
            <h3>Art styles</h3>
          </div>
          <p style={{ margin: '0 0 16px', padding: '0 32px', fontSize: 14, maxWidth: 700 }}>
            Styles are a third filter. They apply within image categories, so pick a category to see the ones that fit it.
          </p>
          <div className="chips">
            {home.styles.map((s) => (
              <Link key={s.slug} href={`/style/${s.slug}/`} className="tag tag-neutral" style={{ textDecoration: 'none' }}>
                {s.name}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {home.mostSaved.length > 0 ? (
        <>
          <div className="section-head">
            <h3>Most saved</h3>
          </div>
          <div className="grid-cards">
            {home.mostSaved.map((card) => (
              <PromptCard key={card.id} card={card} />
            ))}
          </div>
        </>
      ) : null}

      <div className="steps3">
        {STEPS.map((s) => (
          <div key={s.n}>
            <span className="n">{s.n}</span>
            <span className="t">{s.title}</span>
            <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{s.body}</span>
          </div>
        ))}
      </div>

      <div className="banner-red">
        <div>
          <h2>Unlock every premium prompt.</h2>
          <p style={{ margin: 0, fontSize: 15, maxWidth: 480 }}>One subscription covers every tool and every chain, with no per-prompt paywalls.</p>
        </div>
        <Link href="/premium/" className="btn">
          Go Premium <span style={{ marginLeft: 8 }}>→</span>
        </Link>
      </div>
    </>
  )
}
