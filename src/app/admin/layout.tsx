import Link from 'next/link'
import { logoutAction } from '@/app/login/actions'
import { requireUser } from '@/lib/current-user'
import { ADMIN_AREA_ROLES } from '@/lib/roles'
import { ENTITIES } from '@/registry/entities'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(ADMIN_AREA_ROLES)
  const entities = Object.values(ENTITIES).filter((entity) => entity.roles.read.includes(user.role))
  const canEditTaxonomy = user.role === 'admin' || user.role === 'editor'

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <i />
          ThePromptGalaxy
        </div>
        <Link href="/admin/">Dashboard</Link>
        {entities.map((entity) => (
          <Link key={entity.key} href={`/admin/${entity.key}/`}>
            {entity.plural}
          </Link>
        ))}
        {canEditTaxonomy ? <Link href="/admin/matrix/">Relations matrix</Link> : null}
        <div className="admin-user">
          {user.displayName}
          <br />
          <span>{user.role}</span>
          <form action={logoutAction} className="inline-form">
            <button className="link" type="submit">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
