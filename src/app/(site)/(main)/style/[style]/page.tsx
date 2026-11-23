import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getArtStyles, getArtStyleBySlug, getPromptsByArtStyle } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export async function generateStaticParams() {
  const styles = await getArtStyles()
  return styles.map((s) => ({ style: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ style: string }>
}): Promise<Metadata> {
  const { style: styleSlug } = await params
  const artStyle = await getArtStyleBySlug(styleSlug)
  if (!artStyle) return {}
  return {
    title: artStyle.name,
    description: `Every prompt tagged with the ${artStyle.name} art style, across all subjects.`,
    alternates: { canonical: `https://thepromptgalaxy.com/style/${artStyle.slug}/` },
  }
}

export default async function StylePage({ params }: { params: Promise<{ style: string }> }) {
  const { style: styleSlug } = await params
  const artStyle = await getArtStyleBySlug(styleSlug)
  if (!artStyle) notFound()

  const prompts = await getPromptsByArtStyle(artStyle.id)

  return (
    <ArchiveListing
      title={artStyle.name}
      intro={`Every prompt tagged with the ${artStyle.name} art style, across all subjects.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: artStyle.name, href: `/style/${artStyle.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/style/${artStyle.slug}/`}
    />
  )
}
