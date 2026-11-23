import type { Metadata } from 'next'
import { getChainPrompts } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Prompt Chains',
  description: 'Multi-step prompt sequences — each step carries context forward from the last, run in order in the same conversation.',
  alternates: { canonical: 'https://thepromptgalaxy.com/chains/' },
}

export default async function ChainsPage() {
  const prompts = await getChainPrompts()

  return (
    <ArchiveListing
      title="Prompt Chains"
      intro="Multi-step prompt sequences — each step carries context forward from the last, run in order in the same conversation."
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: 'Chains', href: '/chains/' },
      ]}
      canonicalUrl="https://thepromptgalaxy.com/chains/"
    />
  )
}
