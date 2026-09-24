'use server'

import { redirect } from 'next/navigation'
import { getPool, withTransaction } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { COMBO_FIELDS } from '@/matrix/combo-fields'
import { setStyleLink, setToolLink, updateCombo, type ComboPatch } from '@/matrix/repo'
import { formDataToInput, validateInput } from '@/registry/validate'

const MATRIX_ROLES = ['admin', 'editor'] as const

function back(tab: 'tools' | 'styles', error?: string): never {
  const params = new URLSearchParams()
  if (tab === 'styles') params.set('tab', 'styles')
  if (error) params.set('error', error)
  const query = params.toString()
  redirect(`/admin/matrix/${query ? `?${query}` : ''}`)
}

export async function toggleToolLink(formData: FormData): Promise<void> {
  const user = await requireUser(MATRIX_ROLES)
  const categoryId = Number(formData.get('categoryId'))
  const toolId = Number(formData.get('toolId'))
  const enabled = formData.get('enabled') === 'true'
  if (!Number.isInteger(categoryId) || !Number.isInteger(toolId)) back('tools', 'Invalid request.')
  const result = await withTransaction(getPool(), (tx) => setToolLink(tx, categoryId, toolId, enabled, user.id))
  back('tools', result.ok ? undefined : result.reason)
}

export async function toggleStyleLink(formData: FormData): Promise<void> {
  const user = await requireUser(MATRIX_ROLES)
  const categoryId = Number(formData.get('categoryId'))
  const styleId = Number(formData.get('styleId'))
  const enabled = formData.get('enabled') === 'true'
  if (!Number.isInteger(categoryId) || !Number.isInteger(styleId)) back('styles', 'Invalid request.')
  const result = await withTransaction(getPool(), (tx) => setStyleLink(tx, categoryId, styleId, enabled, user.id))
  back('styles', result.ok ? undefined : result.reason)
}

export async function saveCombo(formData: FormData): Promise<void> {
  const user = await requireUser(MATRIX_ROLES)
  const categoryId = Number(formData.get('categoryId'))
  const toolId = Number(formData.get('toolId'))
  if (!Number.isInteger(categoryId) || !Number.isInteger(toolId)) back('tools', 'Invalid request.')

  const comboPath = `/admin/matrix/combo/${categoryId}/${toolId}/`
  const validated = validateInput({ fields: COMBO_FIELDS }, formDataToInput({ fields: COMBO_FIELDS }, formData))
  if (!validated.ok) {
    redirect(`${comboPath}?error=${encodeURIComponent(Object.values(validated.errors).join(' '))}`)
  }
  const result = await withTransaction(getPool(), (tx) =>
    updateCombo(tx, categoryId, toolId, validated.value as unknown as ComboPatch, user.id),
  )
  if (!result.ok) redirect(`${comboPath}?error=${encodeURIComponent(result.reason)}`)
  back('tools')
}
