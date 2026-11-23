'use client'

import { useState } from 'react'

type Option = { id: number; name: string; slug: string }

export function SubmitForm({
  subjects,
  tools,
  styles,
}: {
  subjects: Option[]
  tools: Option[]
  styles: Option[]
}) {
  const [styleId, setStyleId] = useState<number | null>(null)
  const [note, setNote] = useState('')

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault()
        // TODO: public submission is not wired to Payload. Nothing is saved.
        setNote('Submission is not connected yet. This form does not publish or store a prompt.')
      }}
    >
      <div className="field">
        <label htmlFor="submit-title">Title</label>
        <input id="submit-title" className="input" name="title" placeholder="Title of the prompt" required />
      </div>

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="submit-category">Category</label>
          <select id="submit-category" className="input" name="subject" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.slug}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="submit-tool">Tool it was tested on</label>
          <select id="submit-tool" className="input" name="tool" required defaultValue="">
            <option value="" disabled>
              Choose a tool
            </option>
            {tools.map((tool) => (
              <option key={tool.id} value={tool.slug}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Art style (optional)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {styles.length === 0 && <span className="tag tag-neutral">No art styles yet</span>}
          {styles.map((style) => {
            const active = styleId === style.id
            return (
              <button
                key={style.id}
                type="button"
                className="tag tag-neutral"
                onClick={() => setStyleId(active ? null : style.id)}
                style={{
                  cursor: 'pointer',
                  background: active ? 'var(--color-accent)' : 'var(--color-neutral-200)',
                  color: active ? 'var(--color-bg)' : 'var(--color-text)',
                  border: 0,
                }}
              >
                {style.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <label htmlFor="submit-text">Prompt text</label>
        <textarea id="submit-text" className="input" name="prompt" rows={5} placeholder="Write the exact prompt, one step per line if it's a chain..." required />
      </div>

      <div className="field">
        <label>Is this a prompt chain?</label>
        <div className="seg" style={{ width: 'fit-content' }}>
          <label className="seg-opt">
            <input type="radio" name="kind" value="single" defaultChecked />
            Single prompt
          </label>
          <label className="seg-opt">
            <input type="radio" name="kind" value="chain" />
            Chain (2+ steps)
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="submit-file">Example output</label>
        <input id="submit-file" className="input" type="file" accept="image/*" />
        <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>Required on the design — upload is not stored yet.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>Reviewed within 48 hours.</span>
        <button type="submit" className="btn btn-primary" style={{ padding: '13px 22px', fontSize: 15 }}>
          Submit for review
        </button>
      </div>
      {note && <p className="form-note">{note}</p>}
    </form>
  )
}
