'use client'

import { useState } from 'react'

export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be unavailable; still flip UI state
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div style={{ position: 'relative' }}>
      <pre
        style={{
          background: 'var(--ink-panel)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '18px 50px 18px 18px',
          color: 'var(--paper)',
          fontSize: 13.5,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          margin: 0,
        }}
      >
        {text}
      </pre>
      <button
        onClick={onCopy}
        title="Copy prompt"
        aria-label={copied ? 'Copied' : 'Copy prompt'}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: copied ? '#3E5A3F' : '#232640',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: 8,
          cursor: 'pointer',
          color: 'var(--paper)',
        }}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  )
}
