import type { Metadata } from 'next'
import { archivo } from './fonts'
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

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  )
}
