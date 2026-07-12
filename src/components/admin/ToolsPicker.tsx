'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ArrayFieldClient, ArrayFieldValidation, Validate } from 'payload'
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  useConfig,
  useField,
  useForm,
  useFormFields,
} from '@payloadcms/ui'

/**
 * Custom UI for Prompts.tools — an `array` field of `{ tool: relationship, fit: select }`
 * rows (NOT a simple hasMany relationship). Renders every Tool as a toggleable chip; each
 * currently-selected chip also shows an inline Great/Good Fit selector.
 *
 * Value-shape note verified against the installed Payload source (fieldReducer.js,
 * Form/context.js, useField/types.d.ts):
 *   - An array field's OWN form-state `value` is just a row COUNT (number), not the row
 *     data. The actual sub-field values live at separate flattened form-state paths, e.g.
 *     `tools.0.tool` / `tools.0.fit`, alongside row metadata (`{ id, collapsed, ... }[]`)
 *     returned as `rows` from `useField({ hasRows: true })`.
 *   - There is no supported way to "replace the whole array value in one setValue call" —
 *     rows must be added/removed via the imperative `addFieldRow` / `removeFieldRow`
 *     helpers from `useForm()` (which dispatch ADD_ROW / REMOVE_ROW against form state and
 *     correctly maintain both the `rows` metadata and the flattened per-row paths), and
 *     individual sub-field values are read via `useFormFields` (a selector over the same
 *     flattened form-state map every nested field's own `useField` call reads from) and
 *     written via `dispatchFields({ type: 'UPDATE', path, value })`.
 *   - `addFieldRow`/`replaceFieldRow` require a `schemaPath` (not just `path`) — mirrors
 *     what the built-in ArrayField component passes (`schemaPath ?? field.name`).
 */

type FitValue = 'great' | 'good'

type ToolOption = {
  id: number | string
  name: string
  active: boolean
}

type SelectedRow = {
  fit: FitValue
  rowIndex: number
  toolId: number | string | undefined
}

type ToolsPickerProps = {
  field: ArrayFieldClient
  path: string
  readOnly?: boolean
  schemaPath?: string
  validate?: ArrayFieldValidation
}

const FIT_OPTIONS: { label: string; value: FitValue }[] = [
  { label: 'Great Fit', value: 'great' },
  { label: 'Good Fit', value: 'good' },
]

const GOLD = '#C9A227'
const GOLD_TINT = '#F7EFD9'
const GOLD_TEXT = '#5C4A10'

