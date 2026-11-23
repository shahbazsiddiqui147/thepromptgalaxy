import type { Metadata } from 'next'
import { TaxonomyList } from '@/components/dashboard/TaxonomyScreens'

export const metadata: Metadata = { title: 'Art styles' }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TaxonomyList kind="art-styles" searchParams={searchParams} />
}
