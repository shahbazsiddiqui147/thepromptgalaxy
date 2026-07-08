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
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: copied ? '#3E5A3F' : '#232640',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: 7,
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
