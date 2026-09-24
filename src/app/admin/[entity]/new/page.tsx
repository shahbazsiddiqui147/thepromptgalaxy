import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/current-user'
import { getEntity } from '@/registry/entities'
import { defaultsFor } from '@/registry/validate'
import { EntityForm } from '../EntityForm'

export default async function NewEntityPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity: key } = await params
  const entity = getEntity(key)
  if (!entity) notFound()
  await requireUser(entity.roles.write)
  return (
    <>
      <div className="admin-head">
        <h1>New {entity.singular.toLowerCase()}</h1>
      </div>
      <EntityForm entityKey={entity.key} singular={entity.singular} fields={entity.fields} values={defaultsFor(entity)} />
    </>
  )
}
