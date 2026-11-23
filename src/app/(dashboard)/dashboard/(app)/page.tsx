import Link from 'next/link'
import { dashboardContext, formatWhen } from '@/lib/dashboard/http'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { Prompt, Subject } from '@/payload-types'

export const metadata = { title: 'Home' }

export default async function DashboardHomePage() {
  const { payload, user } = await dashboardContext()
  const access = { user, overrideAccess: false as const }

  const [prompts, drafts, media, subjects, artStyles, tools, contentTypes, customers, users, recent] = await Promise.all([
    payload.find({ collection: 'prompts', where: { _status: { equals: 'published' } }, draft: true, limit: 1, depth: 0, select: { title: true }, ...access }),
    payload.find({ collection: 'prompts', where: { _status: { equals: 'draft' } }, draft: true, limit: 1, depth: 0, select: { title: true }, ...access }),
    payload.count({ collection: 'media', ...access }),
    payload.count({ collection: 'subjects', ...access }),
    payload.count({ collection: 'art-styles', ...access }),
    payload.count({ collection: 'tools', ...access }),
    payload.count({ collection: 'content-types', ...access }),
    payload.count({ collection: 'customers', ...access }),
    payload.count({ collection: 'users', ...access }),
    payload.find({
      collection: 'prompts',
      draft: true,
      limit: 8,
      depth: 1,
      sort: '-updatedAt',
      select: { title: true, slug: true, _status: true, updatedAt: true, subject: true },
      ...access,
    }),
  ])

  const stats = [
    { href: '/dashboard/prompts/', label: 'Published', value: prompts.totalDocs },
    { href: '/dashboard/prompts/?status=draft', label: 'Drafts', value: drafts.totalDocs },
    { href: '/dashboard/media/', label: 'Media', value: media.totalDocs },
    { href: '/dashboard/subjects/', label: 'Subjects', value: subjects.totalDocs },
    { href: '/dashboard/art-styles/', label: 'Art styles', value: artStyles.totalDocs },
    { href: '/dashboard/tools/', label: 'Tools', value: tools.totalDocs },
    { href: '/dashboard/customers/', label: 'Customers', value: customers.totalDocs },
    { href: '/dashboard/users/', label: 'Admins', value: users.totalDocs },
  ]

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Home</p>
          <h1>Good to see you{user.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
          <p className="dash-lead">
            {prompts.totalDocs} published prompts, {drafts.totalDocs} drafts, {contentTypes.totalDocs} content types.
          </p>
        </div>
      </header>

      <div className="dash-actions">
        <Link className="btn btn-primary" href="/dashboard/prompts/new/">
          New prompt
        </Link>
        <Link className="btn btn-secondary" href="/dashboard/media/">
          Upload image
        </Link>
        <Link className="btn btn-secondary" href="/dashboard/site-settings/">
          Site settings
        </Link>
      </div>

      <div className="dash-stats">
        {stats.map((stat) => (
          <Link key={stat.label} className="dash-stat" href={stat.href}>
            <span>{stat.label}</span>
            <b>{stat.value}</b>
          </Link>
        ))}
      </div>

      <section>
        <header className="dash-pagehead">
          <h2 style={{ margin: 0 }}>Recent prompts</h2>
          <Link href="/dashboard/prompts/">All prompts</Link>
        </header>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recent.docs.length === 0 ? (
                <tr>
                  <td colSpan={4}>No prompts yet. Create the first one.</td>
                </tr>
              ) : (
                recent.docs.map((doc) => {
                  const prompt = doc as Prompt
                  const subject = typeof prompt.subject === 'object' ? (prompt.subject as Subject).name : '—'
                  return (
                    <tr key={prompt.id}>
                      <td data-label="Title">
                        <Link href={`/dashboard/prompts/${prompt.id}/`}>{prompt.title}</Link>
                      </td>
                      <td data-label="Subject">{subject}</td>
                      <td data-label="Status">{prompt._status === 'published' ? 'Published' : 'Draft'}</td>
                      <td data-label="Updated">
                        <time dateTime={prompt.updatedAt} title={formatWhen(prompt.updatedAt)}>
                          {formatRelativeTime(prompt.updatedAt)}
                        </time>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
