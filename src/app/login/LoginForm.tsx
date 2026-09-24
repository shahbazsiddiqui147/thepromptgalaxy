'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

const initial: LoginState = {}

export function LoginForm({ next, denied }: { next: string; denied: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial)
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="next" value={next} />
      {denied ? <div className="banner banner-error">Your account cannot open that page.</div> : null}
      {state.error ? <div className="banner banner-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  )
}
