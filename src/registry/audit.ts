import type { Queryable } from '@/db/pool'

export async function writeAudit(
  db: Queryable,
  entry: { userId: number | null; entity: string; entityId: number | string | null; action: string; diff?: unknown },
): Promise<void> {
  await db.query('INSERT INTO audit_log (user_id, entity, entity_id, action, diff) VALUES ($1, $2, $3, $4, $5)', [
    entry.userId,
    entry.entity,
    entry.entityId === null ? null : String(entry.entityId),
    entry.action,
    entry.diff === undefined ? null : JSON.stringify(entry.diff),
  ])
}
