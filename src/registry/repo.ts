import type { Queryable } from '@/db/pool'
import { isSlugTaken, slugify, uniqueSlug } from '@/lib/slug'
import { writeAudit } from '@/registry/audit'
import { recordSlugChange } from '@/registry/redirects'
import type { EntityDef } from '@/registry/types'
import { validateInput } from '@/registry/validate'

export type Row = { id: number } & Record<string, unknown>
export type SaveResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> }
export type DeleteResult = { ok: true } | { ok: false; reason: string }

const SLUG_TAKEN = 'This slug is already in use.'

function selectList(entity: EntityDef): string {
  return ['id', ...entity.fields.map((f) => `${f.column} AS "${f.name}"`)].join(', ')
}

function pgCode(error: unknown): string | undefined {
  return (error as { code?: string }).code
}

export async function listRows(db: Queryable, entity: EntityDef): Promise<Row[]> {
  const { rows } = await db.query<Row>(
    `SELECT ${selectList(entity)} FROM ${entity.table} ORDER BY ${entity.orderBy} LIMIT 500`,
  )
  return rows
}

export async function getRow(db: Queryable, entity: EntityDef, id: number): Promise<Row | null> {
  const { rows } = await db.query<Row>(`SELECT ${selectList(entity)} FROM ${entity.table} WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function createRow(
  db: Queryable,
  entity: EntityDef,
  input: Record<string, unknown>,
  actorId: number | null,
): Promise<SaveResult> {
  const validated = validateInput(entity, input)
  if (!validated.ok) return validated
  const value = { ...validated.value }

  const slugField = entity.fields.find((f) => f.type === 'slug')
  if (slugField) {
    const provided = String(value[slugField.name] ?? '')
    if (provided) {
      if (await isSlugTaken(db, entity.table, provided)) {
        return { ok: false, errors: { [slugField.name]: SLUG_TAKEN } }
      }
    } else {
      const source = entity.slugSource ? String(value[entity.slugSource] ?? '') : ''
      value[slugField.name] = await uniqueSlug(db, entity.table, slugify(source))
    }
  }

  const columns = entity.fields.map((f) => f.column)
  const params = entity.fields.map((f) => value[f.name])
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ')
  try {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO ${entity.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      params,
    )
    await writeAudit(db, { userId: actorId, entity: entity.key, entityId: rows[0].id, action: 'create', diff: value })
    return { ok: true, id: rows[0].id }
  } catch (error) {
    if (pgCode(error) === '23514') return { ok: false, errors: { _: (error as Error).message } }
    throw error
  }
}

export async function updateRow(
  db: Queryable,
  entity: EntityDef,
  id: number,
  input: Record<string, unknown>,
  actorId: number | null,
): Promise<SaveResult> {
  const existing = await getRow(db, entity, id)
  if (!existing) return { ok: false, errors: { _: 'Record not found.' } }

  const validated = validateInput(entity, input)
  if (!validated.ok) return validated
  const value = { ...validated.value }

  const slugField = entity.fields.find((f) => f.type === 'slug')
  if (slugField) {
    const provided = String(value[slugField.name] ?? '')
    if (!provided) {
      value[slugField.name] = existing[slugField.name]
    } else if (await isSlugTaken(db, entity.table, provided, id)) {
      return { ok: false, errors: { [slugField.name]: SLUG_TAKEN } }
    }
  }

  const assignments = entity.fields.map((f, i) => `${f.column} = $${i + 1}`).join(', ')
  try {
    await db.query(`UPDATE ${entity.table} SET ${assignments}, updated_at = now() WHERE id = $${entity.fields.length + 1}`, [
      ...entity.fields.map((f) => value[f.name]),
      id,
    ])
  } catch (error) {
    if (pgCode(error) === '23514') return { ok: false, errors: { _: (error as Error).message } }
    throw error
  }

  const diff: Record<string, { from: unknown; to: unknown }> = {}
  for (const field of entity.fields) {
    if (existing[field.name] !== value[field.name]) {
      diff[field.name] = { from: existing[field.name], to: value[field.name] }
    }
  }
  if (slugField && entity.publicPathPrefix && existing[slugField.name] !== value[slugField.name]) {
    await recordSlugChange(
      db,
      `${entity.publicPathPrefix}${existing[slugField.name]}/`,
      `${entity.publicPathPrefix}${value[slugField.name]}/`,
    )
  }
  if (Object.keys(diff).length > 0) {
    await writeAudit(db, { userId: actorId, entity: entity.key, entityId: id, action: 'update', diff })
  }
  return { ok: true, id }
}

export async function deleteRow(
  db: Queryable,
  entity: EntityDef,
  id: number,
  actorId: number | null,
): Promise<DeleteResult> {
  if (entity.usage) {
    const { rows } = await db.query<{ n: number }>(entity.usage.sql, [id])
    const used = rows[0]?.n ?? 0
    if (used > 0) return { ok: false, reason: entity.usage.message(used) }
  }
  const result = await db.query(`DELETE FROM ${entity.table} WHERE id = $1`, [id])
  if (result.rowCount === 0) return { ok: false, reason: 'Record not found.' }
  await writeAudit(db, { userId: actorId, entity: entity.key, entityId: id, action: 'delete' })
  return { ok: true }
}
