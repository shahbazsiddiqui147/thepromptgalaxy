'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: 'Library',
    items: [
      { href: '/dashboard/', label: 'Home' },
      { href: '/dashboard/prompts/', label: 'Prompts' },
      { href: '/dashboard/media/', label: 'Media' },
    ],
  },
  {
    label: 'Taxonomy',
    items: [
      { href: '/dashboard/subjects/', label: 'Subjects' },
      { href: '/dashboard/art-styles/', label: 'Art styles' },
      { href: '/dashboard/tools/', label: 'Tools' },
      { href: '/dashboard/content-types/', label: 'Content types' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/dashboard/customers/', label: 'Customers' },
      { href: '/dashboard/users/', label: 'Users' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/dashboard/site-settings/', label: 'Site settings' },
      { href: '/dashboard/ad-settings/', label: 'Ad settings' },
    ],
  },
]

function normalize(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path
}

function isActive(pathname: string, href: string): boolean {
  const current = normalize(pathname)
  const target = normalize(href)
  if (target === '/dashboard') return current === '/dashboard'
  return current === target || current.startsWith(`${target}/`)
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function DashNav() {
  const pathname = usePathname()

  useEffect(() => {
    const box = document.getElementById('dash-nav') as HTMLInputElement | null
    if (box) box.checked = false
  }, [pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const box = document.getElementById('dash-nav') as HTMLInputElement | null
        if (box) box.checked = false
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        const search = document.getElementById('dash-search')
        if (search instanceof HTMLElement) {
          event.preventDefault()
          search.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <nav className="dash-nav" aria-label="Dashboard">
      {GROUPS.map((group) => (
        <div key={group.label} className="dash-nav-group">
          <p className="dash-nav-label">{group.label}</p>
          {group.items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
