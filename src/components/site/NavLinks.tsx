'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const RESERVED = new Set([
  'tool',
  'style',
  'search',
  'submit',
  'about',
  'contact',
  'privacy',
  'account',
  'browse',
  'chains',
  'premium',
  'login',
  'register',
  'signup',
  'admin',
  'api',
])

export function NavLinks() {
  const pathname = usePathname() || '/'
  const first = pathname.split('/').filter(Boolean)[0] ?? ''
  const onCategory = first !== '' && !RESERVED.has(first)
  const onTool = first === 'tool'
  const onStyle = first === 'style'

  return (
    <>
      <Link href="/#categories" className="nav-link" aria-current={onCategory ? 'page' : undefined}>
        By category
      </Link>
      <Link href="/tool/" className="nav-link" aria-current={onTool ? 'page' : undefined}>
        By tool
      </Link>
      <Link href="/style/" className="nav-link" aria-current={onStyle ? 'page' : undefined}>
        Styles
      </Link>
    </>
  )
}
