import type { Queryable } from '@/db/pool'

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/

function assertSafeIdentifier(name: string): void {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`)
  }
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

export async function isSlugTaken(
  db: Queryable,
  table: string,
  slug: string,
  excludeId: number | null = null,
): Promise<boolean> {
  assertSafeIdentifier(table)
  const { rows } = await db.query(
    `SELECT 1 FROM ${table} WHERE slug = $1 AND ($2::bigint IS NULL OR id <> $2) LIMIT 1`,
    [slug, excludeId],
  )
  return rows.length > 0
}

export async function uniqueSlug(
  db: Queryable,
  table: string,
  base: string,
  excludeId: number | null = null,
): Promise<string> {
  assertSafeIdentifier(table)
  const root = base || 'item'
  const { rows } = await db.query<{ slug: string }>(
    `SELECT slug FROM ${table} WHERE (slug = $1 OR slug LIKE $2) AND ($3::bigint IS NULL OR id <> $3)`,
    [root, `${root}-%`, excludeId],
  )
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${n}`)) n++
  return `${root}-${n}`
}
