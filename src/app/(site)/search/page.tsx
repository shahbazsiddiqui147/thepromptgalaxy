import type { Metadata } from 'next'
import { searchPrompts } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const prompts = query ? await searchPrompts(query) : []

  return (
    <ArchiveListing
      title={query ? `Search: "${query}"` : 'Search'}
      intro={query ? `Prompts matching "${query}".` : 'Enter a search term above to find prompts.'}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: 'Search', href: '/search/' },
      ]}
      canonicalUrl="https://thepromptgalaxy.com/search/"
    />
  )
}
