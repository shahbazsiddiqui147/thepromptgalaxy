import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getSubjectBySlug,
  getArtStyleBySlug,
  getPromptsBySubjectAndStyle,
  MIN_PROMPTS_FOR_COMBO_PAGE,
} from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string; style: string }>
}): Promise<Metadata> {
  const { subject: subjectSlug, style: styleSlug } = await params
  const [subject, artStyle] = await Promise.all([
    getSubjectBySlug(subjectSlug),
    getArtStyleBySlug(styleSlug),
  ])
  if (!subject || !artStyle) return {}

  const prompts = await getPromptsBySubjectAndStyle(subject.id, artStyle.id)
  if (prompts.length < MIN_PROMPTS_FOR_COMBO_PAGE) return {}

  return {
    title: `${artStyle.name} ${subject.name}`,
    description: `${subject.name} prompts in the ${artStyle.name} style.`,
    alternates: { canonical: `https://thepromptgalaxy.com/${subject.slug}/${artStyle.slug}/` },
  }
}

export default async function SubjectStylePage({
  params,
}: {
  params: Promise<{ subject: string; style: string }>
}) {
  const { subject: subjectSlug, style: styleSlug } = await params
  const [subject, artStyle] = await Promise.all([
    getSubjectBySlug(subjectSlug),
    getArtStyleBySlug(styleSlug),
  ])
  if (!subject || !artStyle) notFound()

  const prompts = await getPromptsBySubjectAndStyle(subject.id, artStyle.id)

  // Content-threshold gate: don't serve a thin combination page — see design spec §7.
  if (prompts.length < MIN_PROMPTS_FOR_COMBO_PAGE) notFound()

  return (
    <ArchiveListing
      title={`${artStyle.name} ${subject.name}`}
      intro={`${subject.name} prompts in the ${artStyle.name} style.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: subject.name, href: `/${subject.slug}/` },
        { label: artStyle.name, href: `/${subject.slug}/${artStyle.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/${subject.slug}/${artStyle.slug}/`}
    />
  )
}
