'use client'

import { useActionState, useState } from 'react'
import { RichTextField } from '@/app/admin/_components/RichTextField'
import { slugify } from '@/lib/slug'
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

function RichInput({ field, value }: { field: FieldDef; value: unknown }) {
  const [html, setHtml] = useState(String(value ?? ''))
  return (
    <>
      <input type="hidden" name={field.name} value={html} />
      <RichTextField label={field.label} value={html} onChange={setHtml} />
    </>
  )
}

type SlugControl = { value: string; onEdit: (value: string) => void }

function FieldInput({ field, value, error, slug }: { field: FieldDef; value: unknown; error?: string; slug?: SlugControl }) {
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
    case 'richtext':
      control = <RichInput field={field} value={value} />
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
      control =
        field.type === 'slug' && slug ? (
          <input id={id} name={field.name} className="input" type="text" value={slug.value} onChange={(e) => slug.onEdit(e.target.value)} />
        ) : (
          <input id={id} name={field.name} className="input" type="text" defaultValue={String(value ?? '')} />
        )
  }
  return (
    <div className="field">
      {field.type === 'boolean' || field.type === 'richtext' ? null : <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>}
      {control}
      {field.help ? <div className="field-help">{field.help}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}

export function EntityForm({ entityKey, singular, fields, id, values }: Props) {
  const [state, action, pending] = useActionState(saveEntity, initial)
  const current = { ...values, ...(state.values ?? {}) }
  // On a new record the slug follows the name until it is edited by hand; existing records never change on their own.
  const [slugValue, setSlugValue] = useState(String(current.slug ?? ''))
  const [slugTouched, setSlugTouched] = useState(Boolean(id) || slugValue !== '')
  const slug: SlugControl = {
    value: slugValue,
    onEdit: (next) => {
      setSlugTouched(true)
      setSlugValue(next)
    },
  }
  return (
    <form
      action={action}
      className="form-grid"
      onInput={(event) => {
        const target = event.target as HTMLInputElement
        if ((target.name === 'name' || target.name === 'title') && !slugTouched) setSlugValue(slugify(target.value))
      }}
    >
      <input type="hidden" name="__entity" value={entityKey} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}
      {state.errors._ ? <div className="banner banner-error">{state.errors._}</div> : null}
      {fields.map((field) => (
        <FieldInput key={field.name} field={field} value={current[field.name]} error={state.errors[field.name]} slug={field.type === 'slug' ? slug : undefined} />
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
