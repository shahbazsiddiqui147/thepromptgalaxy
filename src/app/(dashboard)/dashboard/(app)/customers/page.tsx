import type { Metadata } from 'next'
import Link from 'next/link'
import { dashboardContext, formatWhen, one, readPage } from '@/lib/dashboard/http'
import { Pager } from '@/components/dashboard/Pager'
import type { Customer } from '@/payload-types'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = one(params.q).trim()
  const page = readPage(params.page)
  const { payload, user } = await dashboardContext()
  const result = await payload.find({
    collection: 'customers',
    where: q ? { or: [{ email: { contains: q } }, { name: { contains: q } }] } : undefined,
    page,
    limit: 30,
    depth: 0,
    sort: '-createdAt',
    select: { email: true, name: true, createdAt: true, savedPrompts: true },
    user,
    overrideAccess: false,
  })

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">People</p>
          <h1>Customers</h1>
          <p className="dash-lead">Public site accounts. This screen is view-only so a click here can’t change someone’s login.</p>
        </div>
      </header>
      <form className="dash-filters" method="get" action="/dashboard/customers/">
        <input id="dash-search" className="input" name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search customers" />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Saved</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {result.docs.length === 0 ? (
              <tr>
                <td colSpan={4}>No customers match.</td>
              </tr>
            ) : (
              result.docs.map((doc) => {
                const customer = doc as Customer
                const saved = Array.isArray(customer.savedPrompts) ? customer.savedPrompts.length : 0
                return (
                  <tr key={customer.id}>
                    <td data-label="Name">
                      <Link href={`/dashboard/customers/${customer.id}/`}>{customer.name}</Link>
                    </td>
                    <td data-label="Email">{customer.email}</td>
                    <td data-label="Saved">{saved}</td>
                    <td data-label="Joined">{formatWhen(customer.createdAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <Pager page={result.page ?? 1} totalPages={result.totalPages} totalDocs={result.totalDocs} pathname="/dashboard/customers/" params={{ q }} />
    </>
  )
}
