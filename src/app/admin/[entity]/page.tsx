import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getEntity } from '@/registry/entities'
import { listRows } from '@/registry/repo'
import type { FieldDef } from '@/registry/types'
import { deleteEntity } from './actions'

function formatCell(field: FieldDef, value: unknown): string {
  if (field.type === 'boolean') return value ? '✓' : '–'
  return String(value ?? '')
}

export default async function EntityListPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { entity: key } = await params
  const entity = getEntity(key)
  if (!entity) notFound()
  const user = await requireUser(entity.roles.read)
  const { error, saved } = await searchParams
  const rows = await listRows(getPool(), entity)
  const columns = entity.fields.filter((field) => field.list)
  const canWrite = entity.roles.write.includes(user.role)

  return (
    <>
      <div className="admin-head">
        <h1>{entity.plural}</h1>
        {canWrite ? (
          <Link className="btn btn-primary" href={`/admin/${entity.key}/new/`}>
            New {entity.singular.toLowerCase()}
          </Link>
        ) : null}
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {saved ? <div className="banner">Saved.</div> : null}
      <table className="table">
        <thead>
          <tr>
            {columns.map((field) => (
              <th key={field.name}>{field.label}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1}>Nothing here yet.</td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((field) => (
                <td key={field.name}>{formatCell(field, row[field.name])}</td>
              ))}
              <td>
                <div className="actions">
                  <Link className="btn btn-secondary" href={`/admin/${entity.key}/${row.id}/`}>
                    Edit
                  </Link>
                  {canWrite ? (
                    <form action={deleteEntity} className="inline-form">
                      <input type="hidden" name="__entity" value={entity.key} />
                      <input type="hidden" name="__id" value={row.id} />
                      <button className="btn btn-ghost" type="submit">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
