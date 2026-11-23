'use client'

import { useEffect, useState } from 'react'
import { slugify } from '@/lib/autoSlug'

export function SlugMirror({ sourceId, saved }: { sourceId: string; saved?: string | null }) {
  const [preview, setPreview] = useState(saved || '')

  useEffect(() => {
    const input = document.getElementById(sourceId)
    if (!(input instanceof HTMLInputElement)) return
    const update = () => setPreview(slugify(input.value))
    update()
    input.addEventListener('input', update)
    return () => input.removeEventListener('input', update)
  }, [sourceId])

  return (
    <p className="dash-hint">
      Slug: <span className="dash-mono">{preview || '—'}</span>
      {saved && saved !== preview ? ` · saved as ${saved}` : ''}
    </p>
  )
}

export function StringList({ name, label, hint, initial }: { name: string; label: string; hint?: string; initial: string[] }) {
  const [items, setItems] = useState(initial.length ? initial : [''])

  return (
    <fieldset className="dash-stack">
      <legend>{label}</legend>
      {hint ? <p className="dash-hint">{hint}</p> : null}
      <input type="hidden" name={name} value={JSON.stringify(items.map((item) => item.trim()).filter(Boolean))} />
      {items.map((item, index) => (
        <div className="dash-inline" key={`${name}-${index}`}>
          <input
            className="input"
            value={item}
            aria-label={`${label} ${index + 1}`}
            onChange={(event) => setItems(items.map((value, i) => (i === index ? event.target.value : value)))}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setItems(items.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={() => setItems([...items, ''])}>
        Add word
      </button>
    </fieldset>
  )
}
