'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { RelationshipFieldClient, Validate } from 'payload'
import { FieldDescription, FieldError, FieldLabel, useConfig, useField } from '@payloadcms/ui'

/**
 * Reusable single-select "pill" picker for `relationship` fields (hasMany: false,
 * non-polymorphic relationTo). Renders one pill per option in the related collection,
 * with an optional colored dot read from that record's own `colorHex` field (if present).
 *
 * Used for Prompts.subject / Prompts.artStyle (both have colorHex on their collections)
 * and Prompts.contentType (no colorHex — dot is simply omitted).
 *
 * Value-shape note: for a single, non-polymorphic relationship field, the stored/form
 * value is the raw related-doc ID (number | string) — never a `{ relationTo, value }`
 * wrapper (that shape only applies to polymorphic relationships with relationTo: string[]).
 * Confirmed against src/payload-types.ts (`subject: number | Subject`) and against
 * @payloadcms/ui's RelationshipField component, whose handleChangeSingle() does
 * `setValue(isPolymorphic ? newValue : newValue.value)` — i.e. unwraps to the raw id
 * before it ever reaches form state for a non-polymorphic field.
 */

type PillOption = {
  id: number | string
  label: string
  colorHex?: string | null
}

type ColorPillPickerProps = {
  field: RelationshipFieldClient
  path: string
  readOnly?: boolean
  validate?: Validate
}

const GOLD = '#C9A227'
const GOLD_TINT = '#F7EFD9'
const GOLD_TEXT = '#5C4A10'

export function ColorPillPicker(props: ColorPillPickerProps) {
  const { field, path: pathFromProps, readOnly: readOnlyFromProps, validate } = props
  const required = Boolean(field?.required)

  const memoizedValidate = useCallback<Validate>(
    (value, options) => {
      if (typeof validate === 'function') {
        return validate(value, { ...options, required })
      }
      return true
    },
    [validate, required],
  )

  const { disabled, path, setValue, showError, value } = useField<number | string | null>({
    potentiallyStalePath: pathFromProps,
    validate: memoizedValidate,
  })

  const { config } = useConfig()
  const { routes, serverURL } = config

  const relationTo = Array.isArray(field?.relationTo) ? field.relationTo[0] : field?.relationTo

  const [options, setOptions] = useState<PillOption[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!relationTo) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(
          `${serverURL}${routes.api}/${relationTo}?limit=100&sort=sortOrder&depth=0`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error(`Failed to load ${relationTo} (${res.status})`)
        const data = await res.json()
        const docs = Array.isArray(data?.docs) ? data.docs : []
        if (!cancelled) {
          setOptions(
            docs.map((doc: Record<string, unknown>) => ({
              id: doc.id as number | string,
              label: typeof doc.name === 'string' ? doc.name : String(doc.id),
              colorHex: typeof doc.colorHex === 'string' ? doc.colorHex : null,
            })),
          )
        }
      } catch {
        if (!cancelled) setLoadError(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [serverURL, routes.api, relationTo])

  const isReadOnly = Boolean(readOnlyFromProps || disabled)

  return (
    <div className="field-type" id={`field-${path.replace(/\./g, '__')}`} style={{ marginBottom: 24 }}>
      <FieldLabel label={field?.label} path={path} required={required} />
      <FieldError path={path} showError={showError} />

      <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {options === null && !loadError && (
          <span style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>Loading options…</span>
        )}
        {loadError && (
          <span style={{ fontSize: 13, color: 'var(--theme-error-500)' }}>
            Couldn’t load {relationTo ?? 'options'}. Try refreshing the page.
          </span>
        )}
        {options !== null && !loadError && options.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            No {relationTo ?? 'options'} exist yet — create one first.
          </span>
        )}
        {options?.map((option) => {
          const isActive = value !== null && value !== undefined && String(value) === String(option.id)
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={isReadOnly}
              onClick={() => setValue(option.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: isReadOnly ? 'default' : 'pointer',
                border: isActive ? `1px solid ${GOLD}` : '1px solid var(--theme-elevation-150)',
                backgroundColor: isActive ? GOLD_TINT : 'var(--theme-input-bg)',
                color: isActive ? GOLD_TEXT : 'var(--theme-text)',
              }}
            >
              {option.colorHex ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: option.colorHex,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              ) : null}
              {option.label}
            </button>
          )
        })}
      </div>

      <FieldDescription description={field?.admin?.description} path={path} />
    </div>
  )
}
