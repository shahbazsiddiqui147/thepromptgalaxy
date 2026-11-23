'use client'

import { useFormStatus } from 'react-dom'
import { useActionState } from 'react'
import type { FormState } from '@/lib/dashboard/http'

export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  className = 'btn btn-primary',
  name,
  value,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button className={className} type="submit" name={name} value={value} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}

export function ActionForm({
  action,
  children,
  className,
  formKey,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  children: React.ReactNode
  className?: string
  formKey?: string
}) {
  const [state, formAction] = useActionState(action, { error: null, message: null })
  return (
    <form key={formKey} action={formAction} className={className}>
      {state.error ? (
        <p className="dash-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="dash-banner" role="status">
          {state.message}
        </p>
      ) : null}
      {children}
    </form>
  )
}

export function ConfirmForm({
  action,
  message,
  label,
  hidden,
}: {
  action: (formData: FormData) => void | Promise<void>
  message: string
  label: string
  hidden?: Record<string, string>
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {hidden
        ? Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
        : null}
      <button className="btn btn-secondary dash-danger" type="submit">
        {label}
      </button>
    </form>
  )
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="dash-hint">{hint}</p> : null}
    </div>
  )
}

export function SavedNote({ saved, deleted, error }: { saved?: string; deleted?: string; error?: string }) {
  if (error === 'delete') return <p className="dash-error" role="alert">Could not delete that record. It may still be in use.</p>
  if (error === 'self') return <p className="dash-error" role="alert">You can’t delete the account you’re signed in with.</p>
  if (saved === '1') return <p className="dash-banner" role="status">Saved.</p>
  if (deleted === '1') return <p className="dash-banner" role="status">Deleted.</p>
  return null
}

export function Pager({
  page,
  totalPages,
  totalDocs,
  hrefFor,
}: {
  page: number
  totalPages: number
  totalDocs: number
  hrefFor: (page: number) => string
}) {
  if (totalDocs === 0) return null
  return (
    <nav className="dash-pager" aria-label="Pagination">
      <span>
        Page {page} of {Math.max(totalPages, 1)} · {totalDocs} total
      </span>
      <div>
        {page > 1 ? (
          <a className="btn btn-secondary" href={hrefFor(page - 1)}>
            Previous
          </a>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            Previous
          </span>
        )}
        {page < totalPages ? (
          <a className="btn btn-secondary" href={hrefFor(page + 1)}>
            Next
          </a>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  )
}
