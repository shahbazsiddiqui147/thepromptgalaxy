'use client'

import { useActionState, useMemo, useState } from 'react'
import { slugify } from '@/lib/slug'
import { MediaField } from '@/app/admin/_components/MediaField'
import { RichTextField } from '@/app/admin/_components/RichTextField'
import { PROMPT_STATUSES, type PromptFormState, type PromptInput, type PromptToolInput } from '@/prompts/types'
import { savePromptAction } from './actions'

export type FormOptions = {
  categories: { id: number; name: string; isActive: boolean; supportsStyles: boolean }[]
  tools: { id: number; name: string; isActive: boolean }[]
  styles: { id: number; name: string; isActive: boolean }[]
  toolLinks: { categoryId: number; toolId: number }[]
  styleLinks: { categoryId: number; styleId: number }[]
  similar: { id: number; title: string }[]
}

type Props = {
  id?: number
  initial: PromptInput
  /** True once the prompt has been published: its URL is then locked unless changed on purpose. */
  slugLocked: boolean
  options: FormOptions
}

const initialState: PromptFormState = { errors: {} }

function normalizePrimary(tools: PromptToolInput[]): PromptToolInput[] {
  const index = tools.findIndex((tool) => tool.isPrimary)
  return tools.map((tool, i) => ({ ...tool, isPrimary: i === (index === -1 ? 0 : index) }))
}

