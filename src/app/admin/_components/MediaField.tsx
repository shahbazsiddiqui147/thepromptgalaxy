'use client'

import { useRef, useState } from 'react'

type Props = {
  label: string
  value: number | null
  onChange: (id: number | null) => void
}

export function MediaField({ label, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  async function upload(file: File) {
    setError(null)
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const response = await fetch('/admin/media/upload/', { method: 'POST', body, credentials: 'same-origin' })
      const data = (await response.json().catch(() => ({}))) as { id?: number; error?: string }
      if (!response.ok || !data.id) throw new Error(data.error ?? 'Upload failed.')
      onChange(data.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className="media-field">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/media/${value}/thumb/`} alt="" width={96} height={96} />
          <div className="actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => input.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onChange(null)}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone${drag ? ' dropzone-active' : ''}`}
          onClick={() => !busy && input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDrag(false)
            const file = event.dataTransfer.files?.[0]
            if (file && !busy) void upload(file)
          }}
        >
          {busy ? 'Uploading…' : 'Click to upload, or drag and drop an image here'}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}
