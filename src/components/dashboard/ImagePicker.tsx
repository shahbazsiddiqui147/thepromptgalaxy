'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { browseMedia } from '@/lib/dashboard/actions/records'
import type { MediaCard } from '@/lib/dashboard/media'
import { uploadMediaFile, type UploadedMedia } from '@/components/dashboard/uploadMedia'

export type ImageValue = { id: number | null; preview: UploadedMedia | null }

export function ImagePicker({
  name,
  label,
  hint,
  initial,
  clientUploads,
  onChange,
}: {
  name?: string
  label: string
  hint?: string
  initial: UploadedMedia | null
  clientUploads: boolean
  onChange?: (value: ImageValue) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const [selected, setSelected] = useState<UploadedMedia | null>(initial)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ docs: MediaCard[]; totalPages: number }>({ docs: [], totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      setLoading(true)
      browseMedia(query, page)
        .then((next) => {
          if (!cancelled) setResult({ docs: next.docs, totalPages: next.totalPages })
        })
        .catch(() => {
          if (!cancelled) setError('Could not load the media library.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [open, query, page])

  function choose(item: UploadedMedia | null) {
    setSelected(item)
    onChange?.({ id: item?.id ?? null, preview: item })
    dialogRef.current?.close()
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Upload'
      const uploaded = await uploadMediaFile(file, alt, clientUploads)
      choose(uploaded)
      setPage(1)
      setQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="field">
      <span id={titleId}>{label}</span>
      {name ? <input type="hidden" name={name} value={selected?.id ?? ''} /> : null}
      {selected ? (
        <div className="dash-pick">
          {selected.thumb || selected.url ? (
            // Uploaded library images have unknown dimensions; the admin preview is a plain thumbnail.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.thumb || selected.url || ''} alt={selected.alt} />
          ) : (
            <span className="dash-ph">No preview</span>
          )}
          <div>
            <strong>{selected.alt || selected.filename || `Image ${selected.id}`}</strong>
            <p className="dash-hint">{selected.filename}</p>
            <div className="dash-inline">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setOpen(true)
                  dialogRef.current?.showModal()
                }}
              >
                Replace
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => choose(null)}>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="dash-drop dash-drop-compact"
          onClick={() => {
            setOpen(true)
            dialogRef.current?.showModal()
          }}
        >
          Choose an image
        </button>
      )}
      {hint ? <p className="dash-hint">{hint}</p> : null}

      <dialog
        ref={dialogRef}
        className="dash-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
      >
        <div className="dash-dialog-head">
          <h2>Choose image</h2>
          <button type="button" className="btn btn-secondary" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
        <div className="dash-dialog-body">
          <div className="dash-inline">
            <input
              className="input"
              value={query}
              placeholder="Search alt text or filename"
              aria-label="Search images"
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            <button type="button" className="btn btn-primary" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void onFile(file)
              }}
            />
          </div>
          {error ? <p className="dash-error">{error}</p> : null}
          <div className="dash-media-grid" aria-busy={loading}>
            {result.docs.map((item) => (
              <button key={item.id} type="button" className="dash-media-card" onClick={() => choose(item)}>
                {item.thumb || item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumb || item.url || ''} alt={item.alt} />
                ) : (
                  <span className="dash-ph">No preview</span>
                )}
                <span>{item.alt || item.filename}</span>
              </button>
            ))}
          </div>
          {result.docs.length === 0 && !loading ? <p className="dash-hint">No images match.</p> : null}
          <div className="dash-inline">
            <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <span className="dash-hint">
              Page {page} of {Math.max(result.totalPages, 1)}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= result.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
