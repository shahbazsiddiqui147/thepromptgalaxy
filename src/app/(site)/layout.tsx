import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { anton, archivo, jetbrainsMono } from './fonts'
import { SearchForm } from '@/components/SearchForm'
import { getCurrentCustomer } from '@/lib/customerAuth'
import { getSiteSettings } from '@/lib/queries'
import type { Media } from '@/payload-types'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings()
  const favicon = typeof siteSettings.favicon === 'object' ? (siteSettings.favicon as Media | null) : null
  const faviconUrl = favicon?.url

  return {
    title: {
      default: 'The Prompt Galaxy',
      template: '%s — The Prompt Galaxy',
    },
    description: 'Every look, every tool, charted in one place.',
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
  }
}

const navLinks = [
  // No dedicated "all subjects" page exists yet -- subjects are browsable via
  // the homepage's "Browse by Subject" section, so this jumps straight there.
  { href: '/#subjects', label: 'Subject' },
  { href: '/style/', label: 'Styles' },
  { href: '/tool/', label: 'Tools' },
  { href: '/chains/', label: 'Chains' },
  { href: '/browse/', label: 'Browse' },
]

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCurrentCustomer()
  const siteSettings = await getSiteSettings()
  const logo = typeof siteSettings.logo === 'object' ? (siteSettings.logo as Media | null) : null
  const logoUrl = logo?.url

  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="constellation" />
        <header
          className="wrap"
          style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <Link href="/" style={{ color: 'var(--paper)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            {logoUrl ? (
              <Image src={logoUrl} alt={logo?.alt || 'The Prompt Galaxy'} width={160} height={32} style={{ height: 32, width: 'auto' }} priority />
            ) : (
              <span className="display">THE PROMPT GALAXY</span>
            )}
          </Link>
          <nav style={{ display: 'flex', gap: 20 }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mono"
                style={{ color: 'var(--paper)', textDecoration: 'none', fontSize: 13 }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SearchForm />
            <Link
              href={customer ? '/account' : '/login'}
              className="mono"
              style={{
                background: 'var(--amber)',
                color: 'var(--ink)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: 2,
              }}
            >
              {customer ? 'Account' : 'Sign In'}
            </Link>
          </div>
        </header>
        <main>{children}</main>
        <div className="constellation" />
        <footer
          className="wrap"
          style={{
            padding: '20px 24px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p className="mono" style={{ color: 'var(--fade)', fontSize: 11, margin: 0 }}>
            &copy; {new Date().getFullYear()} The Prompt Galaxy
          </p>
          <Link
            href="/admin/login/"
            className="mono"
            style={{ color: 'var(--fade)', fontSize: 11, textDecoration: 'none' }}
          >
            Admin
          </Link>
        </footer>
      </body>
    </html>
  )
}
