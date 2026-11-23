'use client'

import { useEffect, useRef } from 'react'

function apply(command: string, value?: string) {
  document.execCommand(command, false, value)
}

export function RichTextField({ html, onHtml }: { html: string; onHtml: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current || !ref.current) return
    ref.current.innerHTML = html
    seeded.current = true
  }, [html])

  return (
    <div className="field">
      <span>Article body</span>
      <div className="dash-rte-bar" role="toolbar" aria-label="Article formatting">
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('formatBlock', 'P')}>
          Text
        </button>
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('formatBlock', 'H2')}>
          H2
        </button>
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('formatBlock', 'H3')}>
          H3
        </button>
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('bold')}>
          Bold
        </button>
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('italic')}>
          Italic
        </button>
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertUnorderedList')}>
          List
        </button>
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertOrderedList')}>
          Numbered
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const url = window.prompt('Link URL')
            if (!url) return
            apply('createLink', url)
            onHtml(ref.current?.innerHTML ?? '')
          }}
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        className="dash-rte input"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Article body"
        onInput={() => onHtml(ref.current?.innerHTML ?? '')}
      />
      <p className="dash-hint">Headings, lists, bold, italic, and links. Leave this untouched to keep the original article markup.</p>
    </div>
  )
}
