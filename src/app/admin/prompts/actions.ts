'use server'

import { redirect } from 'next/navigation'
import { getPool, withTransaction } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { parsePromptPayload } from '@/prompts/input'
import { deletePrompt, savePrompt } from '@/prompts/repo'
import type { PromptFormState } from '@/prompts/types'

const PROMPT_ROLES = ['admin', 'editor'] as const

export async function savePromptAction(_previous: PromptFormState, formData: FormData): Promise<PromptFormState> {
  const user = await requireUser(PROMPT_ROLES)

  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get('payload') ?? ''))
  } catch {
    return { errors: { _: 'The form data could not be read. Reload the page and try again.' } }
  }
  const parsed = parsePromptPayload(raw)
  if (!parsed.ok) return { errors: parsed.errors }

  const idText = String(formData.get('__id') ?? '')
  const id = idText ? Number(idText) : null
  if (id !== null && !Number.isInteger(id)) return { errors: { _: 'Invalid prompt.' } }

  const result = await withTransaction(getPool(), (tx) => savePrompt(tx, id, parsed.value, user.id))
  if (!result.ok) return { errors: result.errors }
  redirect(`/admin/prompts/${result.id}/?saved=1`)
}

export async function deletePromptAction(formData: FormData): Promise<void> {
  const user = await requireUser(PROMPT_ROLES)
  const id = Number(formData.get('__id'))
  if (!Number.isInteger(id)) redirect('/admin/prompts/?error=Invalid%20prompt.')
  const result = await withTransaction(getPool(), (tx) => deletePrompt(tx, id, user.id))
  redirect(result.ok ? '/admin/prompts/?saved=1' : `/admin/prompts/?error=${encodeURIComponent(result.reason)}`)
}
