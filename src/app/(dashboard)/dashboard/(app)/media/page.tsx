import type { Metadata } from 'next'
import Link from 'next/link'
import { deleteMedia, updateMediaAlt } from '@/lib/dashboard/actions/records'
import { toMediaCard } from '@/lib/dashboard/media'
import { clientUploadsEnabled, dashboardContext, formatBytes, formatWhen, one, readPage } from '@/lib/dashboard/http'
import { MediaDropzone } from '@/components/dashboard/MediaDropzone'
import { Pager } from '@/components/dashboard/Pager'
import { ActionForm, ConfirmForm, SavedNote, SubmitButton } from '@/components/dashboard/ui'

export const metadata: Metadata = { title: 'Media' }

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = one(params.q).trim()
  const page = readPage(params.page)
  const { payload, user } = await dashboardContext()
  const result = await payload.find({
    collection: 'media',
    where: q ? { or: [{ alt: { contains: q } }, { filename: { contains: q } }] } : undefined,
    page,
    limit: 24,
    depth: 0,
    sort: '-createdAt',
    select: { alt: true, filename: true, url: true, filesize: true, width: true, height: true, sizes: true, createdAt: true },
    user,
    overrideAccess: false,
  })

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Library</p>
          <h1>Media</h1>
          <p className="dash-lead">Thumbnails, alt text, and uploads. Processing still happens in Payload.</p>
        </div>
      </header>
      <SavedNote deleted={one(params.deleted)} error={one(params.error)} />
      <MediaDropzone clientUploads={clientUploadsEnabled()} />
      <form className="dash-filters" method="get" action="/dashboard/media/">
        <input id="dash-search" className="input" name="q" defaultValue={q} placeholder="Search alt text or filename" aria-label="Search media" />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
        {q ? <Link href="/dashboard/media/">Clear</Link> : null}
      </form>
      <div className="dash-media-grid">
        {result.docs.map((doc) => {
          const item = toMediaCard(doc)
          return (
            <article key={item.id} className="dash-media-card">
              {item.thumb || item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumb || item.url || ''} alt={item.alt} />
              ) : (
                <span className="dash-ph">No preview</span>
              )}
              <strong>{item.filename || 'Untitled'}</strong>
              <p className="dash-hint">
                {formatBytes(item.filesize)}
                {item.width && item.height ? ` · ${item.width}×${item.height}` : ''} · {formatWhen(item.createdAt)}
              </p>
              <ActionForm action={updateMediaAlt}>
                <input type="hidden" name="id" value={item.id} />
                <label className="dash-hint" htmlFor={`alt-${item.id}`}>
                  Alt text
                </label>
                <input id={`alt-${item.id}`} className="input" name="alt" defaultValue={item.alt} required />
                <SubmitButton className="btn btn-secondary" pendingLabel="Saving…">
                  Save alt
                </SubmitButton>
              </ActionForm>
              <ConfirmForm action={deleteMedia} message="Delete this image? Prompts using it will lose the picture." label="Delete" hidden={{ id: String(item.id) }} />
            </article>
          )
        })}
      </div>
      {result.docs.length === 0 ? <p>No images match.</p> : null}
      <Pager page={result.page ?? 1} totalPages={result.totalPages} totalDocs={result.totalDocs} pathname="/dashboard/media/" params={{ q }} />
    </>
  )
}
