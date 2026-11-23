import type { Metadata } from 'next'
import { TaxonomyList } from '@/components/dashboard/TaxonomyScreens'

export const metadata: Metadata = { title: 'Content types' }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TaxonomyList kind="content-types" searchParams={searchParams} />
}
