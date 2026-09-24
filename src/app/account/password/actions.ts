'use server'

import { getPool } from '@/db/pool'
import { changePassword } from '@/lib/auth'
import { ROLES } from '@/lib/roles'
import { requireUser } from '@/lib/current-user'
import { readSessionToken } from '@/lib/session-cookie'

export type PasswordState = { error?: string; done?: boolean }

export async function changePasswordAction(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser(ROLES)
  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('next') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (next !== confirm) return { error: 'The new password and its confirmation do not match.' }

  const result = await changePassword(getPool(), user.id, current, next, (await readSessionToken()) ?? undefined)
  return result.ok ? { done: true } : { error: result.error }
}
