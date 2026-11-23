import { PromptCard } from './PromptCard'
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
      itemListElement: prompts.map((prompt, index) => {
        const promptSubject = prompt.subject as Subject
        const promptArtStyle = prompt.artStyle as ArtStyle
        return {
          '@type': 'ListItem',
          position: index + 1,
          url: `https://thepromptgalaxy.com/${promptSubject.slug}/${promptArtStyle.slug}/${prompt.slug}/`,
          name: prompt.title,
        }
      }),
    },
  }

  return (
    <div className="page-pad" style={{ paddingTop: 40, paddingBottom: 56 }}>
      <JsonLd data={schema} />
      <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginBottom: 12 }}>
        {crumbs.map((crumb, index) => (
          <span key={crumb.href}>
            {index > 0 && ' / '}
            {index === crumbs.length - 1 ? crumb.label : <a href={crumb.href}>{crumb.label}</a>}
          </span>
        ))}
      </div>
      <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', letterSpacing: '-0.03em', margin: '0 0 12px' }}>{title}</h1>
      <p style={{ color: 'var(--color-neutral-700)', fontSize: 15, maxWidth: 640, marginBottom: 24 }}>{intro}</p>
      <div className="card-grid">
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
        {prompts.length === 0 && <p className="empty-state">No prompts here yet.</p>}
      </div>
    </div>
  )
}
