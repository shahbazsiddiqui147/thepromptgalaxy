import { safeNextPath } from '@/lib/safe-next'
import { LoginForm } from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>
}) {
  const { next, denied } = await searchParams
  return (
    <main className="login-wrap">
      <h1>Log in</h1>
      <LoginForm next={safeNextPath(next ?? '')} denied={denied === '1'} />
    </main>
  )
}
