'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// The header used to call getCurrentCustomer() (cookies()) in the site layout.
// Pages with generateStaticParams are prerendered on demand for unknown slugs,
// and cookies() during that static render throws DYNAMIC_SERVER_USAGE (500)
// until the next deploy includes the slug. This island fetches /api/me after
// hydration so the layout stays static.
export function AccountLink() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((res) => res.json())
      .then((data: { loggedIn?: boolean }) => {
        if (!cancelled) setLoggedIn(Boolean(data.loggedIn))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Link href={loggedIn ? '/account/' : '/login/'} style={{ fontSize: 14, color: 'var(--color-text)', textDecoration: 'none' }}>
      {loggedIn ? 'Account' : 'Log in'}
    </Link>
  )
}
