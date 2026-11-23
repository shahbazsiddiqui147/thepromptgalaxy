import type { Metadata } from 'next'
import Link from 'next/link'
import { deleteUser, saveUser } from '@/lib/dashboard/actions/users'
import { dashboardContext, findOrNotFound, formatWhen, one, readId } from '@/lib/dashboard/http'
import { ActionForm, ConfirmForm, SavedNote, SubmitButton } from '@/components/dashboard/ui'

export const metadata: Metadata = { title: 'Edit user' }

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id: raw } = await params
  const id = readId(raw)
  const query = await searchParams
  const { payload, user } = await dashboardContext()
  const doc = await findOrNotFound(() =>
    payload.findByID({
      collection: 'users',
      id,
      depth: 0,
      select: { email: true, name: true, createdAt: true, updatedAt: true },
      user,
      overrideAccess: false,
    }),
  )

  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Users</p>
          <h1>{doc.email}</h1>
          <p className="dash-lead">Joined {formatWhen(doc.createdAt)}</p>
        </div>
        <Link href="/dashboard/users/">All users</Link>
      </header>
      <SavedNote saved={one(query.saved)} error={one(query.error)} />
      <ActionForm action={saveUser} className="dash-stack dash-panel" formKey={doc.updatedAt}>
        <input type="hidden" name="id" value={doc.id} />
        <div className="field">
          <label htmlFor="user-email">Email</label>
          <input id="user-email" className="input" name="email" type="email" defaultValue={doc.email} required />
        </div>
        <div className="field">
          <label htmlFor="user-name">Name</label>
          <input id="user-name" className="input" name="name" defaultValue={doc.name ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="user-password">New password</label>
          <input id="user-password" className="input" name="password" type="password" autoComplete="new-password" placeholder="Leave blank to keep the current password" />
        </div>
        <SubmitButton>Save</SubmitButton>
      </ActionForm>
      {user.id !== doc.id ? (
        <div style={{ marginTop: 16 }}>
          <ConfirmForm action={deleteUser} message={`Delete ${doc.email}?`} label="Delete admin" hidden={{ id: String(doc.id) }} />
        </div>
      ) : (
        <p className="dash-hint">You can’t delete the account you’re signed in with.</p>
      )}
    </>
  )
}
