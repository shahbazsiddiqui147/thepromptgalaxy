'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { slugify } from '@/lib/autoSlug'
import { savePrompt, type SavePromptState } from '@/lib/dashboard/actions/prompts'
import { searchPrompts } from '@/lib/dashboard/actions/records'
import { htmlToLexical } from '@/components/dashboard/htmlToLexical'
import { ImagePicker } from '@/components/dashboard/ImagePicker'
import { RichTextField } from '@/components/dashboard/RichTextField'
import { ConfirmForm } from '@/components/dashboard/ui'
import { deletePrompt } from '@/lib/dashboard/actions/prompts'
import type { UploadedMedia } from '@/components/dashboard/uploadMedia'

type Choice = { id: number; label: string; slug?: string | null; color?: string | null; usesSteps?: boolean }
type ToolRow = { key: string; id?: string; tool: number | null; fit: 'great' | 'good' }
type StepRow = { key: string; id?: string; label: string; note: string; promptText: string; example: UploadedMedia | null }
type ExampleRow = { key: string; id?: string; image: UploadedMedia | null; note: string }
type FaqRow = { key: string; id?: string; question: string; answer: string }

export type PromptEditorInitial = {
  id?: number
  title: string
  blurb: string
  slug: string | null
  status: 'draft' | 'published'
  subject: number | null
  artStyle: number | null
  contentType: number | null
  tools: { id?: string; tool: number | null; fit: 'great' | 'good' }[]
  cover: UploadedMedia | null
  referenceRequired: boolean
  referenceNote: string
  promptText: string
  steps: { id?: string; label: string; note: string; promptText: string; example: UploadedMedia | null }[]
  examples: { id?: string; image: UploadedMedia | null; note: string }[]
  quickAnswer: string
  articleHeading: string
  articleHtml: string
  articleBody: unknown
  faqs: { id?: string; question: string; answer: string }[]
  similar: { id: number; title: string }[]
  metaTitle: string
  metaDescription: string
  verifiedBy: number | null
  lastVerified: string | null
}

const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'article', label: 'Article' },
  { id: 'related', label: 'Related' },
] as const

type TabId = (typeof TABS)[number]['id']

function key(): string {
  return Math.random().toString(36).slice(2, 10)
}

function withKeys<T extends object>(rows: T[]): (T & { key: string })[] {
  return rows.map((row) => ({ ...row, key: key() }))
}

