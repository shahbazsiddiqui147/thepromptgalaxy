'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandMark } from '@/components/site/BrandMark'
import { SocialIcons } from '@/components/site/SocialIcons'

export function AuthBar() {
  const pathname = usePathname() || '/'
  const registering = pathname.startsWith('/register') || pathname.startsWith('/signup')

  return (
    <header className="nav site-header">
      <BrandMark />
      <SocialIcons />
      {registering ? (
        <>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>Already a member?</span>
          <Link href="/login/" className="btn btn-secondary">
            Log in
          </Link>
        </>
      ) : (
        <>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>New here?</span>
          <Link href="/register/" className="btn btn-secondary">
            Create account
          </Link>
        </>
      )}
    </header>
  )
}
