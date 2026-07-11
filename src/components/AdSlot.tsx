'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

type AdSlotProps = {
  html: string
  className?: string
  style?: CSSProperties
}

// Ad-network embed codes (Google AdSense and most others) are an HTML snippet
// containing a <script> tag -- either a remote <script async src="..."> or an
// inline <script>...</script>. Setting that markup via `innerHTML` (which is
// what dangerouslySetInnerHTML does under the hood) parses the tags but the
// browser deliberately does NOT execute any <script> it finds inside markup
// assigned that way. The standard workaround: after the HTML is in the DOM,
// find each inert <script> node and replace it with a freshly-created
// <script> element (same attributes, same inline text) -- elements created
// via document.createElement and inserted into the live DOM DO execute.
export function AdSlot({ html, className, style }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isEmpty = !html || !html.trim()

  useEffect(() => {
    const container = containerRef.current
    if (!container || isEmpty) return

    container.innerHTML = html

    const inertScripts = Array.from(container.querySelectorAll('script'))
    for (const oldScript of inertScripts) {
      const newScript = document.createElement('script')
      for (const attr of Array.from(oldScript.attributes)) {
        newScript.setAttribute(attr.name, attr.value)
      }
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    }
  }, [html, isEmpty])

  // Nothing to show: don't render a visible-but-empty box.
  if (isEmpty) return null

  return <div ref={containerRef} className={className} style={style} />
}
