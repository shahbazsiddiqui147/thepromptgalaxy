import type { Metadata } from 'next'
import Link from 'next/link'
import { dashboardContext, findOrNotFound, formatWhen, readId } from '@/lib/dashboard/http'
import type { Customer, Prompt } from '@/payload-types'

export const metadata: Metadata = { title: 'Customer' }

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const id = readId(raw)
  const { payload, user } = await dashboardContext()
  const customer = (await findOrNotFound(() =>
    payload.findByID({
      collection: 'customers',
      id,
      depth: 0,
      select: { name: true, email: true, createdAt: true, savedPrompts: true },
      user,
      overrideAccess: false,
    }),
  )) as Customer

  const ids = (customer.savedPrompts ?? []).flatMap((item) => (typeof item === 'number' ? [item] : []))
  const saved = ids.length
    ? await payload.find({
        collection: 'prompts',
        where: { id: { in: ids.slice(0, 100) } },
        limit: 100,
        depth: 0,
        draft: true,
        pagination: false,
        select: { title: true, _status: true },
        user,
        overrideAccess: false,
      })
    : { docs: [] as Prompt[] }

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Customers</p>
          <h1>{customer.name}</h1>
          <p className="dash-lead">
            {customer.email} · joined {formatWhen(customer.createdAt)}
          </p>
        </div>
        <Link href="/dashboard/customers/">All customers</Link>
      </header>
      <section className="dash-panel">
        <h2>Saved prompts</h2>
        {saved.docs.length === 0 ? <p>None saved.</p> : null}
        <ul>
          {saved.docs.map((prompt) => (
            <li key={prompt.id}>
              <Link href={`/dashboard/prompts/${prompt.id}/`}>{prompt.title}</Link>
              <span className="dash-hint"> {prompt._status === 'published' ? 'Published' : 'Draft'}</span>
            </li>
          ))}
        </ul>
        {ids.length > 100 ? <p className="dash-hint">Showing the first 100 saved prompts.</p> : null}
      </section>
    </>
  )
}
