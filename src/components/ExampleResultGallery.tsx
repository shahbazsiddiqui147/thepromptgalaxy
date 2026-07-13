'use client'

import { useState } from 'react'
import Image from 'next/image'

type GalleryResult = {
  imageUrl?: string
  alt: string
  note?: string | null
}

export function ExampleResultGallery({
  referenceRequired,
  results,
  promptTitle,
}: {
  referenceRequired: boolean
  results: GalleryResult[]
  promptTitle: string
}) {
  const [active, setActive] = useState(0)

  if (results.length === 0 && !referenceRequired) return null

  const current = results[active]
  const currentUrl = current?.imageUrl

  return (
    <div style={{ marginTop: 20, marginBottom: 24 }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--fade)', letterSpacing: '0.15em', marginBottom: 10 }}>
        EXAMPLE RESULT
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {referenceRequired && (
          <>
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 4,
                border: '1px dashed var(--border)',
                background: 'var(--ink-panel)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--fade)',
                flexShrink: 0,
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
              <span className="mono" style={{ fontSize: 10, textAlign: 'center', padding: '0 8px' }}>
                your reference photo
              </span>
            </div>
            <span style={{ color: 'var(--fade)', fontSize: 20 }} aria-hidden="true">→</span>
          </>
        )}

        <div
          style={{
            flex: '1 1 260px',
            minWidth: 200,
            maxWidth: 320,
            height: 180,
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--ink-panel)',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span
            className="mono"
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              fontSize: 9,
              letterSpacing: '0.1em',
              color: 'var(--fade)',
              zIndex: 1,
            }}
          >
            EXAMPLE OUTPUT
          </span>
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt={current.alt || promptTitle}
              fill
              sizes="320px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--fade)' }}>example output</span>
            </div>
          )}
        </div>
      </div>

      {results.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {results.map((r, i) =>
            r.imageUrl ? (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show variation ${i + 1}`}
                aria-pressed={i === active}
                style={{
                  width: 44,
                  height: 44,
                  padding: 0,
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  border: i === active ? '2px solid var(--amber)' : '1px solid var(--border)',
                  background: 'var(--ink-panel)',
                }}
              >
                <Image src={r.imageUrl} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
              </button>
            ) : null,
          )}
        </div>
      )}

      {current?.note && (
        <p className="mono" style={{ color: 'var(--fade)', fontSize: 11.5, marginTop: 10 }}>
          {current.note}
        </p>
      )}
    </div>
  )
}
