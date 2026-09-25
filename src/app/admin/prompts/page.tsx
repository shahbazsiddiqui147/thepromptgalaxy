import Link from 'next/link'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getToolMatrix } from '@/matrix/repo'
import { listPrompts } from '@/prompts/repo'
import { PROMPT_STATUSES } from '@/prompts/types'
import { deletePromptAction } from './actions'

const PAGE_SIZE = 25

export default async function PromptListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string; error?: string; saved?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { q, status, category, page, error, saved } = await searchParams
  const current = Math.max(1, Number(page) || 1)
  const categoryId = Number(category) || undefined
  const statusFilter = PROMPT_STATUSES.find((s) => s === status)
  const db = getPool()
  const [{ rows, total }, { categories }] = await Promise.all([
    listPrompts(db, { q: q?.trim() || undefined, status: statusFilter, categoryId, limit: PAGE_SIZE, offset: (current - 1) * PAGE_SIZE }),
    getToolMatrix(db),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const link = (n: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (statusFilter) params.set('status', statusFilter)
    if (categoryId) params.set('category', String(categoryId))
    params.set('page', String(n))
    return `/admin/prompts/?${params.toString()}`
  }

  return (
    <>
      <div className="admin-head">
        <h1>Prompts</h1>
        <Link className="btn btn-primary" href="/admin/prompts/new/">
          New prompt
        </Link>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {saved ? <div className="banner">Saved.</div> : null}
      <form method="get" className="actions" style={{ marginBottom: 'var(--space-4)' }}>
        <input name="q" className="input" placeholder="Search titles" defaultValue={q ?? ''} />
        <select name="status" className="input" defaultValue={statusFilter ?? ''}>
          <option value="">Any status</option>
          {PROMPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="category" className="input" defaultValue={categoryId ?? ''}>
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" type="submit">
          Filter
        </button>
      </form>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Primary tool</th>
            <th>Status</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No prompts match.</td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td>{row.categoryName}</td>
              <td>{row.primaryToolName ?? '–'}</td>
              <td>{row.status}</td>
              <td>{new Date(row.updatedAt).toISOString().slice(0, 10)}</td>
              <td>
                <div className="actions">
                  <Link className="btn btn-secondary" href={`/admin/prompts/${row.id}/`}>
                    Edit
                  </Link>
                  <form action={deletePromptAction} className="inline-form">
                    <input type="hidden" name="__id" value={row.id} />
                    <button className="btn btn-ghost" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 ? (
        <nav className="tabs">
          {current > 1 ? <Link href={link(current - 1)}>← Previous</Link> : null}
          <span>
            Page {current} of {pages} ({total} prompts)
          </span>
          {current < pages ? <Link href={link(current + 1)}>Next →</Link> : null}
        </nav>
      ) : null}
    </>
  )
}
