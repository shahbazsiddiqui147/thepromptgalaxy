'use client'

import { useActionState } from 'react'
import { changePasswordAction, type PasswordState } from './actions'

const initial: PasswordState = {}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial)
  return (
    <form action={action} className="form-grid">
      {state.done ? <div className="banner">Password changed. Your other sessions were signed out.</div> : null}
      {state.error ? <div className="banner banner-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="next">New password</label>
        <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={10} required />
        <div className="field-help">At least 10 characters.</div>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}
