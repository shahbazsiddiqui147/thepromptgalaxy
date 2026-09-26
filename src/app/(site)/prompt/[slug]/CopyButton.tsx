'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copy prompt', block = false }: { text: string; label?: string; block?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button type="button" className={`btn btn-primary${block ? ' btn-block' : ''}`} onClick={copy}>
      {state === 'copied' ? 'Copied ✓' : state === 'failed' ? 'Press Ctrl+C to copy' : label}
    </button>
  )
}
