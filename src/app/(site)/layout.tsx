import type { Metadata } from 'next'
import Link from 'next/link'
import { anton, archivo, jetbrainsMono } from './fonts'
import { SearchForm } from '@/components/SearchForm'
import { getCurrentCustomer } from '@/lib/customerAuth'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'The Prompt Galaxy',
    template: '%s — The Prompt Galaxy',
  },
  description: 'Every look, every tool, charted in one place.',
}

const navLinks = [
  { href: '/style/', label: 'Styles' },
  { href: '/tool/', label: 'Tools' },
  { href: '/chains/', label: 'Chains' },
  { href: '/browse/', label: 'Browse' },
]

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCurrentCustomer()

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
          <Link href="/" style={{ color: 'var(--paper)', textDecoration: 'none' }} className="display">
            THE PROMPT GALAXY
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
              style={{ color: 'var(--paper)', textDecoration: 'none', fontSize: 13 }}
            >
              {customer ? 'Account' : 'Log in'}
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