export function ToolsPicker(props: ToolsPickerProps) {
  const {
    field,
    path: pathFromProps,
    readOnly: readOnlyFromProps,
    schemaPath: schemaPathFromProps,
    validate,
  } = props
  const required = Boolean(field?.required)
  const minRows = field?.minRows ?? (required ? 1 : 0)
  const maxRows = field?.maxRows
  const schemaPath = schemaPathFromProps ?? field?.name ?? 'tools'

  const memoizedValidate = useCallback<ArrayFieldValidation>(
    (value, options) => {
      if (typeof validate === 'function') {
        return validate(value, { ...options, maxRows, minRows, required })
      }
      return true
    },
    [validate, required, minRows, maxRows],
  )

  const { disabled, path, rows = [], showError } = useField<number>({
    hasRows: true,
    potentiallyStalePath: pathFromProps,
    // useField's Options.validate is typed against the generic `Validate` shape (which
    // only guarantees `BaseValidateOptions`), while the array field's own default
    // validator (and the `validate` prop Payload actually passes us at runtime) is typed
    // as `ArrayFieldValidation`, whose options additionally promise the full `ArrayField`
    // config. At runtime `useField` only ever supplies `BaseValidateOptions` — matching
    // exactly what the built-in `ArrayField` component's own `memoizedValidate` receives
    // and forwards (see @payloadcms/ui/dist/fields/Array/index.js) — so this cast reconciles
    // the two field-validation type shapes without changing behavior.
    validate: memoizedValidate as Validate,
  })

  const { addFieldRow, dispatchFields, removeFieldRow, setModified } = useForm()
  const formFields = useFormFields(([fields]) => fields)

  const { config } = useConfig()
  const { routes, serverURL } = config

  const [toolOptions, setToolOptions] = useState<ToolOption[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`${serverURL}${routes.api}/tools?limit=200&sort=sortOrder&depth=0`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`Failed to load tools (${res.status})`)
        const data = await res.json()
        const docs = Array.isArray(data?.docs) ? data.docs : []
        if (!cancelled) {
          setToolOptions(
            docs.map((doc: Record<string, unknown>) => ({
              id: doc.id as number | string,
              name: typeof doc.name === 'string' ? doc.name : String(doc.id),
              // Show inactive tools too (don't filter by `active`) so an admin editing a
              // prompt that references an already-inactive tool can still see/manage it.
              active: doc.active !== false,
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
  }, [serverURL, routes.api])

  // Derive the currently-selected tool rows straight from form state: each row's `tool`
  // and `fit` live at `${path}.${rowIndex}.tool` / `.fit` in the flattened field map.
  const selectedRows: SelectedRow[] = useMemo(() => {
    return rows.map((row, rowIndex) => {
      const toolField = formFields[`${path}.${rowIndex}.tool`]
      const fitField = formFields[`${path}.${rowIndex}.fit`]
      return {
        fit: (fitField?.value as FitValue | undefined) ?? 'good',
        rowIndex,
        toolId: toolField?.value as number | string | undefined,
      }
    })
  }, [rows, formFields, path])

  const isReadOnly = Boolean(readOnlyFromProps || disabled)

  const toggleTool = useCallback(
    (toolId: number | string) => {
      if (isReadOnly) return
      const existing = selectedRows.find((row) => String(row.toolId) === String(toolId))
      if (existing) {
        removeFieldRow({ path, rowIndex: existing.rowIndex })
      } else {
        addFieldRow({
          path,
          rowIndex: rows.length,
          schemaPath,
          subFieldState: {
            tool: { initialValue: toolId, valid: true, value: toolId },
            fit: { initialValue: 'good', valid: true, value: 'good' },
          },
        })
      }
    },
    [isReadOnly, selectedRows, removeFieldRow, addFieldRow, path, rows.length, schemaPath],
  )

  const setFit = useCallback(
    (rowIndex: number, fit: FitValue) => {
      if (isReadOnly) return
      dispatchFields({ type: 'UPDATE', path: `${path}.${rowIndex}.fit`, value: fit })
      setModified(true)
    },
    [isReadOnly, dispatchFields, path, setModified],
  )

  return (
    <div className="field-type" id={`field-${path.replace(/\./g, '__')}`} style={{ marginBottom: 24 }}>
      <FieldLabel label={field?.label} path={path} required={required} />
      <FieldError path={path} showError={showError} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {toolOptions === null && !loadError && (
          <span style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>Loading tools…</span>
        )}
        {loadError && (
          <span style={{ fontSize: 13, color: 'var(--theme-error-500)' }}>
            Couldn’t load tools. Try refreshing the page.
          </span>
        )}
        {toolOptions !== null && !loadError && toolOptions.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            No tools exist yet — create one first.
          </span>
        )}
        {toolOptions?.map((tool) => {
          const selected = selectedRows.find((row) => String(row.toolId) === String(tool.id))
          const isActive = Boolean(selected)
          return (
            <div
              key={tool.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px 4px 12px',
                borderRadius: 999,
                border: isActive ? `1px solid ${GOLD}` : '1px solid var(--theme-elevation-150)',
                backgroundColor: isActive ? GOLD_TINT : 'var(--theme-input-bg)',
              }}
            >
              <button
                type="button"
                aria-pressed={isActive}
                disabled={isReadOnly}
                onClick={() => toggleTool(tool.id)}
                title={tool.active ? undefined : 'Inactive tool — hidden from public filters, but still manageable here'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? GOLD_TEXT : 'var(--theme-text)',
                  cursor: isReadOnly ? 'default' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: tool.active ? 1 : 0.6,
                  padding: 0,
                }}
              >
                {tool.name}
                {!tool.active ? ' (inactive)' : ''}
              </button>

              {isActive && selected ? (
                <select
                  value={selected.fit}
                  disabled={isReadOnly}
                  onChange={(e) => setFit(selected.rowIndex, e.target.value as FitValue)}
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: 999,
                    fontSize: 12,
                    padding: '2px 6px',
                  }}
                >
                  {FIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          )
        })}
      </div>

      <FieldDescription description={field?.admin?.description} path={path} />
    </div>
  )
}
