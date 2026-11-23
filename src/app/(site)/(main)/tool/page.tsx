import Link from 'next/link'
import type { Metadata } from 'next'
import { getTools } from '@/lib/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Browse every AI image-generation tool covered in The Prompt Galaxy, and every prompt tested with it.',
  alternates: { canonical: 'https://thepromptgalaxy.com/tool/' },
}

export default async function ToolHubPage() {
  const tools = await getTools()

  return (
    <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 56 }}>
      <span className="kicker">By tool</span>
      <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '-0.03em', margin: '8px 0 20px' }}>Tools</h1>
      <div style={{ borderTop: '2px solid var(--color-text)' }}>
        {tools.length === 0 && <p className="empty-state">No tools published yet.</p>}
        {tools.map((tool, index) => (
          <Link key={tool.id} href={`/tool/${tool.slug}/`} className="door-row" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent)' }}>{String(index + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{tool.name}</span>
            <span />
            <span>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