export function PromptForm({ id, initial, slugLocked, options }: Props) {
  const [p, setP] = useState<PromptInput>(initial)
  // A new prompt's slug follows the title until it is edited by hand; saved prompts never change on their own.
  const [slugTouched, setSlugTouched] = useState(Boolean(id) || initial.slug !== '')
  const [notice, setNotice] = useState<string | null>(null)
  const [state, action, pending] = useActionState(savePromptAction, initialState)
  const errors = state.errors

  const update = (patch: Partial<PromptInput>) => setP((current) => ({ ...current, ...patch }))

  const category = options.categories.find((c) => c.id === p.categoryId)
  const validToolIds = useMemo(
    () => new Set(options.toolLinks.filter((l) => l.categoryId === p.categoryId).map((l) => l.toolId)),
    [options.toolLinks, p.categoryId],
  )
  const validStyleIds = useMemo(
    () => new Set(options.styleLinks.filter((l) => l.categoryId === p.categoryId).map((l) => l.styleId)),
    [options.styleLinks, p.categoryId],
  )

  function changeCategory(categoryId: number) {
    const tools = new Set(options.toolLinks.filter((l) => l.categoryId === categoryId).map((l) => l.toolId))
    const styles = new Set(options.styleLinks.filter((l) => l.categoryId === categoryId).map((l) => l.styleId))
    const target = options.categories.find((c) => c.id === categoryId)
    const keptTools = p.tools.filter((tool) => tools.has(tool.toolId))
    const keptStyles = target?.supportsStyles ? p.styleIds.filter((s) => styles.has(s)) : []
    const removed = p.tools.length - keptTools.length + (p.styleIds.length - keptStyles.length)
    setNotice(removed > 0 ? `${removed} tool/style choice(s) were removed because they are not available for this category.` : null)
    update({ categoryId, tools: normalizePrimary(keptTools), styleIds: keptStyles })
  }

  function toggleTool(toolId: number) {
    const has = p.tools.some((tool) => tool.toolId === toolId)
    const next = has
      ? p.tools.filter((tool) => tool.toolId !== toolId)
      : [...p.tools, { toolId, fit: 'good' as const, isPrimary: p.tools.length === 0 }]
    update({ tools: normalizePrimary(next) })
  }

  function patchTool(toolId: number, patch: Partial<PromptToolInput>) {
    update({ tools: p.tools.map((tool) => (tool.toolId === toolId ? { ...tool, ...patch } : tool)) })
  }

  function setPrimary(toolId: number) {
    update({ tools: p.tools.map((tool) => ({ ...tool, isPrimary: tool.toolId === toolId })) })
  }

  function moveStep(index: number, delta: number) {
    const steps = [...p.steps]
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    ;[steps[index], steps[target]] = [steps[target], steps[index]]
    update({ steps })
  }

  const visibleTools = options.tools.filter(
    (tool) => validToolIds.has(tool.id) && (tool.isActive || p.tools.some((t) => t.toolId === tool.id)),
  )
  const visibleStyles = options.styles.filter(
    (style) => validStyleIds.has(style.id) && (style.isActive || p.styleIds.includes(style.id)),
  )

  return (
    <form action={action} className="form-grid prompt-form">
      <input type="hidden" name="payload" value={JSON.stringify(p)} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}
      {errors._ ? <div className="banner banner-error">{errors._}</div> : null}

      <h2>Basics</h2>
      <div className="field">
        <label htmlFor="title">Title *</label>
        <input id="title" className="input" value={p.title} maxLength={140} onChange={(e) => update(slugTouched ? { title: e.target.value } : { title: e.target.value, slug: slugify(e.target.value) })} />
        {errors.title ? <div className="field-error">{errors.title}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="slug">URL slug</label>
        <input
          id="slug"
          className="input"
          value={p.slug}
          placeholder="Filled in from the title"
          disabled={slugLocked && !p.changePublishedSlug}
          onChange={(e) => {
            setSlugTouched(true)
            update({ slug: e.target.value })
          }}
        />
        {slugLocked ? (
          <label className="check">
            <input
              type="checkbox"
              checked={p.changePublishedSlug}
              onChange={(e) => update({ changePublishedSlug: e.target.checked })}
            />
            Change the published URL (the old address will redirect)
          </label>
        ) : (
          <div className="field-help">Filled in from the title as you type. Editable until the prompt is first published.</div>
        )}
        {errors.slug ? <div className="field-error">{errors.slug}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="summary">Summary</label>
        <textarea id="summary" className="input" rows={2} value={p.summary} onChange={(e) => update({ summary: e.target.value })} />
        {errors.summary ? <div className="field-error">{errors.summary}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="category">Category *</label>
        <select id="category" className="input" value={p.categoryId} onChange={(e) => changeCategory(Number(e.target.value))}>
          <option value={0}>Choose a category…</option>
          {options.categories
            .filter((c) => c.isActive || c.id === p.categoryId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {errors.categoryId ? <div className="field-error">{errors.categoryId}</div> : null}
        {notice ? <div className="field-help">{notice}</div> : null}
      </div>

      <h2>Tools tested on</h2>
      {p.categoryId === 0 ? <p className="field-help">Choose a category to see its tools.</p> : null}
      {p.categoryId !== 0 && visibleTools.length === 0 ? (
        <p className="field-help">No tools are linked to this category yet. Link them in the Relations matrix.</p>
      ) : null}
      <div className="repeat">
        {visibleTools.map((tool) => {
          const selected = p.tools.find((t) => t.toolId === tool.id)
          return (
            <div key={tool.id} className="repeat-row">
              <label className="check">
                <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleTool(tool.id)} />
                {tool.name}
              </label>
              {selected ? (
                <>
                  <label className="check">
                    <input type="radio" name="primary-tool" checked={selected.isPrimary} onChange={() => setPrimary(tool.id)} />
                    Primary
                  </label>
                  <select
                    className="input"
                    value={selected.fit}
                    aria-label={`Fit for ${tool.name}`}
                    onChange={(e) => patchTool(tool.id, { fit: e.target.value === 'great' ? 'great' : 'good' })}
                  >
                    <option value="great">Great fit</option>
                    <option value="good">Good fit</option>
                  </select>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
      {errors.tools ? <div className="field-error">{errors.tools}</div> : null}

      {category?.supportsStyles && visibleStyles.length > 0 ? (
        <>
          <h2>Art styles</h2>
          <div className="repeat">
            {visibleStyles.map((style) => (
              <label key={style.id} className="check">
                <input
                  type="checkbox"
                  checked={p.styleIds.includes(style.id)}
                  onChange={(e) =>
                    update({ styleIds: e.target.checked ? [...p.styleIds, style.id] : p.styleIds.filter((s) => s !== style.id) })
                  }
                />
                {style.name}
              </label>
            ))}
          </div>
          {errors.styles ? <div className="field-error">{errors.styles}</div> : null}
        </>
      ) : null}

      <h2>Prompt</h2>
      <label className="check">
        <input type="checkbox" checked={p.isChain} onChange={(e) => update({ isChain: e.target.checked })} />
        This is a chain (two or more prompts in sequence)
      </label>
      {p.isChain ? (
        <div className="repeat">
          {p.steps.map((step, index) => (
            <div key={index} className="repeat-row repeat-col">
              <strong>Step {index + 1}</strong>
              <input
                className="input"
                placeholder="Label (optional)"
                value={step.label}
                onChange={(e) => update({ steps: p.steps.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)) })}
              />
              <textarea
                className="input"
                rows={3}
                placeholder="Prompt text"
                value={step.text}
                onChange={(e) => update({ steps: p.steps.map((s, i) => (i === index ? { ...s, text: e.target.value } : s)) })}
              />
              <MediaField
                label="Step result image (optional)"
                value={step.exampleMediaId}
                onChange={(mediaId) => update({ steps: p.steps.map((s, i) => (i === index ? { ...s, exampleMediaId: mediaId } : s)) })}
              />
              <div className="actions">
                <button type="button" className="btn btn-secondary" onClick={() => moveStep(index, -1)}>
                  Up
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => moveStep(index, 1)}>
                  Down
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => update({ steps: p.steps.filter((_, i) => i !== index) })}>
                  Remove step
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => update({ steps: [...p.steps, { label: '', text: '', exampleMediaId: null }] })}
          >
            Add step
          </button>
          {errors.steps ? <div className="field-error">{errors.steps}</div> : null}
        </div>
      ) : (
        <div className="field">
          <label htmlFor="promptText">Prompt text</label>
          <textarea id="promptText" className="input" rows={8} value={p.promptText} onChange={(e) => update({ promptText: e.target.value })} />
          {errors.promptText ? <div className="field-error">{errors.promptText}</div> : null}
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={p.isPremium} onChange={(e) => update({ isPremium: e.target.checked })} />
        Premium prompt
      </label>
      <label className="check">
        <input type="checkbox" checked={p.referenceRequired} onChange={(e) => update({ referenceRequired: e.target.checked })} />
        Needs a reference photo
      </label>
      {p.referenceRequired ? (
        <div className="field">
          <label htmlFor="referenceNote">Reference photo note</label>
          <input id="referenceNote" className="input" value={p.referenceNote} onChange={(e) => update({ referenceNote: e.target.value })} />
        </div>
      ) : null}
      <MediaField label="Example output image (required to publish)" value={p.exampleMediaId} onChange={(mediaId) => update({ exampleMediaId: mediaId })} />
      {errors.exampleMediaId ? <div className="field-error">{errors.exampleMediaId}</div> : null}

      <h2>Content</h2>
      <div className="field">
        <label htmlFor="quickAnswer">Quick answer</label>
        <textarea id="quickAnswer" className="input" rows={3} value={p.quickAnswer} onChange={(e) => update({ quickAnswer: e.target.value })} />
        {errors.quickAnswer ? <div className="field-error">{errors.quickAnswer}</div> : null}
      </div>
      <RichTextField label="Article" value={p.articleHtml} onChange={(html) => update({ articleHtml: html })} />
      {errors.articleHtml ? <div className="field-error">{errors.articleHtml}</div> : null}

      <h2>FAQs</h2>
      <div className="repeat">
        {p.faqs.map((faq, index) => (
          <div key={index} className="repeat-row repeat-col">
            <input
              className="input"
              placeholder="Question"
              value={faq.question}
              onChange={(e) => update({ faqs: p.faqs.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)) })}
            />
            <textarea
              className="input"
              rows={2}
              placeholder="Answer"
              value={faq.answer}
              onChange={(e) => update({ faqs: p.faqs.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)) })}
            />
            <button type="button" className="btn btn-ghost" onClick={() => update({ faqs: p.faqs.filter((_, i) => i !== index) })}>
              Remove FAQ
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => update({ faqs: [...p.faqs, { question: '', answer: '' }] })}>
          Add FAQ
        </button>
        {errors.faqs ? <div className="field-error">{errors.faqs}</div> : null}
      </div>

      <h2>Similar prompts</h2>
      <div className="field">
        <select
          multiple
          size={6}
          className="input"
          aria-label="Similar prompts"
          value={p.similarIds.map(String)}
          onChange={(e) => update({ similarIds: Array.from(e.target.selectedOptions, (option) => Number(option.value)) })}
        >
          {options.similar.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="field-help">Hold Ctrl (or Cmd) to pick several. Only published prompts are listed.</div>
        {errors.similar ? <div className="field-error">{errors.similar}</div> : null}
      </div>

      <h2>Search engines</h2>
      <div className="field">
        <label htmlFor="seoTitle">SEO title</label>
        <input id="seoTitle" className="input" value={p.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })} />
        {errors.seoTitle ? <div className="field-error">{errors.seoTitle}</div> : null}
      </div>
      <div className="field">
        <label htmlFor="seoDescription">SEO description</label>
        <textarea id="seoDescription" className="input" rows={2} value={p.seoDescription} onChange={(e) => update({ seoDescription: e.target.value })} />
        {errors.seoDescription ? <div className="field-error">{errors.seoDescription}</div> : null}
      </div>

      <h2>Publishing</h2>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" className="input" value={p.status} onChange={(e) => update({ status: e.target.value as PromptInput['status'] })}>
          {PROMPT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="actions">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : id ? 'Save changes' : 'Create prompt'}
        </button>
        <a className="btn btn-secondary" href="/admin/prompts/">
          Cancel
        </a>
      </div>
    </form>
  )
}
