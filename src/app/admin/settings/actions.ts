'use server'

import { redirect } from 'next/navigation'
import { getPool, withTransaction } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { saveSettings, SETTING_FIELDS, type SiteSettings } from '@/site/settings'

export type SettingsFormState = { errors: Record<string, string>; values?: Partial<SiteSettings> }

export async function saveSettingsAction(_previous: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await requireUser(['admin', 'editor'])
  const input: Partial<SiteSettings> = {}
  for (const field of SETTING_FIELDS) input[field.key] = String(formData.get(field.key) ?? '')
  const result = await withTransaction(getPool(), (tx) => saveSettings(tx, input, user.id))
  if (!result.ok) return { errors: result.errors, values: input }
  redirect('/admin/settings/?saved=1')
}
