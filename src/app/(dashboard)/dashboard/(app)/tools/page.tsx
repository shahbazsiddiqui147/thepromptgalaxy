import type { Metadata } from 'next'
import { TaxonomyList } from '@/components/dashboard/TaxonomyScreens'

export const metadata: Metadata = { title: 'Tools' }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TaxonomyList kind="tools" searchParams={searchParams} />
}
