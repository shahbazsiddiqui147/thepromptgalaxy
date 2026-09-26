import type { Queryable } from '@/db/pool'

/** Normalizes request path segments to the stored form: leading and trailing slash, lower case. */
export function normalizePath(segments: string[]): string {
  const decoded = segments.map((segment) => {
    try {
      return decodeURIComponent(segment).toLowerCase()
    } catch {
      return segment.toLowerCase()
    }
  })
  return '/' + decoded.join('/') + '/'
}

export async function resolveRedirect(db: Queryable, path: string): Promise<{ to: string; status: 301 | 302 } | null> {
  const { rows } = await db.query<{ to_path: string; status_code: 301 | 302 }>(
    'SELECT to_path, status_code FROM redirects WHERE from_path = $1',
    [path],
  )
  return rows[0] ? { to: rows[0].to_path, status: rows[0].status_code } : null
}
