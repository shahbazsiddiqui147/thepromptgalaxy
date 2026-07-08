import { PromptCard } from './PromptCard'
import { Breadcrumbs } from './Breadcrumbs'
import { JsonLd } from './JsonLd'
import type { Prompt, Subject, ArtStyle } from '@/payload-types'

type Crumb = { label: string; href: string }

export function ArchiveListing({
  title,
  intro,
  prompts,
  crumbs,
  canonicalUrl,
}: {
  title: string
  intro: string
  prompts: Prompt[]
  crumbs: Crumb[]
  canonicalUrl: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: prompts.map((p, i) => {
        const promptSubject = p.subject as Subject
        const promptArtStyle = p.artStyle as ArtStyle
        return {
          '@type': 'ListItem',
          position: i + 1,
          url: `https://thepromptgalaxy.com/${promptSubject.slug}/${promptArtStyle.slug}/${p.slug}/`,
          name: p.title,
        }
      }),
    },
  }

  return (
    <div className="wrap" style={{ padding: '24px 24px 56px' }}>
      <JsonLd data={schema} />
      <Breadcrumbs crumbs={crumbs} />
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)', margin: '12px 0' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--fade)', fontSize: 15, maxWidth: 620, marginBottom: 24 }}>{intro}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {prompts.map((p) => (
          <PromptCard key={p.id} prompt={p} />
        ))}
        {prompts.length === 0 && (
          <p style={{ color: 'var(--fade)', gridColumn: '1/-1' }}>No prompts here yet.</p>
        )}
      </div>
    </div>
  )
}
