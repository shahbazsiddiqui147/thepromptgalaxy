import type { Metadata } from 'next'
import { archivo } from '../(site)/fonts'
import '../(site)/modernist.css'
import './dashboard.css'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s — Prompt Galaxy',
  },
  robots: { index: false, follow: false },
}

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="dash-body">{children}</body>
    </html>
  )
}
