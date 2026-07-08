import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSubjects, getSubjectBySlug, getPromptsBySubject } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export async function generateStaticParams() {
  const subjects = await getSubjects()
  return subjects.map((s) => ({ subject: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string }>
}): Promise<Metadata> {
  const { subject: subjectSlug } = await params
  const subject = await getSubjectBySlug(subjectSlug)
  if (!subject) return {}
  return {
    title: subject.name,
    description: subject.description || `Browse every ${subject.name} prompt in the library.`,
    alternates: { canonical: `https://thepromptgalaxy.com/${subject.slug}/` },
  }
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectSlug } = await params
  const subject = await getSubjectBySlug(subjectSlug)
  if (!subject) notFound()

  const prompts = await getPromptsBySubject(subject.id)

  return (
    <ArchiveListing
      title={subject.name}
      intro={subject.description || `Browse every ${subject.name} prompt in the library.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: subject.name, href: `/${subject.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/${subject.slug}/`}
    />
  )
}
