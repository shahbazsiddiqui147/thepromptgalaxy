'use client'

import { useEffect, useRef } from 'react'

type Props = { label: string; value: string; onChange: (html: string) => void }

const BUTTONS: { label: string; command: string; arg?: string }[] = [
  { label: 'Bold', command: 'bold' },
  { label: 'Italic', command: 'italic' },
  { label: 'Heading', command: 'formatBlock', arg: '<h2>' },
  { label: 'Subheading', command: 'formatBlock', arg: '<h3>' },
  { label: 'Bullets', command: 'insertUnorderedList' },
  { label: 'Numbers', command: 'insertOrderedList' },
  { label: 'Paragraph', command: 'formatBlock', arg: '<p>' },
  { label: 'Clear', command: 'removeFormat' },
]

export function RichTextField({ label, value, onChange }: Props) {
  const editor = useRef<HTMLDivElement>(null)

  // Set the initial content once; afterwards the browser owns the editable area.
  useEffect(() => {
    if (editor.current) editor.current.innerHTML = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function run(command: string, arg?: string) {
    editor.current?.focus()
    document.execCommand(command, false, arg)
    onChange(editor.current?.innerHTML ?? '')
  }

  function addLink() {
    const url = window.prompt('Link address (https://…)')
    if (url) run('createLink', url)
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="rte-toolbar">
        {BUTTONS.map((button) => (
          <button
            key={button.label}
            type="button"
            className="btn btn-secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(button.command, button.arg)}
          >
            {button.label}
          </button>
        ))}
        <button type="button" className="btn btn-secondary" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>
          Link
        </button>
      </div>
      <div
        ref={editor}
        className="rte input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        onInput={() => onChange(editor.current?.innerHTML ?? '')}
      />
    </div>
  )
}
