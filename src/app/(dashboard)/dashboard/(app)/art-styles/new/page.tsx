import type { Metadata } from 'next'
import { TaxonomyEditor } from '@/components/dashboard/TaxonomyScreens'

export const metadata: Metadata = { title: 'New art style' }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TaxonomyEditor kind="art-styles" searchParams={searchParams} />
}
