'use server'

import { redirect } from 'next/navigation'
import { getPool, withTransaction } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import type { FormState } from '@/registry/form-state'
import { getEntity } from '@/registry/entities'
import { createRow, deleteRow, updateRow } from '@/registry/repo'
import { formDataToInput } from '@/registry/validate'

export async function saveEntity(_previous: FormState, formData: FormData): Promise<FormState> {
  const entity = getEntity(String(formData.get('__entity') ?? ''))
  if (!entity) return { errors: { _: 'Unknown record type.' } }
  const user = await requireUser(entity.roles.write)

  const idText = String(formData.get('__id') ?? '')
  const input = formDataToInput(entity, formData)
  const result = await withTransaction(getPool(), (tx) =>
    idText ? updateRow(tx, entity, Number(idText), input, user.id) : createRow(tx, entity, input, user.id),
  )
  if (!result.ok) return { errors: result.errors, values: input }

  redirect(`/admin/${entity.key}/?saved=1`)
}

export async function deleteEntity(formData: FormData): Promise<void> {
  const entity = getEntity(String(formData.get('__entity') ?? ''))
  if (!entity) redirect('/admin/')
  const user = await requireUser(entity.roles.write)

  const id = Number(formData.get('__id'))
  if (!Number.isInteger(id)) redirect(`/admin/${entity.key}/?error=${encodeURIComponent('Invalid record.')}`)
  const result = await withTransaction(getPool(), (tx) => deleteRow(tx, entity, id, user.id))
  redirect(
    result.ok
      ? `/admin/${entity.key}/?saved=1`
      : `/admin/${entity.key}/?error=${encodeURIComponent(result.reason)}`,
  )
}
