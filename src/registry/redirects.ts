import type { Queryable } from '@/db/pool'

/**
 * Records that `oldPath` now lives at `newPath`. Existing redirects that pointed at `oldPath` are
 * re-pointed (no chains), and a redirect that would loop back is removed.
 */
export async function recordSlugChange(db: Queryable, oldPath: string, newPath: string): Promise<void> {
  if (oldPath === newPath) return
  await db.query('DELETE FROM redirects WHERE from_path = $1', [newPath])
  await db.query('UPDATE redirects SET to_path = $2 WHERE to_path = $1', [oldPath, newPath])
  await db.query(
    `INSERT INTO redirects (from_path, to_path) VALUES ($1, $2)
     ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path`,
    [oldPath, newPath],
  )
}
