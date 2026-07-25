'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { UploadFieldClient, Validate } from 'payload'
import { FieldDescription, FieldError, FieldLabel, useConfig, useField } from '@payloadcms/ui'

/**
 * Single-file inline upload control for `upload` fields (hasMany: false,
 * non-polymorphic relationTo) -- lets an editor drag/drop or click to pick a
 * file and uploads it directly to the related collection in place, with a
 * thumbnail preview and a Remove button. No drawer, no navigating away from
 * the current document.
 *
 * Used for SiteSettings.logo / SiteSettings.favicon.
 */

type MediaDoc = {
  id: number | string
  url?: string | null
  filename?: string | null
  alt?: string | null
  mimeType?: string | null
}

type InlineUploadProps = {
  field: UploadFieldClient
  path: string
  readOnly?: boolean
  validate?: Validate
}

function deriveAlt(filename: string, fieldLabel: string) {
  const withoutExtension = filename.replace(/\.[^./]+$/, '')
  const cleaned = withoutExtension.replace(/[-_]+/g, ' ').trim()
  return cleaned || fieldLabel || 'Upload'
}

export function InlineUpload(props: InlineUploadProps) {
  const { field, path: pathFromProps, readOnly: readOnlyFromProps, validate } = props
  const required = Boolean(field?.required)
  const fieldLabel = typeof field?.label === 'string' ? field.label : 'File'

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

  const [doc, setDoc] = useState<MediaDoc | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the preview in sync with the stored value -- covers both the
  // initial load of an existing document and a value cleared elsewhere.
  useEffect(() => {
    if (!relationTo) return
    if (value === null || value === undefined || value === '') {
      setDoc(null)
      return
    }
    if (doc && String(doc.id) === String(value)) return

    let cancelled = false
    fetch(`${serverURL}${routes.api}/${relationTo}/${value}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setDoc(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, relationTo, serverURL, routes.api])

  const isReadOnly = Boolean(readOnlyFromProps || disabled)

  const upload = useCallback(
    async (file: File) => {
      if (!relationTo) return
      setError(null)
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt', deriveAlt(file.name, fieldLabel))

        const res = await fetch(`${serverURL}${routes.api}/${relationTo}`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.errors?.[0]?.message || `Upload failed (${res.status})`)
        }
        const data = await res.json()
        const newDoc = data?.doc
        if (newDoc) {
          setDoc(newDoc)
          setValue(newDoc.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setUploading(false)
      }
    },
    [relationTo, serverURL, routes.api, fieldLabel, setValue],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void upload(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    if (isReadOnly || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) void upload(file)
  }

  return (
    <div className="field-type" id={`field-${path.replace(/\./g, '__')}`} style={{ marginBottom: 24 }}>
      <FieldLabel label={field?.label} path={path} required={required} />
      <FieldError path={path} showError={showError} />

      {doc ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 10,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            marginTop: 6,
          }}
        >
          {doc.url && (
            // Arbitrary uploaded image inside the admin UI -- plain <img> is the
            // right tool here, not next/image (no fixed layout, no build-time domain).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.url}
              alt={doc.alt || ''}
              style={{ width: 48, height: 48, objectFit: 'contain', background: 'var(--theme-elevation-50)', borderRadius: 3 }}
            />
          )}
          <span style={{ fontSize: 13, color: 'var(--theme-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.filename}
          </span>
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  borderRadius: 3,
                  border: '1px solid var(--theme-elevation-150)',
                  background: 'var(--theme-input-bg)',
                  color: 'var(--theme-text)',
                  cursor: uploading ? 'default' : 'pointer',
                }}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setDoc(null)
                  setValue(null)
                }}
                disabled={uploading}
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  borderRadius: 3,
                  border: '1px solid var(--theme-error-500)',
                  background: 'transparent',
                  color: 'var(--theme-error-500)',
                  cursor: uploading ? 'default' : 'pointer',
                }}
              >
                Remove
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          onClick={() => !isReadOnly && !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isReadOnly && !uploading) setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          style={{
            marginTop: 6,
            padding: '20px 16px',
            textAlign: 'center',
            borderRadius: 4,
            border: `1px dashed ${dragActive ? 'var(--theme-success-500)' : 'var(--theme-elevation-200)'}`,
            background: dragActive ? 'var(--theme-success-50)' : 'var(--theme-elevation-50)',
            cursor: isReadOnly || uploading ? 'default' : 'pointer',
            fontSize: 13,
            color: 'var(--theme-elevation-500)',
          }}
        >
          {uploading ? 'Uploading…' : 'Click to upload, or drag and drop a file here'}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: 'none' }}
        disabled={isReadOnly || uploading}
      />

      {error && (
        <p style={{ color: 'var(--theme-error-500)', fontSize: 12.5, marginTop: 6 }}>{error}</p>
      )}

      <FieldDescription description={field?.admin?.description} path={path} />
    </div>
  )
}
