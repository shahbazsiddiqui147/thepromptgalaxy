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
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 4,
    padding: '8px 14px',
    fontSize: 11,
    letterSpacing: '0.05em',
    cursor: 'pointer',
  } as const

  const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 14c1.5-1.5 3-3.28 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.22 1.5 4 3 5.5l7 7Z" />
    </svg>
  )

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
          border: '1px solid var(--amber)',
          background: 'var(--amber)',
          color: 'var(--ink)',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <HeartIcon filled={false} />
        Save
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
      style={
        saved
          ? {
              ...baseStyle,
              border: '1px solid var(--amber)',
              background: 'transparent',
              color: 'var(--amber)',
              fontWeight: 700,
              opacity: pending ? 0.6 : 1,
              cursor: pending ? 'default' : 'pointer',
            }
          : {
              ...baseStyle,
              border: '1px solid var(--amber)',
              background: 'var(--amber)',
              color: 'var(--ink)',
              fontWeight: 700,
              opacity: pending ? 0.6 : 1,
              cursor: pending ? 'default' : 'pointer',
            }
      }
    >
      <HeartIcon filled={saved} />
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
