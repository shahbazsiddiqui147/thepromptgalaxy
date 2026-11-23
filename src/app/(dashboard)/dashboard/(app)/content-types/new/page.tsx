import type { Metadata } from 'next'
import { TaxonomyEditor } from '@/components/dashboard/TaxonomyScreens'

export const metadata: Metadata = { title: 'New content type' }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TaxonomyEditor kind="content-types" searchParams={searchParams} />
}
