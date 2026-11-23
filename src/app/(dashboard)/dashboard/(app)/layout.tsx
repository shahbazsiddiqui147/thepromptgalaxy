import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/lib/dashboard/actions/auth'
import { getDashboardUser } from '@/lib/dashboard/session'
import { DashNav } from '@/components/dashboard/DashNav'

export const dynamic = 'force-dynamic'

export default async function DashboardAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getDashboardUser()
  if (!user) redirect('/dashboard/login/')

  return (
    <>
      <input id="dash-nav" className="dash-nav-check" type="checkbox" />
      <div className="dash-shell">
        <aside className="dash-side">
          <Link href="/dashboard/" className="dash-brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>
              <small>Studio</small>
              ThePromptGalaxy
            </span>
          </Link>
          <DashNav />
          <div className="dash-side-foot">
            <p className="dash-user">{user.name || user.email}</p>
            <Link href="/">View site</Link>
            <Link href="/admin/">Payload admin</Link>
            <form action={logoutAction}>
              <button className="btn btn-secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
        </aside>
        <div className="dash-main">
          <div className="dash-topbar">
            <label className="btn btn-secondary dash-menu-btn" htmlFor="dash-nav">
              Menu
            </label>
            <strong>Studio</strong>
          </div>
          <label className="dash-scrim" htmlFor="dash-nav" aria-hidden="true" />
          {children}
        </div>
      </div>
    </>
  )
}
