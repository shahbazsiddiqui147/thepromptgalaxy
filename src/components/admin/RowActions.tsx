'use client'

import React, { useState } from 'react'
import { useConfig } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'

// Custom title-column Cell used across every collection's list view.
// Replaces Payload's default "title as an underlined hyperlink" cell with
// plain text plus explicit Edit / Delete buttons, so the row's clickable
// affordance is obvious without relying on link-styling convention.
export function RowActions({ cellData, collectionSlug, rowData, linkURL }: DefaultCellComponentProps) {
  const { config } = useConfig()
  const { routes, serverURL } = config
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = typeof cellData === 'string' ? cellData : String(cellData ?? rowData?.id ?? '')
  const editHref = linkURL || `/admin/collections/${collectionSlug}/${rowData?.id}`

  async function handleDelete() {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`${serverURL}${routes.api}/${collectionSlug}/${rowData?.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      window.location.reload()
    } catch {
      setError('Delete failed — try again.')
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--theme-text)', fontWeight: 500 }}>{label || '[Untitled]'}</span>
      <a
        href={editHref}
        onClick={(e) => e.stopPropagation()}
        style={{
          fontSize: 12,
          color: 'var(--theme-elevation-600)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 4,
          padding: '2px 8px',
          textDecoration: 'none',
        }}
      >
        Edit
      </a>
      <button
        type="button"
        disabled={deleting}
        onClick={(e) => {
          e.stopPropagation()
          void handleDelete()
        }}
        style={{
          fontSize: 12,
          color: '#B8472A',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 4,
          padding: '2px 8px',
          background: 'none',
          cursor: deleting ? 'default' : 'pointer',
        }}
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span style={{ fontSize: 11, color: 'var(--theme-error-500)' }}>{error}</span>}
    </div>
  )
}
