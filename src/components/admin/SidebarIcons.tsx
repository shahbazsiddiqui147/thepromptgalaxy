'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Payload's Nav component (elements/Nav) has no per-collection icon config in
// this version, and fully overriding admin.components.Nav to add icons would
// mean reimplementing its group/active-link/permission logic ourselves --
// too risky for a cosmetic addition. Instead this augments the EXISTING
// rendered <a> elements after mount: finds each nav link by its stable href,
// and prepends a small inline SVG (lucide icon markup, copied verbatim from
// the installed lucide-react package's own icon source so it's pixel-exact,
// not hand-drawn). `stroke="currentColor"` means each icon automatically
// picks up the same muted/active text color Payload already applies to that
// link -- no extra color logic needed.
//
// Re-runs on every pathname change (not just once on mount) because
// Payload's own React tree can re-render the nav links on navigation, which
// would silently wipe out a one-time DOM injection.

const ICON_SVGS: Record<string, string> = {
  '/admin/collections/users/':
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  '/admin/collections/media/':
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  '/admin/globals/ad-settings/':
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  '/admin/collections/subjects/':
    '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  '/admin/collections/art-styles/':
    '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  '/admin/collections/tools/':
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>',
  '/admin/collections/content-types/':
    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
  '/admin/collections/prompts/':
    '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  '/admin/collections/customers/':
    '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
}

function injectIcons() {
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav__link[href]')
  links.forEach((link) => {
    if (link.querySelector('[data-sidebar-icon]')) return
    const href = link.getAttribute('href')
    const inner = href ? ICON_SVGS[href] : undefined
    if (!inner) return
    const span = document.createElement('span')
    span.setAttribute('data-sidebar-icon', 'true')
    span.style.cssText = 'display:inline-flex;flex-shrink:0;margin-right:8px;width:16px;height:16px;'
    span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
    link.prepend(span)
  })
}

export function SidebarIcons() {
  const pathname = usePathname()

  useEffect(() => {
    injectIcons()
    // Payload's nav can render slightly after this component mounts (its
    // own data/permission fetch); one retry a tick later covers that
    // without needing a full MutationObserver for a cosmetic feature.
    const retry = setTimeout(injectIcons, 300)
    return () => clearTimeout(retry)
  }, [pathname])

  return null
}
