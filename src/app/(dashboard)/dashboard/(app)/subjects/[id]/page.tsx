import type { Metadata } from 'next'
import { TaxonomyEditor } from '@/components/dashboard/TaxonomyScreens'
import { readId } from '@/lib/dashboard/http'

export const metadata: Metadata = { title: 'Edit subject' }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  return <TaxonomyEditor kind="subjects" id={readId(id)} searchParams={searchParams} />
}
