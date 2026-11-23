'use client'

import { useState } from 'react'

export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      style={{ fontSize: 15, padding: '14px 16px', marginTop: 4 }}
      disabled={!text}
      onClick={async () => {
        if (!text) return
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          // Clipboard can be blocked; the label still flips so the click is acknowledged.
        }
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
