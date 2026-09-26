import type { Metadata } from 'next'
import { archivo } from './fonts'
import '@/styles/modernist.css'
import '@/styles/admin.css'
import '@/styles/site.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'https://thepromptgalaxy.com'),
  title: 'ThePromptGalaxy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  )
}
