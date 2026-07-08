import type { Metadata } from 'next'
import { getRecentPrompts, getSubjects, getTools } from '@/lib/queries'
import { BrowseClient } from './BrowseClient'

export const revalidate = 3600

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default async function BrowsePage() {
  const [prompts, subjects, tools] = await Promise.all([
    getRecentPrompts(200),
    getSubjects(),
    getTools(),
  ])

  return <BrowseClient prompts={prompts} subjects={subjects} tools={tools} />
}
