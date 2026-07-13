import Link from 'next/link'
import { JsonLd } from './JsonLd'

type Crumb = { label: string; href: string }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: `https://thepromptgalaxy.com${crumb.href}`,
    })),
  }

  return (
    <nav className="mono" style={{ fontSize: 11, color: 'var(--fade)', display: 'flex', gap: 6 }}>
      <JsonLd data={schema} />
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} style={{ display: 'flex', gap: 6 }}>
          {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
          {i === crumbs.length - 1 ? (
            <span>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} style={{ color: 'var(--fade)', textDecoration: 'none' }}>
              {i === 0 ? `← ${crumb.label.toUpperCase()}` : crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
