import type { Metadata } from 'next'
import Link from 'next/link'
import { dashboardContext, one, readPage } from '@/lib/dashboard/http'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { Pager } from '@/components/dashboard/Pager'
import { SavedNote } from '@/components/dashboard/ui'
import type { ArtStyle, ContentType, Media, Prompt, Subject } from '@/payload-types'

export const metadata: Metadata = { title: 'Prompts' }

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = one(params.q).trim()
  const status = one(params.status)
  const subject = one(params.subject)
  const style = one(params.artStyle)
  const page = readPage(params.page)
  const { payload, user } = await dashboardContext()

  const filters = [
    q ? { title: { contains: q } } : null,
    status === 'draft' || status === 'published' ? { _status: { equals: status } } : null,
    /^\d+$/.test(subject) ? { subject: { equals: Number(subject) } } : null,
    /^\d+$/.test(style) ? { artStyle: { equals: Number(style) } } : null,
  ].filter(Boolean)

  const [result, subjects, styles] = await Promise.all([
    payload.find({
      collection: 'prompts',
      where: filters.length ? { and: filters as never } : undefined,
      page,
      limit: 20,
      depth: 1,
      draft: true,
      sort: '-updatedAt',
      select: { title: true, _status: true, updatedAt: true, subject: true, artStyle: true, contentType: true, coverImage: true },
      user,
      overrideAccess: false,
    }),
    payload.find({ collection: 'subjects', limit: 200, depth: 0, sort: 'sortOrder', select: { name: true }, user, overrideAccess: false }),
    payload.find({ collection: 'art-styles', limit: 200, depth: 0, sort: 'sortOrder', select: { name: true }, user, overrideAccess: false }),
  ])

  const preserved = { q, status, subject, artStyle: style }

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Content</p>
          <h1>Prompts</h1>
          <p className="dash-lead">Search, filter, and open the editor. Press / to focus search.</p>
        </div>
        <Link className="btn btn-primary" href="/dashboard/prompts/new/">
          New prompt
        </Link>
      </header>
      <SavedNote saved={one(params.saved)} deleted={one(params.deleted)} error={one(params.error)} />
      <form className="dash-filters" method="get" action="/dashboard/prompts/">
        <input id="dash-search" className="input" name="q" defaultValue={q} placeholder="Search titles" aria-label="Search titles" />
        <select className="input" name="status" defaultValue={status} aria-label="Status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select className="input" name="subject" defaultValue={subject} aria-label="Subject">
          <option value="">Any subject</option>
          {subjects.docs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="input" name="artStyle" defaultValue={style} aria-label="Art style">
          <option value="">Any art style</option>
          {styles.docs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" type="submit">
          Apply
        </button>
        {q || status || subject || style ? <a href="/dashboard/prompts/">Clear</a> : null}
      </form>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Cover</th>
              <th>Title</th>
              <th>Subject</th>
              <th>Style</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {result.docs.length === 0 ? (
              <tr>
                <td colSpan={7}>No prompts match.</td>
              </tr>
            ) : (
              result.docs.map((doc) => {
                const prompt = doc as Prompt
                const cover = typeof prompt.coverImage === 'object' ? (prompt.coverImage as Media) : null
                const thumb = cover?.sizes?.thumbnail?.url || cover?.url
                return (
                  <tr key={prompt.id}>
                    <td data-label="Cover">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="dash-thumb" src={thumb} alt="" />
                      ) : (
                        <span className="dash-thumb" />
                      )}
                    </td>
                    <td data-label="Title">
                      <Link href={`/dashboard/prompts/${prompt.id}/`}>{prompt.title}</Link>
                    </td>
                    <td data-label="Subject">{typeof prompt.subject === 'object' ? (prompt.subject as Subject).name : '—'}</td>
                    <td data-label="Style">{typeof prompt.artStyle === 'object' ? (prompt.artStyle as ArtStyle).name : '—'}</td>
                    <td data-label="Type">{typeof prompt.contentType === 'object' ? (prompt.contentType as ContentType).name : '—'}</td>
                    <td data-label="Status">{prompt._status === 'published' ? 'Published' : 'Draft'}</td>
                    <td data-label="Updated">{formatRelativeTime(prompt.updatedAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <Pager page={result.page ?? 1} totalPages={result.totalPages} totalDocs={result.totalDocs} pathname="/dashboard/prompts/" params={preserved} />
    </>
  )
}
