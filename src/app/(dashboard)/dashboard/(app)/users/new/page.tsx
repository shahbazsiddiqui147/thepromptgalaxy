import type { Metadata } from 'next'
import Link from 'next/link'
import { saveUser } from '@/lib/dashboard/actions/users'
import { ActionForm, SubmitButton } from '@/components/dashboard/ui'

export const metadata: Metadata = { title: 'New admin' }

export default function NewUserPage() {
  return (
    <>
      <header className="dash-pagehead">
        <div>
          <p className="dash-kicker">Users</p>
          <h1>New admin</h1>
        </div>
        <Link href="/dashboard/users/">All users</Link>
      </header>
      <ActionForm action={saveUser} className="dash-stack dash-panel" formKey="new">
        <div className="field">
          <label htmlFor="user-email">Email</label>
          <input id="user-email" className="input" name="email" type="email" autoComplete="off" required />
        </div>
        <div className="field">
          <label htmlFor="user-name">Name</label>
          <input id="user-name" className="input" name="name" autoComplete="off" />
          <p className="dash-hint">Shown when this person verifies a prompt. Optional.</p>
        </div>
        <div className="field">
          <label htmlFor="user-password">Password</label>
          <input id="user-password" className="input" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <SubmitButton>Create admin</SubmitButton>
      </ActionForm>
    </>
  )
}
