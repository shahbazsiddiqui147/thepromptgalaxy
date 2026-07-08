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
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)' }}>Tools</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {tools.map((t) => (
          <Link
            key={t.id}
            href={`/tool/${t.slug}/`}
            className="mono"
            style={{ padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--paper)', textDecoration: 'none', fontSize: 13 }}
          >
            {t.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
