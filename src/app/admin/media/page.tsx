import Link from 'next/link'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { listMedia } from '@/media/storage'
import { deleteMediaAction, updateAltAction } from './actions'

const PAGE_SIZE = 24

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; saved?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { page, error, saved } = await searchParams
  const current = Math.max(1, Number(page) || 1)
  const { rows, total } = await listMedia(getPool(), { limit: PAGE_SIZE, offset: (current - 1) * PAGE_SIZE })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="admin-head">
        <h1>Media</h1>
        <span>{total} image(s). Upload images from the prompt form.</span>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {saved ? <div className="banner">Saved.</div> : null}
      <div className="media-grid">
        {rows.map((row) => (
          <div key={row.id} className="media-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/media/${row.id}/thumb/`} alt={row.alt} width={200} height={140} />
            <div className="field-help">
              {row.width}×{row.height} · {row.usageCount} use(s)
            </div>
            <form action={updateAltAction} className="form-grid">
              <input type="hidden" name="id" value={row.id} />
              <input name="alt" className="input" defaultValue={row.alt} maxLength={200} aria-label="Alt text" />
              <div className="actions">
                <button className="btn btn-secondary" type="submit">
                  Save alt
                </button>
              </div>
            </form>
            <form action={deleteMediaAction} className="inline-form">
              <input type="hidden" name="id" value={row.id} />
              <button className="btn btn-ghost" type="submit">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
      {pages > 1 ? (
        <nav className="tabs">
          {current > 1 ? <Link href={`/admin/media/?page=${current - 1}`}>← Newer</Link> : null}
          <span>
            Page {current} of {pages}
          </span>
          {current < pages ? <Link href={`/admin/media/?page=${current + 1}`}>Older →</Link> : null}
        </nav>
      ) : null}
    </>
  )
}
