import type { Metadata } from 'next'
import Link from 'next/link'
import { dashboardContext, formatWhen, one, readPage } from '@/lib/dashboard/http'
import { Pager } from '@/components/dashboard/Pager'
import { SavedNote } from '@/components/dashboard/ui'

export const metadata: Metadata = { title: 'Users' }

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = one(params.q).trim()
  const page = readPage(params.page)
  const { payload, user } = await dashboardContext()
  const result = await payload.find({
    collection: 'users',
    where: q ? { or: [{ email: { contains: q } }, { name: { contains: q } }] } : undefined,
    page,
    limit: 30,
    depth: 0,
    sort: 'email',
    select: { email: true, name: true, createdAt: true },
    user,
    overrideAccess: false,
  })

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">People</p>
          <h1>Users</h1>
          <p className="dash-lead">Admin accounts. These are separate from public customers.</p>
        </div>
        <Link className="btn btn-primary" href="/dashboard/users/new/">
          New admin
        </Link>
      </header>
      <SavedNote deleted={one(params.deleted)} />
      <form className="dash-filters" method="get" action="/dashboard/users/">
        <input id="dash-search" className="input" name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {result.docs.map((doc) => (
              <tr key={doc.id}>
                <td data-label="Email">
                  <Link href={`/dashboard/users/${doc.id}/`}>{doc.email}</Link>
                  {doc.id === user.id ? ' · you' : ''}
                </td>
                <td data-label="Name">{doc.name || '—'}</td>
                <td data-label="Joined">{formatWhen(doc.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={result.page ?? 1} totalPages={result.totalPages} totalDocs={result.totalDocs} pathname="/dashboard/users/" params={{ q }} />
    </>
  )
}
