import type { Metadata } from 'next'
import Link from 'next/link'
import { getLibraryStats } from '@/lib/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'About',
  description: 'The Prompt Galaxy is a library of prompts that have actually been tested.',
  alternates: { canonical: 'https://thepromptgalaxy.com/about/' },
}

export default async function AboutPage() {
  const stats = await getLibraryStats()
  const promptLabel = stats.promptCount.toLocaleString('en-US')
  const figures = [
    { n: promptLabel, label: 'tested prompts' },
    { n: String(stats.toolCount), label: 'tools covered' },
    { n: String(stats.subjectCount), label: 'categories' },
  ]
  const principles = [
    { title: 'Tested, not guessed', body: 'Every prompt ships with a real example output from the tool it names.' },
    { title: 'Free and premium', body: 'Published prompts are free to copy. Premium is not open yet.' },
    { title: 'Open to submissions', body: 'Anyone can submit a tested prompt for review.' },
  ]

  return (
    <>
      <div className="page-pad" style={{ paddingTop: 56, paddingBottom: 40, borderBottom: '2px solid var(--color-text)', maxWidth: 820 }}>
        <span className="kicker">About</span>
        <h1 style={{ fontSize: 56, letterSpacing: '-0.03em', margin: '12px 0 16px' }}>A library of prompts that have actually been tested.</h1>
        <p style={{ margin: 0, fontSize: 16, color: 'var(--color-neutral-700)' }}>
          ThePromptGalaxy collects prompts across {stats.toolCount} AI tools and {stats.subjectCount} categories, each one run and checked before it&apos;s published. We started because most prompt lists online are untested guesses. Ours aren&apos;t.
        </p>
      </div>

      <div className="stats-grid">
        {figures.map((figure) => (
          <div key={figure.label} style={{ padding: 32, borderRight: '2px solid var(--color-divider)', borderBottom: '2px solid var(--color-text)' }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' }}>{figure.n}</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{figure.label}</div>
          </div>
        ))}
      </div>

      <div className="steps-grid" style={{ padding: '48px 32px', borderBottom: '2px solid var(--color-text)' }}>
        {principles.map((principle) => (
          <div key={principle.title} style={{ padding: '0 24px', borderLeft: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{principle.title}</span>
            <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{principle.body}</span>
          </div>
        ))}
      </div>

      <div className="banner">
        <div>
          <h2 style={{ fontSize: 32, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Tested a prompt worth sharing?</h2>
          <p style={{ margin: 0, fontSize: 15 }}>Submit it and we&apos;ll review within 48 hours.</p>
        </div>
        <Link href="/submit/" className="btn" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 15, padding: '14px 20px' }}>
          Submit a prompt
          <span style={{ marginLeft: 8 }}>→</span>
        </Link>
      </div>
    </>
  )
}
