import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getEntity } from '@/registry/entities'
import { getRow } from '@/registry/repo'
import { EntityForm } from '../EntityForm'

export default async function EditEntityPage({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity: key, id: idText } = await params
  const entity = getEntity(key)
  if (!entity) notFound()
  await requireUser(entity.roles.write)
  const id = Number(idText)
  if (!Number.isInteger(id)) notFound()
  const row = await getRow(getPool(), entity, id)
  if (!row) notFound()
  return (
    <>
      <div className="admin-head">
        <h1>Edit {entity.singular.toLowerCase()}</h1>
      </div>
      <EntityForm entityKey={entity.key} singular={entity.singular} fields={entity.fields} id={id} values={row} />
    </>
  )
}
