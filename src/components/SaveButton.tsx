'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type MeResponse = { loggedIn: false } | { loggedIn: true; savedPromptIds: number[] }

// This is a client-component "island" deliberately kept separate from the
// (server, ISR-cached) prompt detail page. It fetches its own auth/saved
// state client-side after the static HTML has loaded, so the page itself
// never touches cookies()/headers() and stays static-generatable.
export function SaveButton({ promptId }: { promptId: number }) {
  const [status, setStatus] = useState<'loading' | 'anonymous' | 'saved' | 'unsaved'>('loading')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/me')
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (cancelled) return
        if (!data.loggedIn) {
          setStatus('anonymous')
        } else {
          setStatus(data.savedPromptIds.includes(promptId) ? 'saved' : 'unsaved')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [promptId])

  const baseStyle = {
    display: 'inline-block',
    borderRadius: 4,
    padding: '8px 14px',
    fontSize: 11,
    letterSpacing: '0.05em',
    cursor: 'pointer',
  } as const

  if (status === 'loading') {
    // Reserve the same footprint so the layout doesn't jump once resolved,
    // without flashing either the logged-out or logged-in state.
    return (
      <div
        className="mono"
        aria-hidden
        style={{
          ...baseStyle,
          border: '1px solid var(--border)',
          color: 'var(--fade)',
          visibility: 'hidden',
        }}
      >
        Save to collection
      </div>
    )
  }

  if (status === 'anonymous') {
    return (
      <Link
        href="/login"
        className="mono"
        style={{
          ...baseStyle,
          border: '1px solid var(--border)',
          background: 'var(--ink-panel)',
          color: 'var(--paper)',
          textDecoration: 'none',
        }}
      >
        Save to collection
      </Link>
    )
  }

  const saved = status === 'saved'

  const toggle = async () => {
    setPending(true)
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId }),
      })
      if (res.ok) {
        const data = (await res.json()) as { saved: boolean }
        setStatus(data.saved ? 'saved' : 'unsaved')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="mono"
      style={{
        ...baseStyle,
        border: `1px solid ${saved ? 'var(--amber)' : 'var(--border)'}`,
        background: 'var(--ink-panel)',
        color: saved ? 'var(--amber)' : 'var(--paper)',
        opacity: pending ? 0.6 : 1,
        cursor: pending ? 'default' : 'pointer',
      }}
    >
      {saved ? 'Saved ✓' : 'Save to collection'}
    </button>
  )
}
