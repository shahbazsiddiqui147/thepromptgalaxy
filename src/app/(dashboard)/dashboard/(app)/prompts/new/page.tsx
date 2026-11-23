import type { Metadata } from 'next'
import { dashboardContext, clientUploadsEnabled } from '@/lib/dashboard/http'
import { PromptEditor, type PromptEditorInitial } from '@/components/dashboard/PromptEditor'
import type { ArtStyle, ContentType, Subject, Tool, User } from '@/payload-types'

export const metadata: Metadata = { title: 'New prompt' }

const empty: PromptEditorInitial = {
  title: '',
  blurb: '',
  slug: null,
  status: 'draft',
  subject: null,
  artStyle: null,
  contentType: null,
  tools: [],
  cover: null,
  referenceRequired: false,
  referenceNote: '',
  promptText: '',
  steps: [],
  examples: [],
  quickAnswer: '',
  articleHeading: '',
  articleHtml: '',
  articleBody: null,
  faqs: [],
  similar: [],
  metaTitle: '',
  metaDescription: '',
  verifiedBy: null,
  lastVerified: null,
}

export default async function NewPromptPage() {
  const { payload, user } = await dashboardContext()
  const access = { user, overrideAccess: false as const }
  const [subjects, artStyles, tools, contentTypes, users] = await Promise.all([
    payload.find({ collection: 'subjects', limit: 300, depth: 0, sort: 'sortOrder', select: { name: true, slug: true, colorHex: true }, ...access }),
    payload.find({ collection: 'art-styles', limit: 300, depth: 0, sort: 'sortOrder', select: { name: true, slug: true, colorHex: true }, ...access }),
    payload.find({ collection: 'tools', limit: 300, depth: 0, sort: 'sortOrder', select: { name: true, vendor: true }, ...access }),
    payload.find({ collection: 'content-types', limit: 100, depth: 0, sort: 'sortOrder', select: { name: true, usesSteps: true }, ...access }),
    payload.find({ collection: 'users', limit: 100, depth: 0, sort: 'email', select: { email: true, name: true }, ...access }),
  ])

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Prompts</p>
          <h1>New prompt</h1>
          <p className="dash-lead">Title, blurb, subject, art style, content type, and one tool are required before a draft can be stored.</p>
        </div>
      </header>
      <PromptEditor
        initial={empty}
        clientUploads={clientUploadsEnabled()}
        subjects={subjects.docs.map((item) => ({ id: item.id, label: (item as Subject).name, slug: (item as Subject).slug, color: (item as Subject).colorHex }))}
        artStyles={artStyles.docs.map((item) => ({ id: item.id, label: (item as ArtStyle).name, slug: (item as ArtStyle).slug, color: (item as ArtStyle).colorHex }))}
        tools={tools.docs.map((item) => ({ id: item.id, label: (item as Tool).vendor ? `${(item as Tool).name} · ${(item as Tool).vendor}` : (item as Tool).name }))}
        contentTypes={contentTypes.docs.map((item) => ({ id: item.id, label: (item as ContentType).name, usesSteps: Boolean((item as ContentType).usesSteps) }))}
        verifiers={users.docs.map((item) => ({ id: item.id, label: (item as User).name || (item as User).email }))}
      />
    </>
  )
}
