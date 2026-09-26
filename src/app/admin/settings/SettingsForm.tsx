'use client'

import { useActionState } from 'react'
import { SETTING_FIELDS, type SiteSettings } from '@/site/settings'
import { saveSettingsAction, type SettingsFormState } from './actions'

const initial: SettingsFormState = { errors: {} }

export function SettingsForm({ values }: { values: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, initial)
  const current = { ...values, ...(state.values ?? {}) }
  return (
    <form action={action} className="form-grid" style={{ maxWidth: 640 }}>
      {SETTING_FIELDS.map((field) => (
        <div key={field.key} className="field">
          <label htmlFor={field.key}>{field.label}</label>
          <input id={field.key} name={field.key} className="input" type="text" defaultValue={current[field.key]} />
          <div className="field-help">{field.help}</div>
          {state.errors[field.key] ? <div className="field-error">{state.errors[field.key]}</div> : null}
        </div>
      ))}
      <div className="actions">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}
