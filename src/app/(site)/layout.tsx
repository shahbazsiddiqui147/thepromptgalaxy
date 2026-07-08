import type { Metadata } from 'next'
import Link from 'next/link'
import { anton, archivo, jetbrainsMono } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'The Prompt Galaxy',
    template: '%s — The Prompt Galaxy',
  },
  description: 'Every look, every tool, charted in one place.',
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="constellation" />
        <header className="wrap" style={{ padding: '16px 24px' }}>
          <Link href="/" style={{ color: 'var(--paper)', textDecoration: 'none' }} className="display">
            THE PROMPT GALAXY
          </Link>
        </header>
        <main>{children}</main>
        <div className="constellation" />
        <footer className="wrap" style={{ padding: '20px 24px 40px' }}>
          <p className="mono" style={{ color: 'var(--fade)', fontSize: 11 }}>
            &copy; {new Date().getFullYear()} The Prompt Galaxy
          </p>
        </footer>
      </body>
    </html>
  )
}