export function PromptEditor({
  initial,
  subjects,
  artStyles,
  tools,
  contentTypes,
  verifiers,
  clientUploads,
  saved,
}: {
  initial: PromptEditorInitial
  subjects: Choice[]
  artStyles: Choice[]
  tools: Choice[]
  contentTypes: Choice[]
  verifiers: Choice[]
  clientUploads: boolean
  saved?: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const draftRef = useRef<HTMLButtonElement>(null)
  const publishRef = useRef<HTMLButtonElement>(null)
  const payloadRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<TabId>('basics')
  const [title, setTitle] = useState(initial.title)
  const [blurb, setBlurb] = useState(initial.blurb)
  const [subject, setSubject] = useState<number | null>(initial.subject)
  const [artStyle, setArtStyle] = useState<number | null>(initial.artStyle)
  const [contentType, setContentType] = useState<number | null>(initial.contentType)
  const [toolRows, setToolRows] = useState<ToolRow[]>(
    withKeys(initial.tools.length ? initial.tools : [{ tool: null, fit: 'good' }]),
  )
  const [cover, setCover] = useState<UploadedMedia | null>(initial.cover)
  const [referenceRequired, setReferenceRequired] = useState(initial.referenceRequired)
  const [referenceNote, setReferenceNote] = useState(initial.referenceNote)
  const [promptText, setPromptText] = useState(initial.promptText)
  const [steps, setSteps] = useState<StepRow[]>(withKeys(initial.steps))
  const [examples, setExamples] = useState<ExampleRow[]>(withKeys(initial.examples))
  const [quickAnswer, setQuickAnswer] = useState(initial.quickAnswer)
  const [articleHeading, setArticleHeading] = useState(initial.articleHeading)
  const [articleHtml, setArticleHtml] = useState(initial.articleHtml)
  const articleHtmlRef = useRef(initial.articleHtml)
  const articleDirty = useRef(false)
  articleHtmlRef.current = articleHtml
  const [faqs, setFaqs] = useState<FaqRow[]>(withKeys(initial.faqs))
  const [similar, setSimilar] = useState(initial.similar)
  const [similarQuery, setSimilarQuery] = useState('')
  const [similarHits, setSimilarHits] = useState<{ id: number; title: string; status: string }[]>([])
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle)
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription)
  const [verifiedBy, setVerifiedBy] = useState<number | null>(initial.verifiedBy)
  const [intent, setIntent] = useState<'draft' | 'publish' | 'unpublish'>('draft')
  const [state, formAction, pending] = useActionState(savePrompt, {
    error: null,
    message: saved ? 'Saved.' : null,
    slug: initial.slug,
    status: initial.status,
  } satisfies SavePromptState)

  const usesSteps = contentTypes.find((item) => item.id === contentType)?.usesSteps ?? false
  const slugPreview = slugify(title)
  const status = state.status ?? initial.status
  const slug = state.slug ?? initial.slug
  const subjectSlug = subjects.find((item) => item.id === subject)?.slug
  const styleSlug = artStyles.find((item) => item.id === artStyle)?.slug
  const publicHref = status === 'published' && subjectSlug && styleSlug && slug ? `/${subjectSlug}/${styleSlug}/${slug}/` : null

  const snapshot = useMemo(
    () => ({
      title,
      blurb,
      subject,
      artStyle,
      contentType,
      tools: toolRows.map(({ id, tool, fit }) => ({ id, tool, fit })),
      coverImage: cover?.id ?? null,
      referenceRequired,
      referenceNote,
      promptText,
      steps: steps.map(({ id, label, note, promptText: text, example }) => ({
        id,
        label,
        note,
        promptText: text,
        exampleResult: example?.id ?? null,
      })),
      exampleResults: examples.map(({ id, image, note }) => ({ id, image: image?.id ?? null, note })),
      quickAnswer,
      articleHeading,
      faqs: faqs.map(({ id, question, answer }) => ({ id, question, answer })),
      similarPrompts: similar.map((item) => item.id),
      metaTitle,
      metaDescription,
      verifiedBy,
      lastVerified: initial.lastVerified,
    }),
    [
      title,
      blurb,
      subject,
      artStyle,
      contentType,
      toolRows,
      cover,
      referenceRequired,
      referenceNote,
      promptText,
      steps,
      examples,
      quickAnswer,
      articleHeading,
      faqs,
      similar,
      metaTitle,
      metaDescription,
      verifiedBy,
      initial.lastVerified,
    ],
  )
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        setIntent('draft')
        draftRef.current?.click()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        setIntent('publish')
        publishRef.current?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(() => {
      if (!similarQuery.trim()) {
        setSimilarHits([])
        return
      }
      searchPrompts(similarQuery)
        .then((hits) => {
          if (!cancelled) setSimilarHits(hits.filter((hit) => hit.id !== initial.id && !similar.some((item) => item.id === hit.id)))
        })
        .catch(() => {
          if (!cancelled) setSimilarHits([])
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [similarQuery, similar, initial.id])

  return (
    <>
    <form
      ref={formRef}
      action={formAction}
      className="dash-editor"
      onSubmit={() => {
        if (!payloadRef.current) return
        let articleBody: unknown = initial.articleBody
        if (articleDirty.current) {
          try {
            articleBody = htmlToLexical(articleHtmlRef.current)
          } catch {
            articleBody = null
          }
        }
        payloadRef.current.value = JSON.stringify({ ...snapshotRef.current, articleBody })
      }}
    >
      <input ref={payloadRef} type="hidden" name="payload" />
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="dash-savebar">
        <div>
          <span className={status === 'published' ? 'tag tag-accent' : 'tag tag-neutral'}>{status === 'published' ? 'Published' : 'Draft'}</span>
          <span className="dash-mono">{slug || slugPreview || 'slug pending'}</span>
        </div>
        <div className="dash-inline">
          {publicHref ? (
            <Link className="btn btn-secondary" href={publicHref} target="_blank">
              View on site
            </Link>
          ) : null}
          {initial.id ? (
            <a className="btn btn-secondary" href={`/admin/collections/prompts/${initial.id}`}>
              Payload
            </a>
          ) : null}
          <button ref={draftRef} className="btn btn-secondary" type="submit" name="intent" value="draft" disabled={pending} onClick={() => setIntent('draft')}>
            {pending && intent === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
          <button ref={publishRef} className="btn btn-primary" type="submit" name="intent" value="publish" disabled={pending} onClick={() => setIntent('publish')}>
            {pending && intent === 'publish' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
      <p className="dash-hint">Save draft with Ctrl+S or ⌘S. Publish with Ctrl+Enter or ⌘Enter.</p>
      {state.error ? (
        <p className="dash-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="dash-banner" role="status">
          {state.message}
        </p>
      ) : null}

      <div className="dash-tabs" role="tablist" aria-label="Prompt sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            className={tab === item.id ? 'is-on' : undefined}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              const index = TABS.findIndex((entry) => entry.id === item.id)
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                setTab(TABS[(index + 1) % TABS.length].id)
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                setTab(TABS[(index - 1 + TABS.length) % TABS.length].id)
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" id="panel-basics" aria-labelledby="tab-basics" hidden={tab !== 'basics'}>
        <div className="dash-split">
          <div className="dash-stack">
            <div className="field">
              <label htmlFor="prompt-title">Title</label>
              <input id="prompt-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <p className="dash-hint">
                Slug: <span className="dash-mono">{slugPreview || '—'}</span>
                {slug && slug !== slugPreview ? ` · currently ${slug}` : ' · saved from the title'}
              </p>
            </div>
            <div className="field">
              <label htmlFor="prompt-blurb">Blurb</label>
              <textarea id="prompt-blurb" className="input" value={blurb} onChange={(event) => setBlurb(event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="prompt-quick">Quick answer</label>
              <textarea id="prompt-quick" className="input" value={quickAnswer} onChange={(event) => setQuickAnswer(event.target.value)} />
              <p className="dash-hint">One or two sentences shown at the top of the public page.</p>
            </div>
          </div>
          <div className="dash-stack">
            <ChoiceField label="Subject" options={subjects} value={subject} onChange={setSubject} />
            <ChoiceField label="Art style" options={artStyles} value={artStyle} onChange={setArtStyle} />
            <ChoiceField label="Content type" options={contentTypes} value={contentType} onChange={setContentType} />
            <ImagePicker
              label="Cover image"
              hint="Shown on cards and archives. Leave empty to use the color fallback."
              initial={cover}
              clientUploads={clientUploads}
              onChange={(value) => setCover(value.preview)}
            />
          </div>
        </div>
      </section>

      <section role="tabpanel" id="panel-prompt" aria-labelledby="tab-prompt" hidden={tab !== 'prompt'}>
        <div className="dash-stack">
          <label className="dash-check">
            <input type="checkbox" checked={referenceRequired} onChange={(event) => setReferenceRequired(event.target.checked)} />
            Reference photo required
          </label>
          {referenceRequired ? (
            <div className="field">
              <label htmlFor="reference-note">Reference note</label>
              <input id="reference-note" className="input" value={referenceNote} onChange={(event) => setReferenceNote(event.target.value)} placeholder='Face only, outfit only…' />
            </div>
          ) : null}

          <fieldset className="dash-stack">
            <legend>Tools</legend>
            <p className="dash-hint">Which tools this prompt is tested with, and how well each one fits.</p>
            {toolRows.map((row, index) => (
              <div className="dash-inline" key={row.key}>
                <select
                  className="input"
                  aria-label={`Tool ${index + 1}`}
                  value={row.tool ?? ''}
                  onChange={(event) =>
                    setToolRows(toolRows.map((item) => (item.key === row.key ? { ...item, tool: event.target.value ? Number(event.target.value) : null } : item)))
                  }
                >
                  <option value="">Choose a tool</option>
                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.label}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  aria-label={`Fit ${index + 1}`}
                  value={row.fit}
                  onChange={(event) =>
                    setToolRows(toolRows.map((item) => (item.key === row.key ? { ...item, fit: event.target.value === 'great' ? 'great' : 'good' } : item)))
                  }
                >
                  <option value="great">Great fit</option>
                  <option value="good">Good fit</option>
                </select>
                <button type="button" className="btn btn-secondary" onClick={() => setToolRows(toolRows.filter((item) => item.key !== row.key))}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => setToolRows([...toolRows, { key: key(), tool: null, fit: 'good' }])}>
              Add tool
            </button>
          </fieldset>

          {usesSteps ? (
            <fieldset className="dash-stack">
              <legend>Steps</legend>
              <p className="dash-hint">This content type uses an ordered chain instead of one prompt.</p>
              {steps.map((step, index) => (
                <details key={step.key} className="dash-details" open={index === steps.length - 1}>
                  <summary>
                    Step {index + 1}
                    {step.label ? ` · ${step.label}` : ''}
                  </summary>
                  <div className="dash-stack">
                    <div className="dash-split">
                      <div className="field">
                        <label htmlFor={`step-label-${step.key}`}>Label</label>
                        <input id={`step-label-${step.key}`} className="input" value={step.label} onChange={(event) => updateStep(step.key, { label: event.target.value })} />
                      </div>
                      <div className="field">
                        <label htmlFor={`step-note-${step.key}`}>Note</label>
                        <input id={`step-note-${step.key}`} className="input" value={step.note} onChange={(event) => updateStep(step.key, { note: event.target.value })} />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`step-text-${step.key}`}>Prompt text</label>
                      <textarea id={`step-text-${step.key}`} className="input" value={step.promptText} onChange={(event) => updateStep(step.key, { promptText: event.target.value })} />
                    </div>
                    <ImagePicker
                      label="Example result"
                      initial={step.example}
                      clientUploads={clientUploads}
                      onChange={(value) => updateStep(step.key, { example: value.preview })}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setSteps(steps.filter((item) => item.key !== step.key))}>
                      Remove step
                    </button>
                  </div>
                </details>
              ))}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSteps([...steps, { key: key(), label: '', note: '', promptText: '', example: null }])}
              >
                Add step
              </button>
            </fieldset>
          ) : (
            <>
              <div className="field">
                <label htmlFor="prompt-text">Prompt text</label>
                <textarea id="prompt-text" className="input dash-tall" value={promptText} onChange={(event) => setPromptText(event.target.value)} />
              </div>
              <fieldset className="dash-stack">
                <legend>Example results</legend>
                {examples.map((row, index) => (
                  <div className="dash-split" key={row.key}>
                    <ImagePicker
                      label={`Image ${index + 1}`}
                      initial={row.image}
                      clientUploads={clientUploads}
                      onChange={(value) => setExamples(examples.map((item) => (item.key === row.key ? { ...item, image: value.preview } : item)))}
                    />
                    <div className="dash-stack">
                      <div className="field">
                        <label htmlFor={`example-note-${row.key}`}>Note</label>
                        <input
                          id={`example-note-${row.key}`}
                          className="input"
                          value={row.note}
                          onChange={(event) => setExamples(examples.map((item) => (item.key === row.key ? { ...item, note: event.target.value } : item)))}
                        />
                      </div>
                      <button type="button" className="btn btn-secondary" onClick={() => setExamples(examples.filter((item) => item.key !== row.key))}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={() => setExamples([...examples, { key: key(), image: null, note: '' }])}>
                  Add example
                </button>
              </fieldset>
            </>
          )}
        </div>
      </section>

      <section role="tabpanel" id="panel-article" aria-labelledby="tab-article" hidden={tab !== 'article'}>
        <div className="dash-stack">
          <div className="field">
            <label htmlFor="article-heading">Article heading</label>
            <input id="article-heading" className="input" value={articleHeading} onChange={(event) => setArticleHeading(event.target.value)} />
          </div>
          <RichTextField
            html={articleHtml}
            onHtml={(html) => {
              articleDirty.current = true
              setArticleHtml(html)
            }}
          />
          <fieldset className="dash-stack">
            <legend>FAQs</legend>
            <p className="dash-hint">Published as FAQ schema on the public page.</p>
            {faqs.map((faq, index) => (
              <div className="dash-split" key={faq.key}>
                <div className="field">
                  <label htmlFor={`faq-q-${faq.key}`}>Question {index + 1}</label>
                  <input id={`faq-q-${faq.key}`} className="input" value={faq.question} onChange={(event) => setFaqs(faqs.map((item) => (item.key === faq.key ? { ...item, question: event.target.value } : item)))} />
                </div>
                <div className="dash-stack">
                  <div className="field">
                    <label htmlFor={`faq-a-${faq.key}`}>Answer</label>
                    <textarea id={`faq-a-${faq.key}`} className="input" value={faq.answer} onChange={(event) => setFaqs(faqs.map((item) => (item.key === faq.key ? { ...item, answer: event.target.value } : item)))} />
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => setFaqs(faqs.filter((item) => item.key !== faq.key))}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => setFaqs([...faqs, { key: key(), question: '', answer: '' }])}>
              Add FAQ
            </button>
          </fieldset>
        </div>
      </section>

      <section role="tabpanel" id="panel-related" aria-labelledby="tab-related" hidden={tab !== 'related'}>
        <div className="dash-split">
          <div className="dash-stack">
            <fieldset className="dash-stack">
              <legend>Similar prompts</legend>
              <div className="dash-chips">
                {similar.map((item) => (
                  <button key={item.id} type="button" className="pill is-on" onClick={() => setSimilar(similar.filter((row) => row.id !== item.id))}>
                    {item.title} ×
                  </button>
                ))}
              </div>
              <input className="input" value={similarQuery} placeholder="Search prompts" aria-label="Search similar prompts" onChange={(event) => setSimilarQuery(event.target.value)} />
              {similarHits.length > 0 ? (
                <ul className="dash-menu">
                  {similarHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSimilar([...similar, { id: hit.id, title: hit.title }])
                          setSimilarQuery('')
                          setSimilarHits([])
                        }}
                      >
                        {hit.title} <span className="dash-hint">{hit.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </fieldset>
            {initial.id && status === 'published' ? (
              <button className="btn btn-secondary" type="submit" name="intent" value="unpublish" disabled={pending} onClick={() => setIntent('unpublish')}>
                {pending && intent === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
              </button>
            ) : null}
          </div>
          <div className="dash-stack">
            <div className="field">
              <label htmlFor="meta-title">Meta title</label>
              <input id="meta-title" className="input" maxLength={60} value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} />
              <p className="dash-hint">{metaTitle.length}/60 · leave blank to use the title</p>
            </div>
            <div className="field">
              <label htmlFor="meta-description">Meta description</label>
              <textarea id="meta-description" className="input" maxLength={160} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} />
              <p className="dash-hint">{metaDescription.length}/160 · leave blank to use the blurb</p>
            </div>
            <div className="field">
              <label htmlFor="verified-by">Verified by</label>
              <select id="verified-by" className="input" value={verifiedBy ?? ''} onChange={(event) => setVerifiedBy(event.target.value ? Number(event.target.value) : null)}>
                <option value="">Not verified</option>
                {verifiers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </select>
              <p className="dash-hint">
                {initial.lastVerified ? `Last verified ${new Date(initial.lastVerified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. ` : ''}
                Changing the verifier stamps today on save.
              </p>
            </div>
          </div>
        </div>
      </section>
    </form>
      {initial.id ? (
        <div style={{ marginTop: 16 }}>
          <ConfirmForm action={deletePrompt} message="Delete this prompt permanently?" label="Delete prompt" hidden={{ id: String(initial.id) }} />
        </div>
      ) : null}
    </>
  )

  function updateStep(rowKey: string, patch: Partial<StepRow>) {
    setSteps(steps.map((step) => (step.key === rowKey ? { ...step, ...patch } : step)))
  }
}

function ChoiceField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Choice[]
  value: number | null
  onChange: (id: number) => void
}) {
  if (options.length > 12) {
    return (
      <div className="field">
        <label htmlFor={`choice-${label}`}>{label}</label>
        <select id={`choice-${label}`} className="input" value={value ?? ''} onChange={(event) => onChange(Number(event.target.value))}>
          <option value="" disabled>
            Choose
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="dash-pills" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label key={option.id} className={value === option.id ? 'pill is-on' : 'pill'}>
            <input type="radio" name={label} checked={value === option.id} onChange={() => onChange(option.id)} />
            {option.color ? <i style={{ background: option.color }} /> : null}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
