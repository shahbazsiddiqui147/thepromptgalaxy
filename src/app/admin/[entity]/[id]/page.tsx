import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getStyleMatrix, getToolMatrix } from '@/matrix/repo'
import { getEntity } from '@/registry/entities'
import { getRow } from '@/registry/repo'
import { EntityForm } from '../EntityForm'

async function Relations({ entityKey, id }: { entityKey: string; id: number }) {
  const db = getPool()
  const [toolMatrix, styleMatrix] = await Promise.all([getToolMatrix(db), getStyleMatrix(db)])
  let groups: { title: string; items: string[] }[] = []
  if (entityKey === 'categories') {
    const tools = toolMatrix.links.filter((l) => l.categoryId === id).map((l) => toolMatrix.tools.find((t) => t.id === l.toolId)?.name)
    const styles = styleMatrix.links.filter((l) => l.categoryId === id).map((l) => styleMatrix.styles.find((t) => t.id === l.styleId)?.name)
    groups = [
      { title: 'Tools linked to this category', items: tools.filter((n): n is string => Boolean(n)) },
      { title: 'Art styles linked to this category', items: styles.filter((n): n is string => Boolean(n)) },
    ]
  } else if (entityKey === 'tools' || entityKey === 'styles') {
    const names =
      entityKey === 'tools'
        ? toolMatrix.links.filter((l) => l.toolId === id).map((l) => toolMatrix.categories.find((c) => c.id === l.categoryId)?.name)
        : styleMatrix.links.filter((l) => l.styleId === id).map((l) => styleMatrix.categories.find((c) => c.id === l.categoryId)?.name)
    groups = [{ title: 'Categories this is linked to', items: names.filter((n): n is string => Boolean(n)) }]
  } else {
    return null
  }
  return (
    <div className="relations-panel">
      <h2>Links</h2>
      {groups.map((group) => (
        <p key={group.title}>
          <strong>{group.title}:</strong> {group.items.length > 0 ? group.items.join(', ') : 'none yet'}
        </p>
      ))}
      <Link className="btn btn-secondary" href="/admin/matrix/">
        Manage links in the Relations matrix
      </Link>
    </div>
  )
}

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
      <Relations entityKey={entity.key} id={id} />
      <EntityForm entityKey={entity.key} singular={entity.singular} fields={entity.fields} id={id} values={row} />
    </>
  )
}
