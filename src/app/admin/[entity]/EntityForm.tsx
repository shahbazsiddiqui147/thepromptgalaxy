'use client'

import { useActionState } from 'react'
import type { FormState } from '@/registry/form-state'
import type { FieldDef } from '@/registry/types'
import { saveEntity } from './actions'

type Props = {
  entityKey: string
  singular: string
  fields: FieldDef[]
  id?: number
  values: Record<string, unknown>
}

const initial: FormState = { errors: {} }

function FieldInput({ field, value, error }: { field: FieldDef; value: unknown; error?: string }) {
  const id = `f-${field.name}`
  let control: React.ReactNode
  switch (field.type) {
    case 'textarea':
      control = <textarea id={id} name={field.name} className="input" rows={4} defaultValue={String(value ?? '')} />
      break
    case 'number':
      control = <input id={id} name={field.name} className="input" type="number" step={1} defaultValue={String(value ?? '')} />
      break
    case 'boolean':
      control = (
        <label className="check">
          <input id={id} name={field.name} type="checkbox" defaultChecked={Boolean(value)} />
          {field.label}
        </label>
      )
      break
    case 'select':
      control = (
        <select id={id} name={field.name} className="input" defaultValue={String(value ?? '')}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
      break
    default:
      control = <input id={id} name={field.name} className="input" type="text" defaultValue={String(value ?? '')} />
  }
  return (
    <div className="field">
      {field.type === 'boolean' ? null : <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>}
      {control}
      {field.help ? <div className="field-help">{field.help}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}

export function EntityForm({ entityKey, singular, fields, id, values }: Props) {
  const [state, action, pending] = useActionState(saveEntity, initial)
  const current = { ...values, ...(state.values ?? {}) }
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="__entity" value={entityKey} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}
      {state.errors._ ? <div className="banner banner-error">{state.errors._}</div> : null}
      {fields.map((field) => (
        <FieldInput key={field.name} field={field} value={current[field.name]} error={state.errors[field.name]} />
      ))}
      <div className="actions">
        <button className="btn btn-primary" disabled={pending}>
          {id ? 'Save changes' : `Create ${singular.toLowerCase()}`}
        </button>
        <a className="btn btn-secondary" href={`/admin/${entityKey}/`}>
          Cancel
        </a>
      </div>
    </form>
  )
}
