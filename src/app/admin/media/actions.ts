'use server'

import { redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getUploadsDir } from '@/lib/uploads-dir'
import { deleteMedia, updateAlt } from '@/media/storage'

const MEDIA_ROLES = ['admin', 'editor'] as const

export async function updateAltAction(formData: FormData): Promise<void> {
  await requireUser(MEDIA_ROLES)
  const id = Number(formData.get('id'))
  if (Number.isInteger(id)) await updateAlt(getPool(), id, String(formData.get('alt') ?? ''))
  redirect('/admin/media/?saved=1')
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await requireUser(MEDIA_ROLES)
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) redirect('/admin/media/?error=Invalid%20image.')
  const result = await deleteMedia(getPool(), getUploadsDir(), id)
  redirect(result.ok ? '/admin/media/?saved=1' : `/admin/media/?error=${encodeURIComponent(result.reason)}`)
}
