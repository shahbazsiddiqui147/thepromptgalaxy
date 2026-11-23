'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { uploadMediaFile } from '@/components/dashboard/uploadMedia'

export function MediaDropzone({ clientUploads }: { clientUploads: boolean }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function uploadAll(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (images.length === 0) {
      setError('Drop image files.')
      return
    }
    setBusy(true)
    setError(null)
    const failures: string[] = []
    for (let index = 0; index < images.length; index += 1) {
      const file = images[index]
      setStatus(`Uploading ${index + 1} of ${images.length}: ${file.name}`)
      try {
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Upload'
        await uploadMediaFile(file, alt, clientUploads)
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }
    setBusy(false)
    setStatus(null)
    if (failures.length) setError(failures.join(' '))
    router.refresh()
  }

  return (
    <div
      className={drag ? 'dash-drop is-on' : 'dash-drop'}
      onDragOver={(event) => {
        event.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDrag(false)
        if (!busy) void uploadAll(Array.from(event.dataTransfer.files))
      }}
    >
      <p>{busy ? status : 'Drop images here, or choose files'}</p>
      <p className="dash-hint">
        Uploads go through Payload, so images are resized to WebP.
        {clientUploads ? ' Files over 4.5MB upload directly to Blob first.' : ' Blob client uploads are off in this environment.'}
      </p>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
        Choose images
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          void uploadAll(files)
        }}
      />
      {error ? <p className="dash-error">{error}</p> : null}
    </div>
  )
}
