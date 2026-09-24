import Link from 'next/link'
import { requireUser } from '@/lib/current-user'
import { ROLES } from '@/lib/roles'
import { PasswordForm } from './PasswordForm'

export default async function PasswordPage() {
  const user = await requireUser(ROLES)
  return (
    <main className="login-wrap">
      <h1>Change password</h1>
      <p>Signed in as {user.email}.</p>
      <PasswordForm />
      {user.role === 'member' ? null : (
        <p>
          <Link href="/admin/">Back to the admin</Link>
        </p>
      )}
    </main>
  )
}
