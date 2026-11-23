import type { Metadata } from 'next'
import { SubmitForm } from '@/components/site/SubmitForm'
import { getArtStyles, getSubjects, getTools } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Submit a prompt',
  description: 'Share a prompt you have tested.',
  alternates: { canonical: 'https://thepromptgalaxy.com/submit/' },
}

export const revalidate = 3600

export default async function SubmitPage() {
  const [subjects, tools, styles] = await Promise.all([getSubjects(), getTools(), getArtStyles()])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 32px 80px' }}>
      <span className="kicker">Submit a prompt</span>
      <h1 style={{ fontSize: 48, letterSpacing: '-0.03em', margin: '10px 0 8px' }}>Share a prompt you&apos;ve tested.</h1>
      <p style={{ margin: '0 0 32px', fontSize: 15 }}>Every prompt is reviewed and needs a real example output before it&apos;s published.</p>
      <SubmitForm
        subjects={subjects.flatMap((subject) => (subject.slug ? [{ id: subject.id, name: subject.name, slug: subject.slug }] : []))}
        tools={tools.flatMap((tool) => (tool.slug ? [{ id: tool.id, name: tool.name, slug: tool.slug }] : []))}
        styles={styles.flatMap((style) => (style.slug ? [{ id: style.id, name: style.name, slug: style.slug }] : []))}
      />
    </div>
  )
}
