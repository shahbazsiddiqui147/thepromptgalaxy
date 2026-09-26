import Link from 'next/link'
import { getPool } from '@/db/pool'
import { getNav } from '@/site/hubs'

export const dynamic = 'force-dynamic'

const SOCIAL = [
  { label: 'X', href: process.env.NEXT_PUBLIC_SOCIAL_X, d: 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z' },
  { label: 'Instagram', href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM, d: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { label: 'YouTube', href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE, d: 'M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17zM10 15l5-3-5-3z' },
].filter((s) => s.href)

function Social() {
  if (SOCIAL.length === 0) return null
  return (
    <div className="social">
      {SOCIAL.map((s) => (
        <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={s.d} />
          </svg>
        </a>
      ))}
    </div>
  )
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNav(getPool())
  return (
    <>
      <header className="nav site-nav">
        <Link href="/" className="site-brand">
          <i />
          ThePromptGalaxy
        </Link>
        <Link href="/#categories" className="nav-link">By category</Link>
        <Link href="/#tools" className="nav-link">By tool</Link>
        <Social />
        <Link href="/premium/" className="btn btn-primary">Go Premium</Link>
      </header>
      <main>{children}</main>
      <footer>
        <div className="site-footer">
          <div className="col">
            <Link href="/" className="site-brand" style={{ fontSize: 16 }}>
              <i style={{ width: 16, height: 16 }} />
              ThePromptGalaxy
            </Link>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)', maxWidth: 260 }}>
              {nav.totals.prompts} tested prompts across {nav.totals.tools} tools and {nav.totals.categories} categories.
            </p>
            <Social />
          </div>
          <div className="col">
            <span className="label">Categories</span>
            {nav.categories.slice(0, 6).map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}/`}>{c.name}</Link>
            ))}
          </div>
          <div className="col">
            <span className="label">Tools</span>
            {nav.tools.slice(0, 6).map((t) => (
              <Link key={t.slug} href={`/tool/${t.slug}/`}>{t.name}</Link>
            ))}
          </div>
          <div className="col">
            <span className="label">Premium</span>
            <Link href="/premium/">Go Premium</Link>
          </div>
        </div>
        <div className="site-copy">© {new Date().getFullYear()} ThePromptGalaxy</div>
      </footer>
    </>
  )
}
