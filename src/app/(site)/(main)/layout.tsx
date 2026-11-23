import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getLibraryStats } from '@/lib/queries'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const stats = await getLibraryStats()

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter promptCount={stats.promptCount} subjectCount={stats.subjectCount} toolCount={stats.toolCount} />
    </>
  )
}
