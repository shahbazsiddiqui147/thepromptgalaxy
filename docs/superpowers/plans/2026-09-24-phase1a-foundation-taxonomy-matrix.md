# Phase 1A — Foundation, Auth, Generic Admin, Taxonomy + Relation Matrix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Payload codebase with a custom Next.js + PostgreSQL application that has working admin login, a registry-driven admin for categories/tools/styles, and the dynamic category × tool and category × style relation matrix with database-enforced rules and live counts.

**Architecture:** One Next.js App Router app. Plain `pg` with versioned SQL migrations. Domain rules (valid tool/style per category, one primary tool, "styles supported" flag) live in the database as composite foreign keys, a partial unique index and triggers. A small registry (`EntityDef`) describes each taxonomy entity once; generic repository functions and generic admin screens are built from it. The matrix has its own repository and screens.

**Tech Stack:** Next.js 16.2.10 (App Router, server components and server actions), React 19.2.7, TypeScript 6.0.3, `pg` 8, Vitest 3, `tsx`, PostgreSQL 16/17, the Modernist stylesheet from the Claude Design export.

**Spec:** `docs/superpowers/specs/2026-09-24-custom-cms-rebuild-design.md`

## Plan series

Phase 1 of the spec is split into four plans, each ending in working, tested software:

- **1A (this plan):** foundation, auth, generic admin, taxonomy, relation matrix.
- **1B:** media library, prompts (single and chain), prompt admin with tool/style pickers, FAQs, similar prompts.
- **1C:** public site (home blocks, hubs, prompt page, search, redirect serving, cache tags), pages, menus, site settings, homepage builder.
- **1D:** deployment, backups, rate limits, go-live.

## Out of scope for 1A

Media uploads, prompt CRUD screens, public pages, saves, submissions, contact form, rate limiting, password reset, deployment. The database tables for prompts are created here only so the relation rules can be enforced and tested now.

## Conventions

- Work happens on branch `rebuild/custom-cms` in the main working folder `F:/Shahbaz/thepromptgalaxy` (no git worktree; a fresh `pnpm install` in a new worktree takes 15-30 minutes on this machine).
- Shell commands are for Git Bash. Run them from `F:/Shahbaz/thepromptgalaxy`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (added as a second `-m`).
- Database tests use the database named in `TEST_DATABASE_URL`; the helper refuses to run unless the database name contains `test`.
- `pnpm test` runs Vitest once. `pnpm typecheck` runs `tsc --noEmit`.

## File structure (created by this plan)

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, .env.example
docs/dev-setup.md
scripts/migrate.ts, scripts/create-admin.ts
src/db/init-types.ts        int8 -> number parser
src/db/pool.ts              pool singleton, Queryable type, withTransaction
src/db/migrate.ts           migration runner
src/db/migrations/0001_identity.sql .. 0004_redirects.sql
src/lib/env.ts, roles.ts, slug.ts, password.ts, users.ts, session.ts, auth.ts,
        session-cookie.ts, current-user.ts, safe-next.ts
src/registry/types.ts, validate.ts, entities.ts, audit.ts, redirects.ts, repo.ts, form-state.ts
src/matrix/repo.ts, combo-fields.ts
src/test/setup-env.ts, src/test/db.ts
src/styles/modernist.css, src/styles/admin.css
src/app/layout.tsx, fonts.ts, page.tsx
src/app/login/page.tsx, LoginForm.tsx, actions.ts
src/app/admin/layout.tsx, page.tsx
src/app/admin/[entity]/page.tsx, new/page.tsx, [id]/page.tsx, EntityForm.tsx, actions.ts
src/app/admin/matrix/page.tsx, actions.ts, combo/[categoryId]/[toolId]/page.tsx
(+ a *.test.ts next to each tested module)
```

---

### Task 1: Branch, remove Payload, scaffold the new project

**Files:**
- Delete: `src/`, `scripts/`, `ecosystem.config.cjs` (old Payload code, kept in git history under tag `payload-final`)
- Create/replace: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`
- Modify: `.gitignore`
- Create: `src/lib/env.ts`

- [ ] **Step 1: Tag the old code and create the branch**

```bash
git status --porcelain
```
Expected: only untracked entries (`?? .claude/`, `?? .playwright-mcp/`, `?? docs/superpowers/handoff-2026-07-13.md`).

```bash
git tag payload-final
git checkout -b rebuild/custom-cms
```
Expected: `Switched to a new branch 'rebuild/custom-cms'`.

- [ ] **Step 2: Remove the Payload-era code**

```bash
git rm -r -q src scripts ecosystem.config.cjs
rm -rf .next tsconfig.tsbuildinfo
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "thepromptgalaxy",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.9",
  "engines": {
    "node": ">=20.19"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "migrate": "node --env-file=.env --import tsx scripts/migrate.ts",
    "create-admin": "node --env-file=.env --import tsx scripts/create-admin.ts"
  },
  "dependencies": {
    "next": "16.2.10",
    "pg": "^8.13.1",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "sharp": "0.35.3"
  },
  "devDependencies": {
    "@types/node": "24.12.3",
    "@types/pg": "^8.11.10",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "tsx": "4.22.4",
    "typescript": "6.0.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "target": "ES2022"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Write `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg', 'sharp'],
}

export default nextConfig
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

- [ ] **Step 7: Write `.env.example`**

```
# Local development database (see docs/dev-setup.md)
DATABASE_URL=postgresql://galaxy:galaxy_dev_pw@localhost:5432/promptgalaxy_dev
# Used only by `pnpm test`. The database name MUST contain "test".
TEST_DATABASE_URL=postgresql://galaxy:galaxy_dev_pw@localhost:5432/promptgalaxy_test
```

- [ ] **Step 8: Append to `.gitignore`**

Append these lines at the end of `.gitignore`:

```
# uploads (media plan 1B)
/uploads
.playwright-mcp/
```

- [ ] **Step 9: Write `src/lib/env.ts`**

```ts
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
```

Also create the empty test setup file so Vitest can start (it is filled in Task 3):

```bash
mkdir -p src/test
```

Write `src/test/setup-env.ts`:

```ts
import { existsSync } from 'node:fs'

// Vitest does not load .env by itself; the DB tests need TEST_DATABASE_URL.
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}
```

- [ ] **Step 10: Install dependencies**

Run in the background (slow on this machine, expect several minutes):

```bash
pnpm install
```
Expected: ends with `Done in ...` (pnpm 9 runs the `sharp` and `esbuild` install scripts automatically).

- [ ] **Step 11: Verify the toolchain**

```bash
pnpm typecheck
pnpm test
```
Expected: `tsc` exits 0 (it type-checks `src/lib/env.ts`, `src/test/setup-env.ts`, `vitest.config.ts`); Vitest prints `No test files found, exiting with code 0`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: remove Payload code and scaffold the custom Next.js + pg project" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Local development and test databases

**Files:**
- Create: `docs/dev-setup.md`
- Create (not committed): `.env`

The machine has PostgreSQL 17 running as a Windows service on `localhost:5432`. This task creates a role and two databases. It needs the local `postgres` superuser password from the owner; if the owner supplies it, export it as `PGPASSWORD` for the commands below.

- [ ] **Step 1: Create the role and databases**

```bash
PSQL="/c/Program Files/PostgreSQL/17/bin/psql.exe"
"$PSQL" -U postgres -h localhost -c "CREATE ROLE galaxy LOGIN PASSWORD 'galaxy_dev_pw' CREATEDB;"
"$PSQL" -U postgres -h localhost -c "CREATE DATABASE promptgalaxy_dev OWNER galaxy;"
"$PSQL" -U postgres -h localhost -c "CREATE DATABASE promptgalaxy_test OWNER galaxy;"
```
Expected: `CREATE ROLE`, `CREATE DATABASE`, `CREATE DATABASE`. (If the role already exists, skip the first command.)

- [ ] **Step 2: Create `.env` from the example**

```bash
cp .env.example .env
```

- [ ] **Step 3: Verify both databases accept the app role**

```bash
PSQL="/c/Program Files/PostgreSQL/17/bin/psql.exe"
"$PSQL" "postgresql://galaxy:galaxy_dev_pw@localhost:5432/promptgalaxy_test" -tc "select 1"
"$PSQL" "postgresql://galaxy:galaxy_dev_pw@localhost:5432/promptgalaxy_dev" -tc "select 1"
```
Expected: each prints ` 1`.

- [ ] **Step 4: Write `docs/dev-setup.md`**

```markdown
# Local development setup

1. Node 20.19+ and pnpm 9 (`corepack enable`).
2. PostgreSQL 16 or 17 running locally. Create a role and two databases:

   ```sql
   CREATE ROLE galaxy LOGIN PASSWORD 'galaxy_dev_pw' CREATEDB;
   CREATE DATABASE promptgalaxy_dev OWNER galaxy;
   CREATE DATABASE promptgalaxy_test OWNER galaxy;
   ```
3. `cp .env.example .env` and adjust the URLs if you changed the role or password.
4. `pnpm install`
5. `pnpm migrate` applies migrations to the dev database.
6. `pnpm create-admin --email you@example.com --password 'a-long-password' --name 'Your Name' --handle yourhandle`
7. `pnpm dev`, then open http://localhost:3000/login/
8. `pnpm test` runs the suite against `TEST_DATABASE_URL` (the database name must contain `test`).

Production uses a different database (`promptgalaxy_prod` on the VPS). Never point `DATABASE_URL` at production from a development machine.
```

- [ ] **Step 5: Commit**

```bash
git add docs/dev-setup.md
git commit -m "docs: add local development setup guide" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Database pool and test helpers

**Files:**
- Create: `src/db/init-types.ts`, `src/db/pool.ts`, `src/test/db.ts`

- [ ] **Step 1: Write `src/db/init-types.ts`**

```ts
import pg from 'pg'

// bigserial ids and count(*) arrive as strings by default. Ids in this app stay far below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => Number(value))
```

- [ ] **Step 2: Write `src/db/pool.ts`**

```ts
import pg from 'pg'
import '@/db/init-types'
import { requireEnv } from '@/lib/env'

/** Anything that can run a query: the pool, or a client inside a transaction. */
export type Queryable = Pick<pg.Pool, 'query'>

const globalForPool = globalThis as unknown as { __galaxyPool?: pg.Pool }

export function getPool(): pg.Pool {
  if (!globalForPool.__galaxyPool) {
    globalForPool.__galaxyPool = new pg.Pool({
      connectionString: requireEnv('DATABASE_URL'),
      max: 10,
    })
  }
  return globalForPool.__galaxyPool
}

export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (tx: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

- [ ] **Step 3: Write `src/test/db.ts`**

```ts
import path from 'node:path'
import pg from 'pg'
import '@/db/init-types'
import { runMigrations } from '@/db/migrate'

let pool: pg.Pool | null = null

export function testPool(): pg.Pool {
  if (!pool) {
    const url = process.env.TEST_DATABASE_URL
    if (!url) {
      throw new Error('TEST_DATABASE_URL is required to run database tests (see docs/dev-setup.md)')
    }
    const dbName = new URL(url).pathname
    if (!/test/i.test(dbName)) {
      throw new Error(`Refusing to run tests against "${dbName}": the database name must contain "test"`)
    }
    pool = new pg.Pool({ connectionString: url, max: 4 })
  }
  return pool
}

export async function dropEverything(): Promise<pg.Pool> {
  const p = testPool()
  await p.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  return p
}

export async function resetDb(): Promise<pg.Pool> {
  const p = await dropEverything()
  await runMigrations(p, path.resolve('src/db/migrations'))
  return p
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
```

`runMigrations` is created in Task 4, so `pnpm typecheck` will fail on the import until then. That is expected.

- [ ] **Step 5: Commit (after Task 4 makes typecheck pass, commit both together)**

No commit yet. Continue to Task 4.

---

### Task 4: Migration runner (TDD)

**Files:**
- Create: `src/db/migrate.ts`, `scripts/migrate.ts`
- Test: `src/db/migrate.test.ts`

- [ ] **Step 1: Write the failing test `src/db/migrate.test.ts`**

```ts
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '@/db/migrate'
import { closeTestPool, dropEverything } from '@/test/db'

async function makeDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'galaxy-mig-'))
  for (const [name, sql] of Object.entries(files)) {
    await writeFile(path.join(dir, name), sql)
  }
  return dir
}

describe('runMigrations', () => {
  beforeEach(async () => {
    await dropEverything()
  })
  afterAll(closeTestPool)

  it('applies pending files in name order and records them', async () => {
    const pool = await dropEverything()
    const dir = await makeDir({
      '002_b.sql': 'CREATE TABLE b (id int);',
      '001_a.sql': 'CREATE TABLE a (id int);',
    })
    try {
      const ran = await runMigrations(pool, dir)
      expect(ran).toEqual(['001_a.sql', '002_b.sql'])
      const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name')
      expect(rows.map((r) => r.name)).toEqual(['001_a.sql', '002_b.sql'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('skips files that were already applied', async () => {
    const pool = await dropEverything()
    const dir = await makeDir({ '001_a.sql': 'CREATE TABLE a (id int);' })
    try {
      await runMigrations(pool, dir)
      const second = await runMigrations(pool, dir)
      expect(second).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('rolls back a failing file and does not record it', async () => {
    const pool = await dropEverything()
    const dir = await makeDir({
      '001_ok.sql': 'CREATE TABLE ok_table (id int);',
      '002_bad.sql': 'CREATE TABLE half_table (id int); SELECT * FROM does_not_exist;',
    })
    try {
      await expect(runMigrations(pool, dir)).rejects.toThrow(/002_bad\.sql/)
      const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name')
      expect(rows.map((r) => r.name)).toEqual(['001_ok.sql'])
      const half = await pool.query(`SELECT to_regclass('half_table') AS t`)
      expect(half.rows[0].t).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test src/db/migrate.test.ts
```
Expected: FAIL — cannot resolve `@/db/migrate`.

- [ ] **Step 3: Write `src/db/migrate.ts`**

```ts
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type pg from 'pg'

/**
 * Applies every *.sql file in `dir` (sorted by name) that is not yet recorded in
 * schema_migrations. Each file runs in its own transaction. Returns the names applied.
 */
export async function runMigrations(pool: pg.Pool, dir: string): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.name))
  const ran: string[] = []

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(dir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      ran.push(file)
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`)
    } finally {
      client.release()
    }
  }
  return ran
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm test src/db/migrate.test.ts
```
Expected: 3 passed.

- [ ] **Step 5: Write `scripts/migrate.ts`**

```ts
import path from 'node:path'
import { getPool } from '../src/db/pool'
import { runMigrations } from '../src/db/migrate'

const pool = getPool()
try {
  const ran = await runMigrations(pool, path.resolve('src/db/migrations'))
  console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'No pending migrations')
} finally {
  await pool.end()
}
```

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm typecheck
```
Expected: exits 0.

```bash
git add src/db src/test scripts/migrate.ts
git commit -m "feat(db): add pg pool, migration runner and test database helpers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Core schema migrations with database-level rules (TDD)

**Files:**
- Create: `src/db/migrations/0001_identity.sql`, `0002_taxonomy.sql`, `0003_prompts_core.sql`, `0004_redirects.sql`
- Test: `src/db/constraints.test.ts`, `src/db/pool.test.ts`

- [ ] **Step 1: Write the failing test `src/db/constraints.test.ts`**

```ts
import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Pool
let ids: { portrait: number; travel: number; mj: number; gpt: number; cinematic: number; promptId: number }

async function one(sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(sql, params)
  return rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
  const portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  const travel = await one(`INSERT INTO categories (slug, name) VALUES ('travel', 'Travel') RETURNING id`)
  const mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney', 'Midjourney') RETURNING id`)
  const gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt', 'ChatGPT') RETURNING id`)
  const cinematic = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)
  await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [portrait, mj])
  const promptId = await one(
    `INSERT INTO prompts (slug, title, category_id, status) VALUES ('p1', 'P1', $1, 'published') RETURNING id`,
    [portrait],
  )
  ids = { portrait, travel, mj, gpt, cinematic, promptId }
})
afterAll(closeTestPool)

const attachTool = (toolId: number, opts: { categoryId?: number; primary?: boolean } = {}) =>
  pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary) VALUES ($1, $2, $3, $4)', [
    ids.promptId,
    opts.categoryId ?? ids.portrait,
    toolId,
    opts.primary ?? false,
  ])

const attachStyle = (styleId: number) =>
  pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [
    ids.promptId,
    ids.portrait,
    styleId,
  ])

describe('prompt tools', () => {
  it('accepts a tool that is linked to the prompt category', async () => {
    await expect(attachTool(ids.mj, { primary: true })).resolves.toBeDefined()
  })

  it('rejects a tool that is not linked to the prompt category', async () => {
    await expect(attachTool(ids.gpt)).rejects.toMatchObject({ code: '23503' })
  })

  it('allows only one primary tool per prompt', async () => {
    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [ids.portrait, ids.gpt])
    await attachTool(ids.mj, { primary: true })
    await expect(attachTool(ids.gpt, { primary: true })).rejects.toMatchObject({ code: '23505' })
  })

  it('blocks removing a category-tool pair that a prompt uses', async () => {
    await attachTool(ids.mj, { primary: true })
    await expect(
      pool.query('DELETE FROM category_tools WHERE category_id = $1 AND tool_id = $2', [ids.portrait, ids.mj]),
    ).rejects.toMatchObject({ code: '23503' })
  })

  it('cascades a category change onto prompt_tools when the tool is valid for the new category', async () => {
    await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1, $2)', [ids.travel, ids.mj])
    await attachTool(ids.mj, { primary: true })
    await pool.query('UPDATE prompts SET category_id = $1 WHERE id = $2', [ids.travel, ids.promptId])
    const { rows } = await pool.query('SELECT category_id FROM prompt_tools WHERE prompt_id = $1', [ids.promptId])
    expect(rows[0].category_id).toBe(ids.travel)
  })

  it('rejects a category change when an attached tool is not valid for the new category', async () => {
    await attachTool(ids.mj, { primary: true })
    await expect(
      pool.query('UPDATE prompts SET category_id = $1 WHERE id = $2', [ids.travel, ids.promptId]),
    ).rejects.toMatchObject({ code: '23503' })
  })
})

describe('prompt styles', () => {
  it('rejects a style that is not linked to the prompt category', async () => {
    await expect(attachStyle(ids.cinematic)).rejects.toMatchObject({ code: '23503' })
  })

  it('accepts a linked style', async () => {
    await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [ids.portrait, ids.cinematic])
    await expect(attachStyle(ids.cinematic)).resolves.toBeDefined()
  })

  it('refuses to link styles to a category that does not support styles', async () => {
    await pool.query('UPDATE categories SET supports_styles = false WHERE id = $1', [ids.travel])
    await expect(
      pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [ids.travel, ids.cinematic]),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('refuses to turn styles off while prompts in the category use them', async () => {
    await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [ids.portrait, ids.cinematic])
    await attachStyle(ids.cinematic)
    await expect(
      pool.query('UPDATE categories SET supports_styles = false WHERE id = $1', [ids.portrait]),
    ).rejects.toMatchObject({ code: '23514' })
  })
})

describe('deletion', () => {
  it('blocks deleting a category that has prompts', async () => {
    await expect(pool.query('DELETE FROM categories WHERE id = $1', [ids.portrait])).rejects.toMatchObject({
      code: '23503',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test src/db/constraints.test.ts
```
Expected: FAIL — `relation "categories" does not exist` (no migrations yet).

- [ ] **Step 3: Write `src/db/migrations/0001_identity.sql`**

```sql
CREATE TABLE users (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  handle text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'moderator', 'member')),
  is_premium boolean NOT NULL DEFAULT false,
  is_disabled boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
CREATE UNIQUE INDEX users_handle_lower_idx ON users (lower(handle));

CREATE TABLE sessions (
  id bigserial PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users (id) ON DELETE SET NULL,
  entity text NOT NULL,
  entity_id text,
  action text NOT NULL,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id);
```

- [ ] **Step 4: Write `src/db/migrations/0002_taxonomy.sql`**

```sql
CREATE TABLE categories (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  supports_styles boolean NOT NULL DEFAULT true,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tools (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  vendor text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE styles (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE category_tools (
  category_id bigint NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  tool_id bigint NOT NULL REFERENCES tools (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_indexable boolean NOT NULL DEFAULT false,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, tool_id)
);

CREATE TABLE category_styles (
  category_id bigint NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  style_id bigint NOT NULL REFERENCES styles (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, style_id)
);
```

- [ ] **Step 5: Write `src/db/migrations/0003_prompts_core.sql`**

```sql
CREATE TABLE prompts (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category_id bigint NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  prompt_text text NOT NULL DEFAULT '',
  is_chain boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  reference_required boolean NOT NULL DEFAULT false,
  reference_note text NOT NULL DEFAULT '',
  article_html text NOT NULL DEFAULT '',
  quick_answer text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
  rejection_reason text NOT NULL DEFAULT '',
  author_id bigint REFERENCES users (id) ON DELETE SET NULL,
  reviewed_by bigint REFERENCES users (id) ON DELETE SET NULL,
  published_at timestamptz,
  save_count integer NOT NULL DEFAULT 0,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, category_id)
);
CREATE INDEX prompts_status_idx ON prompts (status);
CREATE INDEX prompts_category_idx ON prompts (category_id);

-- A prompt may only use tools that are valid for its category. The composite foreign keys make the
-- database enforce it, including when the prompt's category changes (ON UPDATE CASCADE re-checks the pair).
CREATE TABLE prompt_tools (
  prompt_id bigint NOT NULL,
  category_id bigint NOT NULL,
  tool_id bigint NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  fit text NOT NULL DEFAULT 'good' CHECK (fit IN ('great', 'good')),
  PRIMARY KEY (prompt_id, tool_id),
  FOREIGN KEY (prompt_id, category_id) REFERENCES prompts (id, category_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id, tool_id) REFERENCES category_tools (category_id, tool_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX prompt_tools_one_primary_idx ON prompt_tools (prompt_id) WHERE is_primary;
CREATE INDEX prompt_tools_tool_idx ON prompt_tools (tool_id);

CREATE TABLE prompt_styles (
  prompt_id bigint NOT NULL,
  category_id bigint NOT NULL,
  style_id bigint NOT NULL,
  PRIMARY KEY (prompt_id, style_id),
  FOREIGN KEY (prompt_id, category_id) REFERENCES prompts (id, category_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id, style_id) REFERENCES category_styles (category_id, style_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX prompt_styles_style_idx ON prompt_styles (style_id);

-- Rule: styles can only be linked to categories that support styles.
CREATE FUNCTION enforce_category_supports_styles() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND supports_styles) THEN
    RAISE EXCEPTION 'This category does not support styles' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_styles_supported BEFORE INSERT OR UPDATE ON category_styles
  FOR EACH ROW EXECUTE FUNCTION enforce_category_supports_styles();
CREATE TRIGGER prompt_styles_supported BEFORE INSERT OR UPDATE ON prompt_styles
  FOR EACH ROW EXECUTE FUNCTION enforce_category_supports_styles();

-- Rule: styles cannot be switched off for a category while prompts in it still use styles.
CREATE FUNCTION forbid_disabling_styles_in_use() RETURNS trigger AS $$
BEGIN
  IF OLD.supports_styles AND NOT NEW.supports_styles
     AND EXISTS (SELECT 1 FROM prompt_styles WHERE category_id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot turn off styles: prompts in this category still use styles' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_styles_in_use BEFORE UPDATE OF supports_styles ON categories
  FOR EACH ROW EXECUTE FUNCTION forbid_disabling_styles_in_use();
```

- [ ] **Step 6: Write `src/db/migrations/0004_redirects.sql`**

```sql
CREATE TABLE redirects (
  id bigserial PRIMARY KEY,
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_path <> to_path)
);
```

- [ ] **Step 7: Run the constraint tests**

```bash
pnpm test src/db/constraints.test.ts
```
Expected: 11 passed.

- [ ] **Step 8: Write `src/db/pool.test.ts`**

```ts
import { afterAll, describe, expect, it } from 'vitest'
import { withTransaction } from '@/db/pool'
import { closeTestPool, resetDb } from '@/test/db'

afterAll(closeTestPool)

describe('withTransaction', () => {
  it('commits on success and rolls back when the callback throws', async () => {
    const pool = await resetDb()
    await withTransaction(pool, (tx) => tx.query(`INSERT INTO audit_log (entity, action) VALUES ('t', 'ok')`))
    await expect(
      withTransaction(pool, async (tx) => {
        await tx.query(`INSERT INTO audit_log (entity, action) VALUES ('t', 'bad')`)
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    const { rows } = await pool.query('SELECT action FROM audit_log ORDER BY id')
    expect(rows.map((r) => r.action)).toEqual(['ok'])
  })
})
```

- [ ] **Step 9: Run it and the whole suite**

```bash
pnpm test
```
Expected: all tests pass (3 + 11 + 1).

- [ ] **Step 10: Apply migrations to the dev database and commit**

```bash
pnpm migrate
```
Expected: `Applied: 0001_identity.sql, 0002_taxonomy.sql, 0003_prompts_core.sql, 0004_redirects.sql`.

```bash
git add src/db
git commit -m "feat(db): add identity, taxonomy, prompt-core and redirect migrations with enforced relation rules" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Slug utilities (TDD)

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/slug.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { isSlugTaken, slugify, uniqueSlug } from '@/lib/slug'
import { closeTestPool, resetDb } from '@/test/db'

describe('slugify', () => {
  it('lower-cases and hyphenates', () => {
    expect(slugify('Studio Headshot, 85mm')).toBe('studio-headshot-85mm')
  })
  it('strips accents and expands ampersands', () => {
    expect(slugify('Café & Bar')).toBe('cafe-and-bar')
  })
  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('   !!! ')).toBe('')
  })
  it('caps the length at 80 characters without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(79)} bbb`)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('database slug helpers', () => {
  let pool: Awaited<ReturnType<typeof resetDb>>
  beforeEach(async () => {
    pool = await resetDb()
    await pool.query(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait'), ('portrait-2', 'Portrait 2')`)
  })
  afterAll(closeTestPool)

  it('finds a taken slug and ignores the excluded id', async () => {
    expect(await isSlugTaken(pool, 'categories', 'portrait')).toBe(true)
    expect(await isSlugTaken(pool, 'categories', 'nope')).toBe(false)
    const { rows } = await pool.query<{ id: number }>(`SELECT id FROM categories WHERE slug = 'portrait'`)
    expect(await isSlugTaken(pool, 'categories', 'portrait', rows[0].id)).toBe(false)
  })

  it('appends the next free numeric suffix', async () => {
    expect(await uniqueSlug(pool, 'categories', 'portrait')).toBe('portrait-3')
    expect(await uniqueSlug(pool, 'categories', 'travel')).toBe('travel')
  })

  it('falls back to "item" for an empty base', async () => {
    expect(await uniqueSlug(pool, 'categories', '')).toBe('item')
  })

  it('rejects unsafe table names', async () => {
    await expect(isSlugTaken(pool, 'categories; drop table users', 'x')).rejects.toThrow(/Unsafe SQL identifier/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/lib/slug.test.ts
```
Expected: FAIL — cannot resolve `@/lib/slug`.

- [ ] **Step 3: Write `src/lib/slug.ts`**

```ts
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
    .replace(/[\u0300-\u036f]/g, '')
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
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/lib/slug.test.ts
```
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat: add slug utilities" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Password hashing (TDD)

**Files:**
- Create: `src/lib/password.ts`
- Test: `src/lib/password.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/password.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'

describe('password hashing', () => {
  it('verifies the correct password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('wrong password here', hash)).toBe(false)
  })

  it('produces a different hash each time (random salt)', async () => {
    const a = await hashPassword('same password value')
    const b = await hashPassword('same password value')
    expect(a).not.toBe(b)
  })

  it('returns false for a malformed stored hash', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/lib/password.test.ts
```
Expected: FAIL — cannot resolve `@/lib/password`.

- [ ] **Step 3: Write `src/lib/password.ts`**

```ts
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 64

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

/** Format: scrypt$N$r$p$saltBase64$keyBase64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltBase64, keyBase64] = parts
  const salt = Buffer.from(saltBase64, 'base64')
  const expected = Buffer.from(keyBase64, 'base64')
  if (expected.length === 0) return false
  const key = await scryptAsync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) })
  return key.length === expected.length && timingSafeEqual(key, expected)
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/lib/password.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/password.ts src/lib/password.test.ts
git commit -m "feat: add scrypt password hashing" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Users, sessions and login service (TDD)

**Files:**
- Create: `src/lib/roles.ts`, `src/lib/users.ts`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/safe-next.ts`
- Test: `src/lib/users.test.ts`, `src/lib/auth.test.ts`, `src/lib/safe-next.test.ts`

- [ ] **Step 1: Write `src/lib/roles.ts`**

```ts
export const ROLES = ['admin', 'editor', 'moderator', 'member'] as const
export type Role = (typeof ROLES)[number]

/** Roles allowed to open /admin at all. Individual screens narrow this further. */
export const ADMIN_AREA_ROLES: readonly Role[] = ['admin', 'editor', 'moderator']
```

- [ ] **Step 2: Write the failing test `src/lib/users.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser, UserInputError, validateNewUser } from '@/lib/users'
import { closeTestPool, resetDb } from '@/test/db'

const valid = {
  email: 'Owner@Example.com',
  password: 'a-long-password',
  displayName: 'Owner',
  handle: 'owner',
  role: 'admin' as const,
}

describe('validateNewUser', () => {
  it('accepts a valid user', () => {
    expect(validateNewUser(valid)).toBeNull()
  })
  it('rejects a bad email, a short password and a bad handle', () => {
    expect(validateNewUser({ ...valid, email: 'nope' })).toMatch(/email/i)
    expect(validateNewUser({ ...valid, password: 'short' })).toMatch(/10 characters/)
    expect(validateNewUser({ ...valid, handle: 'A B' })).toMatch(/handle/i)
    expect(validateNewUser({ ...valid, displayName: '  ' })).toMatch(/name/i)
  })
})

describe('createUser', () => {
  let pool: Awaited<ReturnType<typeof resetDb>>
  beforeEach(async () => {
    pool = await resetDb()
  })
  afterAll(closeTestPool)

  it('stores a hashed password and the role', async () => {
    const id = await createUser(pool, valid)
    const { rows } = await pool.query('SELECT email, password_hash, role FROM users WHERE id = $1', [id])
    expect(rows[0].role).toBe('admin')
    expect(rows[0].password_hash.startsWith('scrypt$')).toBe(true)
    expect(rows[0].password_hash).not.toContain('a-long-password')
  })

  it('rejects a duplicate email regardless of case', async () => {
    await createUser(pool, valid)
    await expect(createUser(pool, { ...valid, email: 'owner@example.COM', handle: 'other' })).rejects.toBeInstanceOf(
      UserInputError,
    )
  })

  it('rejects a duplicate handle', async () => {
    await createUser(pool, valid)
    await expect(createUser(pool, { ...valid, email: 'b@example.com' })).rejects.toBeInstanceOf(UserInputError)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

```bash
pnpm test src/lib/users.test.ts
```
Expected: FAIL — cannot resolve `@/lib/users`.

- [ ] **Step 4: Write `src/lib/users.ts`**

```ts
import type { Queryable } from '@/db/pool'
import { hashPassword } from '@/lib/password'
import type { Role } from '@/lib/roles'

export type NewUser = {
  email: string
  password: string
  displayName: string
  handle: string
  role?: Role
}

export class UserInputError extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/

/** Returns a human-readable problem, or null when the input is acceptable. */
export function validateNewUser(input: NewUser): string | null {
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'Enter a valid email address.'
  if (input.password.length < 10) return 'Password must be at least 10 characters.'
  if (input.displayName.trim() === '' || input.displayName.trim().length > 80) {
    return 'Display name is required (at most 80 characters).'
  }
  if (!HANDLE_PATTERN.test(input.handle)) {
    return 'Handle must be 3-30 characters: lower-case letters, numbers, dots and underscores.'
  }
  return null
}

export async function createUser(db: Queryable, input: NewUser): Promise<number> {
  const problem = validateNewUser(input)
  if (problem) throw new UserInputError(problem)
  const passwordHash = await hashPassword(input.password)
  try {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, display_name, handle, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [input.email.trim(), passwordHash, input.displayName.trim(), input.handle, input.role ?? 'member'],
    )
    return rows[0].id
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new UserInputError('That email or handle is already in use.')
    }
    throw error
  }
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
pnpm test src/lib/users.test.ts
```
Expected: 5 passed.

- [ ] **Step 6: Write the failing test `src/lib/auth.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { login } from '@/lib/auth'
import { destroySession, getSessionUser, SESSION_TTL_MS } from '@/lib/session'
import { createUser } from '@/lib/users'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
let userId: number

beforeEach(async () => {
  pool = await resetDb()
  userId = await createUser(pool, {
    email: 'owner@example.com',
    password: 'a-long-password',
    displayName: 'Owner',
    handle: 'owner',
    role: 'admin',
  })
})
afterAll(closeTestPool)

describe('login', () => {
  it('returns a working session for the right credentials', async () => {
    const result = await login(pool, 'OWNER@example.com', 'a-long-password')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const user = await getSessionUser(pool, result.token)
    expect(user).toMatchObject({ id: userId, email: 'owner@example.com', role: 'admin', handle: 'owner' })
    const { rows } = await pool.query('SELECT last_login_at FROM users WHERE id = $1', [userId])
    expect(rows[0].last_login_at).not.toBeNull()
  })

  it('rejects a wrong password and an unknown email the same way', async () => {
    expect(await login(pool, 'owner@example.com', 'wrong-password-1')).toEqual({ ok: false })
    expect(await login(pool, 'nobody@example.com', 'a-long-password')).toEqual({ ok: false })
  })

  it('rejects a disabled user', async () => {
    await pool.query('UPDATE users SET is_disabled = true WHERE id = $1', [userId])
    expect(await login(pool, 'owner@example.com', 'a-long-password')).toEqual({ ok: false })
  })
})

describe('sessions', () => {
  it('stops working after expiry', async () => {
    const result = await login(pool, 'owner@example.com', 'a-long-password')
    if (!result.ok) throw new Error('login failed')
    const later = new Date(Date.now() + SESSION_TTL_MS + 1000)
    expect(await getSessionUser(pool, result.token, later)).toBeNull()
  })

  it('stops working after destroySession', async () => {
    const result = await login(pool, 'owner@example.com', 'a-long-password')
    if (!result.ok) throw new Error('login failed')
    await destroySession(pool, result.token)
    expect(await getSessionUser(pool, result.token)).toBeNull()
  })

  it('does not store the raw token', async () => {
    const result = await login(pool, 'owner@example.com', 'a-long-password')
    if (!result.ok) throw new Error('login failed')
    const { rows } = await pool.query('SELECT token_hash FROM sessions')
    expect(rows[0].token_hash).not.toBe(result.token)
  })
})
```

- [ ] **Step 7: Run to verify it fails**

```bash
pnpm test src/lib/auth.test.ts
```
Expected: FAIL — cannot resolve `@/lib/auth`.

- [ ] **Step 8: Write `src/lib/session.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto'
import type { Queryable } from '@/db/pool'
import type { Role } from '@/lib/roles'

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

export type SessionUser = {
  id: number
  email: string
  displayName: string
  handle: string
  role: Role
  isPremium: boolean
}

export type UserRow = {
  id: number
  email: string
  display_name: string
  handle: string
  role: Role
  is_premium: boolean
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    handle: row.handle,
    role: row.role,
    isPremium: row.is_premium,
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(
  db: Queryable,
  userId: number,
  meta: { ip?: string; userAgent?: string } = {},
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await db.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [hashToken(token), userId, expiresAt, meta.ip ?? null, meta.userAgent ?? null],
  )
  return { token, expiresAt }
}

export async function getSessionUser(
  db: Queryable,
  token: string,
  now: Date = new Date(),
): Promise<SessionUser | null> {
  const { rows } = await db.query<UserRow>(
    `SELECT u.id, u.email, u.display_name, u.handle, u.role, u.is_premium
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > $2 AND u.is_disabled = false`,
    [hashToken(token), now],
  )
  return rows[0] ? toSessionUser(rows[0]) : null
}

export async function destroySession(db: Queryable, token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
}
```

- [ ] **Step 9: Write `src/lib/auth.ts`**

```ts
import type { Queryable } from '@/db/pool'
import { verifyPassword, hashPassword } from '@/lib/password'
import { createSession, toSessionUser, type SessionUser, type UserRow } from '@/lib/session'

export type LoginResult = { ok: true; token: string; expiresAt: Date; user: SessionUser } | { ok: false }

let dummyHash: Promise<string> | null = null

/** Verifying against a throwaway hash for unknown emails keeps timing similar to a real check. */
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-password')
  return dummyHash
}

export async function login(
  db: Queryable,
  email: string,
  password: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<LoginResult> {
  const { rows } = await db.query<UserRow & { password_hash: string }>(
    `SELECT id, email, password_hash, display_name, handle, role, is_premium
       FROM users WHERE lower(email) = lower($1) AND is_disabled = false`,
    [email.trim()],
  )
  const row = rows[0]
  const valid = await verifyPassword(password, row ? row.password_hash : await getDummyHash())
  if (!row || !valid) return { ok: false }

  const { token, expiresAt } = await createSession(db, row.id, meta)
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [row.id])
  return { ok: true, token, expiresAt, user: toSessionUser(row) }
}
```

- [ ] **Step 10: Run to verify it passes**

```bash
pnpm test src/lib/auth.test.ts
```
Expected: 6 passed.

- [ ] **Step 11: Write the failing test `src/lib/safe-next.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/safe-next'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/admin/categories/')).toBe('/admin/categories/')
  })
  it('falls back for empty, absolute, protocol-relative and backslash paths', () => {
    expect(safeNextPath('')).toBe('/admin/')
    expect(safeNextPath('https://evil.example/')).toBe('/admin/')
    expect(safeNextPath('//evil.example/')).toBe('/admin/')
    expect(safeNextPath('/\\evil.example')).toBe('/admin/')
  })
})
```

- [ ] **Step 12: Run to verify it fails, then write `src/lib/safe-next.ts`**

```bash
pnpm test src/lib/safe-next.test.ts
```
Expected: FAIL — cannot resolve `@/lib/safe-next`.

```ts
/** Only allow redirecting to a path on this same site after login. */
export function safeNextPath(input: string, fallback = '/admin/'): string {
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) {
    return fallback
  }
  return input
}
```

- [ ] **Step 13: Run all tests and commit**

```bash
pnpm test
pnpm typecheck
```
Expected: all pass, typecheck exits 0.

```bash
git add src/lib
git commit -m "feat(auth): add users, database sessions, login service and safe redirect helper" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Registry types, validation and entity definitions (TDD)

**Files:**
- Create: `src/registry/types.ts`, `src/registry/validate.ts`, `src/registry/entities.ts`, `src/registry/form-state.ts`
- Test: `src/registry/validate.test.ts`

- [ ] **Step 1: Write `src/registry/types.ts`**

```ts
import type { Role } from '@/lib/roles'

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'slug'

export type FieldDef = {
  /** camelCase key used in forms and in row objects. */
  name: string
  /** snake_case database column. */
  column: string
  label: string
  type: FieldType
  required?: boolean
  maxLength?: number
  options?: { value: string; label: string }[]
  default?: string | number | boolean
  help?: string
  /** Show as a column in the generic list screen. */
  list?: boolean
}

export type EntityDef = {
  /** URL segment under /admin, e.g. "categories". */
  key: string
  table: string
  singular: string
  plural: string
  /** Public URL prefix used to record redirects when a slug changes, e.g. "/category/". */
  publicPathPrefix?: string
  /** Field name whose value seeds the slug when none is typed. */
  slugSource?: string
  orderBy: string
  roles: { read: Role[]; write: Role[] }
  /** When present and the count is > 0, deleting is blocked with this message. `sql` receives the id as $1. */
  usage?: { sql: string; message: (count: number) => string }
  fields: FieldDef[]
}
```

- [ ] **Step 2: Write `src/registry/form-state.ts`**

```ts
export type FormState = {
  errors: Record<string, string>
  values?: Record<string, unknown>
}
```

- [ ] **Step 3: Write the failing test `src/registry/validate.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { categories } from '@/registry/entities'
import { formDataToInput, validateInput } from '@/registry/validate'

const valid = {
  name: 'Portrait',
  slug: '',
  description: '',
  sortOrder: '',
  isActive: 'on',
  supportsStyles: 'on',
  seoTitle: '',
  seoDescription: '',
}

describe('validateInput', () => {
  it('accepts valid input and applies defaults', () => {
    const result = validateInput(categories, valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({ name: 'Portrait', slug: '', sortOrder: 0, isActive: true, supportsStyles: true })
  })

  it('requires the name', () => {
    const result = validateInput(categories, { ...valid, name: '   ' })
    expect(result).toEqual({ ok: false, errors: { name: 'Required' } })
  })

  it('enforces max length', () => {
    const result = validateInput(categories, { ...valid, name: 'x'.repeat(81) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toMatch(/at most 80/)
  })

  it('validates slug format', () => {
    const bad = validateInput(categories, { ...valid, slug: 'Not A Slug' })
    expect(bad.ok).toBe(false)
    const good = validateInput(categories, { ...valid, slug: 'good-slug-2' })
    expect(good.ok).toBe(true)
  })

  it('parses whole numbers and rejects other input', () => {
    const ok = validateInput(categories, { ...valid, sortOrder: '12' })
    expect(ok.ok && ok.value.sortOrder).toBe(12)
    const bad = validateInput(categories, { ...valid, sortOrder: '1.5' })
    expect(bad.ok).toBe(false)
  })

  it('treats a missing checkbox as false', () => {
    const result = validateInput(categories, { ...valid, isActive: false })
    expect(result.ok && result.value.isActive).toBe(false)
  })
})

describe('formDataToInput', () => {
  it('maps form fields and turns absent checkboxes into false', () => {
    const form = new FormData()
    form.set('name', 'Portrait')
    form.set('isActive', 'on')
    const input = formDataToInput(categories, form)
    expect(input.name).toBe('Portrait')
    expect(input.isActive).toBe(true)
    expect(input.supportsStyles).toBe(false)
    expect(input.slug).toBe('')
  })
})
```

- [ ] **Step 4: Run to verify it fails**

```bash
pnpm test src/registry/validate.test.ts
```
Expected: FAIL — cannot resolve `@/registry/entities`.

- [ ] **Step 5: Write `src/registry/validate.ts`**

```ts
import type { FieldDef } from '@/registry/types'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> }

const DEFAULT_MAX: Record<string, number> = { text: 200, textarea: 2000, slug: 80 }

export function validateInput(
  entity: { fields: FieldDef[] },
  raw: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {}
  const value: Record<string, unknown> = {}

  for (const field of entity.fields) {
    const input = raw[field.name]
    switch (field.type) {
      case 'boolean':
        value[field.name] = input === true || input === 'on' || input === 'true'
        break
      case 'number': {
        const text = String(input ?? '').trim()
        if (text === '') {
          if (field.required) errors[field.name] = 'Required'
          else value[field.name] = typeof field.default === 'number' ? field.default : 0
        } else if (!/^-?\d+$/.test(text)) {
          errors[field.name] = 'Enter a whole number'
        } else {
          value[field.name] = Number(text)
        }
        break
      }
      case 'select': {
        const text = String(input ?? '')
        if (!field.options?.some((option) => option.value === text)) {
          errors[field.name] = 'Choose one of the listed options'
        } else {
          value[field.name] = text
        }
        break
      }
      default: {
        const text = String(input ?? '').trim()
        const max = field.maxLength ?? DEFAULT_MAX[field.type]
        if (text === '' && field.required) errors[field.name] = 'Required'
        else if (text.length > max) errors[field.name] = `Must be at most ${max} characters`
        else if (field.type === 'slug' && text !== '' && !SLUG_PATTERN.test(text)) {
          errors[field.name] = 'Use lower-case letters, numbers and single hyphens'
        } else value[field.name] = text
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value }
}

/** Turns a submitted form into the plain object validateInput expects. */
export function formDataToInput(entity: { fields: FieldDef[] }, formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of entity.fields) {
    out[field.name] = field.type === 'boolean' ? formData.get(field.name) !== null : String(formData.get(field.name) ?? '')
  }
  return out
}

/** Default values for a blank "new" form. */
export function defaultsFor(entity: { fields: FieldDef[] }): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of entity.fields) {
    out[field.name] = field.default ?? (field.type === 'boolean' ? false : '')
  }
  return out
}
```

- [ ] **Step 6: Write `src/registry/entities.ts`**

```ts
import type { EntityDef } from '@/registry/types'

export const categories: EntityDef = {
  key: 'categories',
  table: 'categories',
  singular: 'Category',
  plural: 'Categories',
  publicPathPrefix: '/category/',
  slugSource: 'name',
  orderBy: 'sort_order ASC, name ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  usage: {
    sql: 'SELECT count(*)::int AS n FROM prompts WHERE category_id = $1',
    message: (n) => `${n} prompt(s) use this category. Deactivate it instead of deleting it.`,
  },
  fields: [
    { name: 'name', column: 'name', label: 'Name', type: 'text', required: true, maxLength: 80, list: true },
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Leave empty to generate it from the name.' },
    { name: 'description', column: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive categories disappear from the public site.' },
    { name: 'supportsStyles', column: 'supports_styles', label: 'Supports art styles', type: 'boolean', default: true, help: 'Show the style filter on this category.' },
    { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
    { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  ],
}

export const tools: EntityDef = {
  key: 'tools',
  table: 'tools',
  singular: 'Tool',
  plural: 'Tools',
  publicPathPrefix: '/tool/',
  slugSource: 'name',
  orderBy: 'sort_order ASC, name ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  usage: {
    sql: 'SELECT count(*)::int AS n FROM prompt_tools WHERE tool_id = $1',
    message: (n) => `${n} prompt(s) are tested on this tool. Deactivate it instead of deleting it.`,
  },
  fields: [
    { name: 'name', column: 'name', label: 'Name', type: 'text', required: true, maxLength: 80, list: true },
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Leave empty to generate it from the name.' },
    { name: 'vendor', column: 'vendor', label: 'Vendor', type: 'text', maxLength: 80, list: true },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive tools disappear from the public site.' },
    { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
    { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  ],
}

export const styles: EntityDef = {
  key: 'styles',
  table: 'styles',
  singular: 'Style',
  plural: 'Styles',
  publicPathPrefix: '/style/',
  slugSource: 'name',
  orderBy: 'sort_order ASC, name ASC',
  roles: { read: ['admin', 'editor'], write: ['admin', 'editor'] },
  usage: {
    sql: 'SELECT count(*)::int AS n FROM prompt_styles WHERE style_id = $1',
    message: (n) => `${n} prompt(s) use this style. Deactivate it instead of deleting it.`,
  },
  fields: [
    { name: 'name', column: 'name', label: 'Name', type: 'text', required: true, maxLength: 80, list: true },
    { name: 'slug', column: 'slug', label: 'Slug', type: 'slug', list: true, help: 'Leave empty to generate it from the name.' },
    { name: 'sortOrder', column: 'sort_order', label: 'Sort order', type: 'number', default: 0, list: true },
    { name: 'isActive', column: 'is_active', label: 'Active', type: 'boolean', default: true, list: true, help: 'Inactive styles disappear from the public site.' },
  ],
}

export const ENTITIES: Record<string, EntityDef> = { categories, tools, styles }

export function getEntity(key: string): EntityDef | undefined {
  return Object.hasOwn(ENTITIES, key) ? ENTITIES[key] : undefined
}
```

- [ ] **Step 7: Run to verify it passes**

```bash
pnpm test src/registry/validate.test.ts
```
Expected: 7 passed.

- [ ] **Step 8: Commit**

```bash
git add src/registry
git commit -m "feat(registry): add entity registry types, validation and taxonomy entity definitions" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Audit, redirects and generic repository (TDD)

**Files:**
- Create: `src/registry/audit.ts`, `src/registry/redirects.ts`, `src/registry/repo.ts`
- Test: `src/registry/repo.test.ts`

- [ ] **Step 1: Write the failing test `src/registry/repo.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { categories, tools } from '@/registry/entities'
import { createRow, deleteRow, getRow, listRows, updateRow } from '@/registry/repo'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>

const base = {
  name: 'Portrait',
  slug: '',
  description: '',
  sortOrder: '',
  isActive: true,
  supportsStyles: true,
  seoTitle: '',
  seoDescription: '',
}

beforeEach(async () => {
  pool = await resetDb()
})
afterAll(closeTestPool)

describe('createRow', () => {
  it('creates a row with a generated slug and defaults', async () => {
    const result = await createRow(pool, categories, base, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const row = await getRow(pool, categories, result.id)
    expect(row).toMatchObject({ name: 'Portrait', slug: 'portrait', sortOrder: 0, isActive: true, supportsStyles: true })
  })

  it('suffixes generated slugs that collide', async () => {
    await createRow(pool, categories, base, null)
    const second = await createRow(pool, categories, base, null)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect((await getRow(pool, categories, second.id))?.slug).toBe('portrait-2')
  })

  it('rejects a hand-typed slug that is already taken', async () => {
    await createRow(pool, categories, base, null)
    const result = await createRow(pool, categories, { ...base, name: 'Other', slug: 'portrait' }, null)
    expect(result).toEqual({ ok: false, errors: { slug: 'This slug is already in use.' } })
  })

  it('returns validation errors and writes nothing', async () => {
    const result = await createRow(pool, categories, { ...base, name: '' }, null)
    expect(result).toEqual({ ok: false, errors: { name: 'Required' } })
    expect(await listRows(pool, categories)).toHaveLength(0)
  })

  it('writes an audit entry', async () => {
    await createRow(pool, categories, base, null)
    const { rows } = await pool.query('SELECT entity, action FROM audit_log')
    expect(rows).toEqual([{ entity: 'categories', action: 'create' }])
  })
})

describe('listRows', () => {
  it('orders by sort order then name', async () => {
    await createRow(pool, tools, { name: 'Zed', slug: '', vendor: '', sortOrder: '1', isActive: true, seoTitle: '', seoDescription: '' }, null)
    await createRow(pool, tools, { name: 'Alpha', slug: '', vendor: '', sortOrder: '2', isActive: true, seoTitle: '', seoDescription: '' }, null)
    await createRow(pool, tools, { name: 'Beta', slug: '', vendor: '', sortOrder: '1', isActive: true, seoTitle: '', seoDescription: '' }, null)
    const rows = await listRows(pool, tools)
    expect(rows.map((r) => r.name)).toEqual(['Beta', 'Zed', 'Alpha'])
  })
})

describe('updateRow', () => {
  it('keeps the slug when the update leaves it empty', async () => {
    const created = await createRow(pool, categories, base, null)
    if (!created.ok) throw new Error('create failed')
    const result = await updateRow(pool, categories, created.id, { ...base, name: 'Portraits', slug: '' }, null)
    expect(result.ok).toBe(true)
    expect(await getRow(pool, categories, created.id)).toMatchObject({ name: 'Portraits', slug: 'portrait' })
  })

  it('records a redirect when the slug changes and collapses redirect chains', async () => {
    const created = await createRow(pool, categories, base, null)
    if (!created.ok) throw new Error('create failed')
    await updateRow(pool, categories, created.id, { ...base, slug: 'portraits' }, null)
    await updateRow(pool, categories, created.id, { ...base, slug: 'people' }, null)
    const { rows } = await pool.query('SELECT from_path, to_path FROM redirects ORDER BY from_path')
    expect(rows).toEqual([
      { from_path: '/category/portrait/', to_path: '/category/people/' },
      { from_path: '/category/portraits/', to_path: '/category/people/' },
    ])
  })

  it('removes a redirect that would loop when a slug is changed back', async () => {
    const created = await createRow(pool, categories, base, null)
    if (!created.ok) throw new Error('create failed')
    await updateRow(pool, categories, created.id, { ...base, slug: 'portraits' }, null)
    await updateRow(pool, categories, created.id, { ...base, slug: 'portrait' }, null)
    const { rows } = await pool.query('SELECT from_path, to_path FROM redirects')
    expect(rows).toEqual([{ from_path: '/category/portraits/', to_path: '/category/portrait/' }])
  })

  it('rejects a slug used by another row', async () => {
    await createRow(pool, categories, base, null)
    const other = await createRow(pool, categories, { ...base, name: 'Travel' }, null)
    if (!other.ok) throw new Error('create failed')
    const result = await updateRow(pool, categories, other.id, { ...base, name: 'Travel', slug: 'portrait' }, null)
    expect(result).toEqual({ ok: false, errors: { slug: 'This slug is already in use.' } })
  })

  it('reports a missing row', async () => {
    const result = await updateRow(pool, categories, 9999, base, null)
    expect(result).toEqual({ ok: false, errors: { _: 'Record not found.' } })
  })

  it('turns a database rule violation into a form error', async () => {
    const cat = await createRow(pool, categories, base, null)
    if (!cat.ok) throw new Error('create failed')
    const style = (await pool.query<{ id: number }>(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)).rows[0].id
    await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1, $2)', [cat.id, style])
    const prompt = (await pool.query<{ id: number }>(`INSERT INTO prompts (slug, title, category_id) VALUES ('p', 'P', $1) RETURNING id`, [cat.id])).rows[0].id
    await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [prompt, cat.id, style])
    const result = await updateRow(pool, categories, cat.id, { ...base, supportsStyles: false }, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors._).toMatch(/still use styles/)
  })
})

describe('deleteRow', () => {
  it('blocks deleting a category that has prompts, and deletes an unused one', async () => {
    const used = await createRow(pool, categories, base, null)
    const unused = await createRow(pool, categories, { ...base, name: 'Travel' }, null)
    if (!used.ok || !unused.ok) throw new Error('create failed')
    await pool.query(`INSERT INTO prompts (slug, title, category_id) VALUES ('p', 'P', $1)`, [used.id])

    const blocked = await deleteRow(pool, categories, used.id, null)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.reason).toMatch(/1 prompt\(s\) use this category/)

    expect(await deleteRow(pool, categories, unused.id, null)).toEqual({ ok: true })
    expect(await getRow(pool, categories, unused.id)).toBeNull()
  })

  it('reports a missing row', async () => {
    expect(await deleteRow(pool, categories, 9999, null)).toEqual({ ok: false, reason: 'Record not found.' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/registry/repo.test.ts
```
Expected: FAIL — cannot resolve `@/registry/repo`.

- [ ] **Step 3: Write `src/registry/audit.ts`**

```ts
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
```

- [ ] **Step 4: Write `src/registry/redirects.ts`**

```ts
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
```

- [ ] **Step 5: Write `src/registry/repo.ts`**

```ts
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
```

- [ ] **Step 6: Run to verify it passes**

```bash
pnpm test src/registry/repo.test.ts
```
Expected: 14 passed.

- [ ] **Step 7: Commit**

```bash
pnpm typecheck
git add src/registry
git commit -m "feat(registry): add generic repository with slug redirects, audit log and deletion guards" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Relation matrix repository (TDD)

**Files:**
- Create: `src/matrix/repo.ts`, `src/matrix/combo-fields.ts`
- Test: `src/matrix/repo.test.ts`

- [ ] **Step 1: Write the failing test `src/matrix/repo.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  getStyleMatrix,
  getToolLink,
  getToolMatrix,
  setStyleLink,
  setToolLink,
  updateCombo,
} from '@/matrix/repo'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
let portrait: number
let travel: number
let mj: number
let gpt: number
let cinematic: number

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

beforeEach(async () => {
  pool = await resetDb()
  portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait', 'Portrait') RETURNING id`)
  travel = await one(`INSERT INTO categories (slug, name, supports_styles) VALUES ('travel', 'Travel', false) RETURNING id`)
  mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney', 'Midjourney') RETURNING id`)
  gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt', 'ChatGPT') RETURNING id`)
  cinematic = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic', 'Cinematic') RETURNING id`)
})
afterAll(closeTestPool)

async function addPrompt(status: string, slug: string, toolId: number | null, styleId: number | null = null) {
  const id = await one(`INSERT INTO prompts (slug, title, category_id, status) VALUES ($1, $1, $2, $3) RETURNING id`, [slug, portrait, status])
  if (toolId) await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id) VALUES ($1, $2, $3)', [id, portrait, toolId])
  if (styleId) await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1, $2, $3)', [id, portrait, styleId])
  return id
}

describe('tool links', () => {
  it('enables a pair with the next sort order and is idempotent', async () => {
    expect(await setToolLink(pool, portrait, mj, true, null)).toEqual({ ok: true })
    expect(await setToolLink(pool, portrait, gpt, true, null)).toEqual({ ok: true })
    expect(await setToolLink(pool, portrait, gpt, true, null)).toEqual({ ok: true })
    const matrix = await getToolMatrix(pool)
    const orders = matrix.links.filter((l) => l.categoryId === portrait).map((l) => l.sortOrder).sort()
    expect(orders).toEqual([0, 1])
  })

  it('removes an unused pair', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    expect(await setToolLink(pool, portrait, mj, false, null)).toEqual({ ok: true })
    expect((await getToolMatrix(pool)).links).toHaveLength(0)
  })

  it('blocks removing a pair that prompts use and names the cause', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    await addPrompt('published', 'studio-headshot', mj)
    const result = await setToolLink(pool, portrait, mj, false, null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/1 prompt\(s\) use this pair/)
      expect(result.reason).toMatch(/studio-headshot/)
    }
    expect((await getToolMatrix(pool)).links).toHaveLength(1)
  })

  it('reports unknown ids instead of throwing', async () => {
    expect(await setToolLink(pool, 99999, mj, true, null)).toEqual({ ok: false, reason: 'Unknown category or tool.' })
  })

  it('counts only published prompts as publishedCount but all prompts as usageCount', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    await addPrompt('published', 'a', mj)
    await addPrompt('draft', 'b', mj)
    const link = (await getToolMatrix(pool)).links[0]
    expect(link).toMatchObject({ publishedCount: 1, usageCount: 2 })
  })

  it('updates combo settings and reads one link with names', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    const result = await updateCombo(
      pool,
      portrait,
      mj,
      { sortOrder: 5, isFeatured: true, isIndexable: true, seoTitle: 'Portrait prompts for Midjourney', seoDescription: 'desc', intro: 'intro' },
      null,
    )
    expect(result).toEqual({ ok: true })
    expect(await getToolLink(pool, portrait, mj)).toMatchObject({
      categoryName: 'Portrait',
      toolName: 'Midjourney',
      sortOrder: 5,
      isFeatured: true,
      isIndexable: true,
      seoTitle: 'Portrait prompts for Midjourney',
    })
  })

  it('reports a combo update for a pair that does not exist', async () => {
    const result = await updateCombo(pool, portrait, mj, { sortOrder: 0, isFeatured: false, isIndexable: false, seoTitle: '', seoDescription: '', intro: '' }, null)
    expect(result).toEqual({ ok: false, reason: 'That category and tool are not linked.' })
  })

  it('writes an audit entry for matrix changes', async () => {
    await setToolLink(pool, portrait, mj, true, null)
    const { rows } = await pool.query('SELECT entity, action FROM audit_log')
    expect(rows).toEqual([{ entity: 'category_tools', action: 'link' }])
  })
})

describe('style links', () => {
  it('refuses to link styles to a category that does not support them', async () => {
    expect(await setStyleLink(pool, travel, cinematic, true, null)).toEqual({
      ok: false,
      reason: 'This category does not support styles. Turn on "Supports art styles" for it first.',
    })
  })

  it('links a style and blocks removing it while prompts use it', async () => {
    expect(await setStyleLink(pool, portrait, cinematic, true, null)).toEqual({ ok: true })
    await setToolLink(pool, portrait, mj, true, null)
    await addPrompt('published', 'p1', mj, cinematic)
    const blocked = await setStyleLink(pool, portrait, cinematic, false, null)
    expect(blocked.ok).toBe(false)
    const matrix = await getStyleMatrix(pool)
    expect(matrix.links[0]).toMatchObject({ categoryId: portrait, styleId: cinematic, publishedCount: 1, usageCount: 1 })
  })

  it('removes an unused style link', async () => {
    await setStyleLink(pool, portrait, cinematic, true, null)
    expect(await setStyleLink(pool, portrait, cinematic, false, null)).toEqual({ ok: true })
    expect((await getStyleMatrix(pool)).links).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/matrix/repo.test.ts
```
Expected: FAIL — cannot resolve `@/matrix/repo`.

- [ ] **Step 3: Write `src/matrix/repo.ts`**

```ts
import type { Queryable } from '@/db/pool'
import { writeAudit } from '@/registry/audit'

export type MatrixCategory = { id: number; name: string; isActive: boolean; supportsStyles: boolean }
export type MatrixTool = { id: number; name: string; isActive: boolean }
export type MatrixStyle = { id: number; name: string; isActive: boolean }

export type ToolLink = {
  categoryId: number
  toolId: number
  sortOrder: number
  isFeatured: boolean
  isIndexable: boolean
  seoTitle: string
  seoDescription: string
  intro: string
  publishedCount: number
  usageCount: number
}

export type StyleLink = {
  categoryId: number
  styleId: number
  sortOrder: number
  publishedCount: number
  usageCount: number
}

export type ComboPatch = {
  sortOrder: number
  isFeatured: boolean
  isIndexable: boolean
  seoTitle: string
  seoDescription: string
  intro: string
}

export type ToggleResult = { ok: true } | { ok: false; reason: string }

const TOOL_LINK_SELECT = `
  SELECT ct.category_id AS "categoryId", ct.tool_id AS "toolId", ct.sort_order AS "sortOrder",
         ct.is_featured AS "isFeatured", ct.is_indexable AS "isIndexable",
         ct.seo_title AS "seoTitle", ct.seo_description AS "seoDescription", ct.intro,
         (SELECT count(*)::int FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
           WHERE pt.category_id = ct.category_id AND pt.tool_id = ct.tool_id AND p.status = 'published') AS "publishedCount",
         (SELECT count(*)::int FROM prompt_tools pt
           WHERE pt.category_id = ct.category_id AND pt.tool_id = ct.tool_id) AS "usageCount"
    FROM category_tools ct`

export async function getToolMatrix(
  db: Queryable,
): Promise<{ categories: MatrixCategory[]; tools: MatrixTool[]; links: ToolLink[] }> {
  const [categories, tools, links] = await Promise.all([
    db.query<MatrixCategory>(
      `SELECT id, name, is_active AS "isActive", supports_styles AS "supportsStyles"
         FROM categories ORDER BY sort_order, name`,
    ),
    db.query<MatrixTool>(`SELECT id, name, is_active AS "isActive" FROM tools ORDER BY sort_order, name`),
    db.query<ToolLink>(`${TOOL_LINK_SELECT} ORDER BY ct.category_id, ct.sort_order, ct.tool_id`),
  ])
  return { categories: categories.rows, tools: tools.rows, links: links.rows }
}

export async function getToolLink(
  db: Queryable,
  categoryId: number,
  toolId: number,
): Promise<(ToolLink & { categoryName: string; toolName: string }) | null> {
  const { rows } = await db.query<ToolLink & { categoryName: string; toolName: string }>(
    `SELECT link.*, c.name AS "categoryName", t.name AS "toolName"
       FROM (${TOOL_LINK_SELECT}) link
       JOIN categories c ON c.id = link."categoryId"
       JOIN tools t ON t.id = link."toolId"
      WHERE link."categoryId" = $1 AND link."toolId" = $2`,
    [categoryId, toolId],
  )
  return rows[0] ?? null
}

function pgCode(error: unknown): string | undefined {
  return (error as { code?: string }).code
}

export async function setToolLink(
  db: Queryable,
  categoryId: number,
  toolId: number,
  enabled: boolean,
  actorId: number | null,
): Promise<ToggleResult> {
  if (enabled) {
    try {
      await db.query(
        `INSERT INTO category_tools (category_id, tool_id, sort_order)
         VALUES ($1, $2, COALESCE((SELECT max(sort_order) + 1 FROM category_tools WHERE category_id = $1), 0))
         ON CONFLICT DO NOTHING`,
        [categoryId, toolId],
      )
    } catch (error) {
      if (pgCode(error) === '23503') return { ok: false, reason: 'Unknown category or tool.' }
      throw error
    }
  } else {
    const usage = await db.query<{ title: string }>(
      `SELECT p.title FROM prompt_tools pt JOIN prompts p ON p.id = pt.prompt_id
        WHERE pt.category_id = $1 AND pt.tool_id = $2 ORDER BY p.title`,
      [categoryId, toolId],
    )
    if (usage.rows.length > 0) {
      const examples = usage.rows.slice(0, 5).map((r) => r.title).join(', ')
      return {
        ok: false,
        reason: `${usage.rows.length} prompt(s) use this pair (for example: ${examples}). Remove the tool from those prompts first, or deactivate the category or tool instead.`,
      }
    }
    await db.query('DELETE FROM category_tools WHERE category_id = $1 AND tool_id = $2', [categoryId, toolId])
  }
  await writeAudit(db, {
    userId: actorId,
    entity: 'category_tools',
    entityId: `${categoryId}:${toolId}`,
    action: enabled ? 'link' : 'unlink',
  })
  return { ok: true }
}

export async function updateCombo(
  db: Queryable,
  categoryId: number,
  toolId: number,
  patch: ComboPatch,
  actorId: number | null,
): Promise<ToggleResult> {
  const result = await db.query(
    `UPDATE category_tools
        SET sort_order = $3, is_featured = $4, is_indexable = $5,
            seo_title = $6, seo_description = $7, intro = $8, updated_at = now()
      WHERE category_id = $1 AND tool_id = $2`,
    [categoryId, toolId, patch.sortOrder, patch.isFeatured, patch.isIndexable, patch.seoTitle, patch.seoDescription, patch.intro],
  )
  if (result.rowCount === 0) return { ok: false, reason: 'That category and tool are not linked.' }
  await writeAudit(db, {
    userId: actorId,
    entity: 'category_tools',
    entityId: `${categoryId}:${toolId}`,
    action: 'update',
    diff: patch,
  })
  return { ok: true }
}

export async function getStyleMatrix(
  db: Queryable,
): Promise<{ categories: MatrixCategory[]; styles: MatrixStyle[]; links: StyleLink[] }> {
  const [categories, styles, links] = await Promise.all([
    db.query<MatrixCategory>(
      `SELECT id, name, is_active AS "isActive", supports_styles AS "supportsStyles"
         FROM categories ORDER BY sort_order, name`,
    ),
    db.query<MatrixStyle>(`SELECT id, name, is_active AS "isActive" FROM styles ORDER BY sort_order, name`),
    db.query<StyleLink>(
      `SELECT cs.category_id AS "categoryId", cs.style_id AS "styleId", cs.sort_order AS "sortOrder",
              (SELECT count(*)::int FROM prompt_styles ps JOIN prompts p ON p.id = ps.prompt_id
                WHERE ps.category_id = cs.category_id AND ps.style_id = cs.style_id AND p.status = 'published') AS "publishedCount",
              (SELECT count(*)::int FROM prompt_styles ps
                WHERE ps.category_id = cs.category_id AND ps.style_id = cs.style_id) AS "usageCount"
         FROM category_styles cs ORDER BY cs.category_id, cs.sort_order, cs.style_id`,
    ),
  ])
  return { categories: categories.rows, styles: styles.rows, links: links.rows }
}

export async function setStyleLink(
  db: Queryable,
  categoryId: number,
  styleId: number,
  enabled: boolean,
  actorId: number | null,
): Promise<ToggleResult> {
  if (enabled) {
    try {
      await db.query(
        `INSERT INTO category_styles (category_id, style_id, sort_order)
         VALUES ($1, $2, COALESCE((SELECT max(sort_order) + 1 FROM category_styles WHERE category_id = $1), 0))
         ON CONFLICT DO NOTHING`,
        [categoryId, styleId],
      )
    } catch (error) {
      if (pgCode(error) === '23514') {
        return { ok: false, reason: 'This category does not support styles. Turn on "Supports art styles" for it first.' }
      }
      if (pgCode(error) === '23503') return { ok: false, reason: 'Unknown category or style.' }
      throw error
    }
  } else {
    const usage = await db.query<{ title: string }>(
      `SELECT p.title FROM prompt_styles ps JOIN prompts p ON p.id = ps.prompt_id
        WHERE ps.category_id = $1 AND ps.style_id = $2 ORDER BY p.title`,
      [categoryId, styleId],
    )
    if (usage.rows.length > 0) {
      const examples = usage.rows.slice(0, 5).map((r) => r.title).join(', ')
      return {
        ok: false,
        reason: `${usage.rows.length} prompt(s) use this style in this category (for example: ${examples}). Remove the style from those prompts first.`,
      }
    }
    await db.query('DELETE FROM category_styles WHERE category_id = $1 AND style_id = $2', [categoryId, styleId])
  }
  await writeAudit(db, {
    userId: actorId,
    entity: 'category_styles',
    entityId: `${categoryId}:${styleId}`,
    action: enabled ? 'link' : 'unlink',
  })
  return { ok: true }
}
```

- [ ] **Step 4: Write `src/matrix/combo-fields.ts`**

```ts
import type { FieldDef } from '@/registry/types'

/** Fields of a category × tool combination, validated with the same registry validator as entities. */
export const COMBO_FIELDS: FieldDef[] = [
  { name: 'sortOrder', column: 'sort_order', label: 'Order within the category', type: 'number', default: 0 },
  { name: 'isFeatured', column: 'is_featured', label: 'Featured', type: 'boolean', help: 'Show this tool first on the category page.' },
  { name: 'isIndexable', column: 'is_indexable', label: 'Indexable combination page', type: 'boolean', help: 'Let search engines index this category + tool page with its own title and intro.' },
  { name: 'seoTitle', column: 'seo_title', label: 'SEO title', type: 'text', maxLength: 120 },
  { name: 'seoDescription', column: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 300 },
  { name: 'intro', column: 'intro', label: 'Intro text', type: 'textarea', maxLength: 1000 },
]
```

- [ ] **Step 5: Run to verify it passes**

```bash
pnpm test src/matrix/repo.test.ts
```
Expected: 11 passed.

- [ ] **Step 6: Run everything and commit**

```bash
pnpm test
pnpm typecheck
git add src/matrix
git commit -m "feat(matrix): add category-tool and category-style relation repository with live counts and guards" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: all tests pass, typecheck exits 0.

---

### Task 12: Styles, fonts, root layout and placeholder home

**Files:**
- Create: `src/styles/modernist.css`, `src/styles/admin.css`, `src/app/fonts.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Copy the Modernist stylesheet from the design export and adapt it**

The design zip was extracted to the session scratchpad. If that folder is gone, extract `C:\Users\HRH\Downloads\ThePromptGalaxy Design.zip` again and use `_ds/modernist-*/styles.css`.

```bash
mkdir -p src/styles
cp "C:/Users/HRH/AppData/Local/Temp/claude/F--Shahbaz-thepromptgalaxy/d7aa2f51-4ca7-452a-87e9-b5cbd6036211/scratchpad/design/_ds/modernist-f4d8a497-10d3-4504-9b2b-c19927bc55c7/styles.css" src/styles/modernist.css
sed -i "/@import url/d" src/styles/modernist.css
sed -i 's|^  --font-heading: .*|  --font-heading: var(--font-archivo), system-ui, sans-serif;|; s|^  --font-body: .*|  --font-body: var(--font-archivo), system-ui, sans-serif;|' src/styles/modernist.css
grep -n "font-heading:\|font-body:\|@import" src/styles/modernist.css
```
Expected: the two `--font-*` lines now reference `var(--font-archivo)` and no `@import` line remains.

- [ ] **Step 2: Write `src/styles/admin.css`**

```css
.admin-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.admin-side {
  border-right: 2px solid var(--color-text);
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.admin-side a,
.admin-side button.link {
  color: var(--color-text);
  text-decoration: none;
  font-weight: 600;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 0;
  text-align: left;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.admin-side a:hover,
.admin-side button.link:hover {
  background: var(--color-accent-100);
  color: var(--color-accent-700);
}
.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-6);
}
.admin-brand i {
  width: 18px;
  height: 18px;
  background: var(--color-accent);
  display: inline-block;
}
.admin-user {
  margin-top: auto;
  font-size: 13px;
  color: var(--color-neutral-700);
  padding: var(--space-3);
}
.admin-main {
  padding: var(--space-8);
  min-width: 0;
}
.admin-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-4);
  border-bottom: 2px solid var(--color-text);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-6);
}
.admin-head h1 {
  margin: 0;
  font-size: 36px;
  letter-spacing: -0.03em;
}
.banner {
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-text);
  margin-bottom: var(--space-4);
}
.banner-error {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
  color: var(--color-accent-700);
}
.form-grid {
  display: grid;
  gap: var(--space-4);
  max-width: 640px;
}
.field-error {
  color: var(--color-accent-700);
  font-size: 13px;
  margin-top: 4px;
}
.field-help {
  color: var(--color-neutral-700);
  font-size: 13px;
  margin-top: 4px;
}
.check {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-weight: 600;
}
.actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.inline-form {
  display: inline;
  margin: 0;
}
.matrix td,
.matrix th {
  text-align: center;
}
.matrix th:first-child,
.matrix td:first-child {
  text-align: left;
}
.matrix .cell-on {
  background: var(--color-accent-100);
}
.matrix .cell-off .btn {
  color: var(--color-neutral-500);
}
.matrix-legend {
  font-size: 13px;
  color: var(--color-neutral-700);
  margin: 0 0 var(--space-4);
  max-width: 720px;
}
.tabs {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.tabs a {
  font-weight: 700;
  text-decoration: none;
  color: var(--color-text);
  padding-bottom: 4px;
  border-bottom: 2px solid transparent;
}
.tabs a[aria-current='page'] {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
.login-wrap {
  max-width: 420px;
  margin: 12vh auto;
  padding: var(--space-6);
  border: 2px solid var(--color-text);
}
.login-wrap h1 {
  margin-top: 0;
  letter-spacing: -0.03em;
}
```

- [ ] **Step 3: Write `src/app/fonts.ts`**

```ts
import { Archivo } from 'next/font/google'

export const archivo = Archivo({
  weight: ['400', '600', '800'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})
```

- [ ] **Step 4: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { archivo } from './fonts'
import '@/styles/modernist.css'
import '@/styles/admin.css'

export const metadata: Metadata = {
  title: 'ThePromptGalaxy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Write `src/app/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <main style={{ padding: '10vh var(--space-8)' }}>
      <h1 style={{ fontSize: 56, letterSpacing: '-0.04em', margin: 0 }}>ThePromptGalaxy</h1>
      <p>The site is being rebuilt. The public pages arrive in the next phase.</p>
    </main>
  )
}
```

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm typecheck
git add src/styles src/app
git commit -m "feat(ui): add Modernist styles, admin styles, Archivo font and root layout" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: typecheck exits 0.

---

### Task 13: Auth UI — cookie helpers, login page, logout, create-admin script

**Files:**
- Create: `src/lib/session-cookie.ts`, `src/lib/current-user.ts`, `src/app/login/actions.ts`, `src/app/login/LoginForm.tsx`, `src/app/login/page.tsx`, `scripts/create-admin.ts`

- [ ] **Step 1: Write `src/lib/session-cookie.ts`**

```ts
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'galaxy_session'

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}
```

- [ ] **Step 2: Write `src/lib/current-user.ts`**

```ts
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import type { Role } from '@/lib/roles'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { readSessionToken } from '@/lib/session-cookie'

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken()
  if (!token) return null
  return getSessionUser(getPool(), token)
})

/** Redirects to the login page unless the visitor is signed in with one of the given roles. */
export async function requireUser(roles: readonly Role[]): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login/')
  if (!roles.includes(user.role)) redirect('/login/?denied=1')
  return user
}
```

- [ ] **Step 3: Write `src/app/login/actions.ts`**

```ts
'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPool } from '@/db/pool'
import { login } from '@/lib/auth'
import { safeNextPath } from '@/lib/safe-next'
import { destroySession } from '@/lib/session'
import { clearSessionCookie, readSessionToken, setSessionCookie } from '@/lib/session-cookie'

export type LoginState = { error?: string }

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNextPath(String(formData.get('next') ?? ''))

  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const result = await login(getPool(), email, password, {
    ip: forwarded || undefined,
    userAgent: requestHeaders.get('user-agent') ?? undefined,
  })
  if (!result.ok) return { error: 'Email or password is incorrect.' }

  await setSessionCookie(result.token, result.expiresAt)
  redirect(next)
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken()
  if (token) await destroySession(getPool(), token)
  await clearSessionCookie()
  redirect('/login/')
}
```

- [ ] **Step 4: Write `src/app/login/LoginForm.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

const initial: LoginState = {}

export function LoginForm({ next, denied }: { next: string; denied: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial)
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="next" value={next} />
      {denied ? <div className="banner banner-error">Your account cannot open that page.</div> : null}
      {state.error ? <div className="banner banner-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Write `src/app/login/page.tsx`**

```tsx
import { safeNextPath } from '@/lib/safe-next'
import { LoginForm } from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>
}) {
  const { next, denied } = await searchParams
  return (
    <main className="login-wrap">
      <h1>Log in</h1>
      <LoginForm next={safeNextPath(next ?? '')} denied={denied === '1'} />
    </main>
  )
}
```

- [ ] **Step 6: Write `scripts/create-admin.ts`**

```ts
import { parseArgs } from 'node:util'
import { getPool } from '../src/db/pool'
import { createUser, UserInputError } from '../src/lib/users'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string' },
    handle: { type: 'string' },
    role: { type: 'string', default: 'admin' },
  },
})

if (!values.email || !values.password || !values.name || !values.handle) {
  console.error("Usage: pnpm create-admin --email you@example.com --password '...' --name 'Your Name' --handle yourhandle [--role admin|editor|moderator]")
  process.exit(1)
}

const role = values.role
if (role !== 'admin' && role !== 'editor' && role !== 'moderator') {
  console.error('--role must be admin, editor or moderator')
  process.exit(1)
}

const pool = getPool()
try {
  const id = await createUser(pool, {
    email: values.email,
    password: values.password,
    displayName: values.name,
    handle: values.handle,
    role,
  })
  console.log(`Created ${role} user #${id} (${values.email})`)
} catch (error) {
  if (error instanceof UserInputError) {
    console.error(error.message)
    process.exitCode = 1
  } else {
    throw error
  }
} finally {
  await pool.end()
}
```

- [ ] **Step 7: Create the first admin in the dev database**

```bash
pnpm create-admin --email owner@example.com --password 'dev-password-123' --name 'Owner' --handle owner
```
Expected: `Created admin user #1 (owner@example.com)`.

- [ ] **Step 8: Typecheck and commit**

```bash
pnpm typecheck
git add src/lib src/app/login scripts/create-admin.ts
git commit -m "feat(auth): add session cookie helpers, login page, logout action and create-admin script" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: typecheck exits 0.

---

### Task 14: Admin shell and dashboard

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Write `src/app/admin/layout.tsx`**

```tsx
import Link from 'next/link'
import { logoutAction } from '@/app/login/actions'
import { requireUser } from '@/lib/current-user'
import { ADMIN_AREA_ROLES } from '@/lib/roles'
import { ENTITIES } from '@/registry/entities'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(ADMIN_AREA_ROLES)
  const entities = Object.values(ENTITIES).filter((entity) => entity.roles.read.includes(user.role))
  const canEditTaxonomy = user.role === 'admin' || user.role === 'editor'

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <i />
          ThePromptGalaxy
        </div>
        <Link href="/admin/">Dashboard</Link>
        {entities.map((entity) => (
          <Link key={entity.key} href={`/admin/${entity.key}/`}>
            {entity.plural}
          </Link>
        ))}
        {canEditTaxonomy ? <Link href="/admin/matrix/">Relations matrix</Link> : null}
        <div className="admin-user">
          {user.displayName}
          <br />
          <span>{user.role}</span>
          <form action={logoutAction} className="inline-form">
            <button className="link" type="submit">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/admin/page.tsx`**

```tsx
import { getPool } from '@/db/pool'

export default async function AdminDashboard() {
  const { rows } = await getPool().query<{ categories: number; tools: number; styles: number; prompts: number; links: number }>(
    `SELECT (SELECT count(*)::int FROM categories) AS categories,
            (SELECT count(*)::int FROM tools) AS tools,
            (SELECT count(*)::int FROM styles) AS styles,
            (SELECT count(*)::int FROM prompts) AS prompts,
            (SELECT count(*)::int FROM category_tools) AS links`,
  )
  const counts = rows[0]
  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
      </div>
      <table className="table">
        <tbody>
          <tr><td>Categories</td><td>{counts.categories}</td></tr>
          <tr><td>Tools</td><td>{counts.tools}</td></tr>
          <tr><td>Styles</td><td>{counts.styles}</td></tr>
          <tr><td>Category × tool links</td><td>{counts.links}</td></tr>
          <tr><td>Prompts</td><td>{counts.prompts}</td></tr>
        </tbody>
      </table>
    </>
  )
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/app/admin
git commit -m "feat(admin): add role-guarded admin shell and dashboard" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: typecheck exits 0.

---

### Task 15: Generic entity screens (list, create, edit, delete)

**Files:**
- Create: `src/app/admin/[entity]/actions.ts`, `src/app/admin/[entity]/EntityForm.tsx`, `src/app/admin/[entity]/page.tsx`, `src/app/admin/[entity]/new/page.tsx`, `src/app/admin/[entity]/[id]/page.tsx`

- [ ] **Step 1: Write `src/app/admin/[entity]/actions.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/app/admin/[entity]/EntityForm.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import type { FormState } from '@/registry/form-state'
import type { FieldDef } from '@/registry/types'
import { saveEntity } from './actions'

type Props = {
  entityKey: string
  singular: string
  fields: FieldDef[]
  id?: number
  values: Record<string, unknown>
}

const initial: FormState = { errors: {} }

function FieldInput({ field, value, error }: { field: FieldDef; value: unknown; error?: string }) {
  const id = `f-${field.name}`
  let control: React.ReactNode
  switch (field.type) {
    case 'textarea':
      control = <textarea id={id} name={field.name} className="input" rows={4} defaultValue={String(value ?? '')} />
      break
    case 'number':
      control = <input id={id} name={field.name} className="input" type="number" step={1} defaultValue={String(value ?? '')} />
      break
    case 'boolean':
      control = (
        <label className="check">
          <input id={id} name={field.name} type="checkbox" defaultChecked={Boolean(value)} />
          {field.label}
        </label>
      )
      break
    case 'select':
      control = (
        <select id={id} name={field.name} className="input" defaultValue={String(value ?? '')}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
      break
    default:
      control = <input id={id} name={field.name} className="input" type="text" defaultValue={String(value ?? '')} />
  }
  return (
    <div className="field">
      {field.type === 'boolean' ? null : <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>}
      {control}
      {field.help ? <div className="field-help">{field.help}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}

export function EntityForm({ entityKey, singular, fields, id, values }: Props) {
  const [state, action, pending] = useActionState(saveEntity, initial)
  const current = { ...values, ...(state.values ?? {}) }
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="__entity" value={entityKey} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}
      {state.errors._ ? <div className="banner banner-error">{state.errors._}</div> : null}
      {fields.map((field) => (
        <FieldInput key={field.name} field={field} value={current[field.name]} error={state.errors[field.name]} />
      ))}
      <div className="actions">
        <button className="btn btn-primary" disabled={pending}>
          {id ? 'Save changes' : `Create ${singular.toLowerCase()}`}
        </button>
        <a className="btn btn-secondary" href={`/admin/${entityKey}/`}>
          Cancel
        </a>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Write `src/app/admin/[entity]/page.tsx`**

```tsx
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
```

- [ ] **Step 4: Write `src/app/admin/[entity]/new/page.tsx`**

```tsx
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
```

- [ ] **Step 5: Write `src/app/admin/[entity]/[id]/page.tsx`**

```tsx
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
```

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck
```
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin
git commit -m "feat(admin): add registry-driven list, create, edit and delete screens" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: Relations matrix screens

**Files:**
- Create: `src/app/admin/matrix/actions.ts`, `src/app/admin/matrix/page.tsx`, `src/app/admin/matrix/combo/[categoryId]/[toolId]/page.tsx`

- [ ] **Step 1: Write `src/app/admin/matrix/actions.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { getPool, withTransaction } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { COMBO_FIELDS } from '@/matrix/combo-fields'
import { setStyleLink, setToolLink, updateCombo, type ComboPatch } from '@/matrix/repo'
import { formDataToInput, validateInput } from '@/registry/validate'

const MATRIX_ROLES = ['admin', 'editor'] as const

function back(tab: 'tools' | 'styles', error?: string): never {
  const params = new URLSearchParams()
  if (tab === 'styles') params.set('tab', 'styles')
  if (error) params.set('error', error)
  const query = params.toString()
  redirect(`/admin/matrix/${query ? `?${query}` : ''}`)
}

export async function toggleToolLink(formData: FormData): Promise<void> {
  const user = await requireUser(MATRIX_ROLES)
  const categoryId = Number(formData.get('categoryId'))
  const toolId = Number(formData.get('toolId'))
  const enabled = formData.get('enabled') === 'true'
  if (!Number.isInteger(categoryId) || !Number.isInteger(toolId)) back('tools', 'Invalid request.')
  const result = await withTransaction(getPool(), (tx) => setToolLink(tx, categoryId, toolId, enabled, user.id))
  back('tools', result.ok ? undefined : result.reason)
}

export async function toggleStyleLink(formData: FormData): Promise<void> {
  const user = await requireUser(MATRIX_ROLES)
  const categoryId = Number(formData.get('categoryId'))
  const styleId = Number(formData.get('styleId'))
  const enabled = formData.get('enabled') === 'true'
  if (!Number.isInteger(categoryId) || !Number.isInteger(styleId)) back('styles', 'Invalid request.')
  const result = await withTransaction(getPool(), (tx) => setStyleLink(tx, categoryId, styleId, enabled, user.id))
  back('styles', result.ok ? undefined : result.reason)
}

export async function saveCombo(formData: FormData): Promise<void> {
  const user = await requireUser(MATRIX_ROLES)
  const categoryId = Number(formData.get('categoryId'))
  const toolId = Number(formData.get('toolId'))
  if (!Number.isInteger(categoryId) || !Number.isInteger(toolId)) back('tools', 'Invalid request.')

  const comboPath = `/admin/matrix/combo/${categoryId}/${toolId}/`
  const validated = validateInput({ fields: COMBO_FIELDS }, formDataToInput({ fields: COMBO_FIELDS }, formData))
  if (!validated.ok) {
    redirect(`${comboPath}?error=${encodeURIComponent(Object.values(validated.errors).join(' '))}`)
  }
  const result = await withTransaction(getPool(), (tx) =>
    updateCombo(tx, categoryId, toolId, validated.value as unknown as ComboPatch, user.id),
  )
  if (!result.ok) redirect(`${comboPath}?error=${encodeURIComponent(result.reason)}`)
  back('tools')
}
```

- [ ] **Step 2: Write `src/app/admin/matrix/page.tsx`**

```tsx
import Link from 'next/link'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getStyleMatrix, getToolMatrix } from '@/matrix/repo'
import { toggleStyleLink, toggleToolLink } from './actions'

export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { tab, error } = await searchParams
  const stylesTab = tab === 'styles'
  const db = getPool()

  return (
    <>
      <div className="admin-head">
        <h1>Relations matrix</h1>
      </div>
      <nav className="tabs">
        <Link href="/admin/matrix/" aria-current={stylesTab ? undefined : 'page'}>
          Categories × tools
        </Link>
        <Link href="/admin/matrix/?tab=styles" aria-current={stylesTab ? 'page' : undefined}>
          Categories × styles
        </Link>
      </nav>
      {error ? <div className="banner banner-error">{error}</div> : null}
      <p className="matrix-legend">
        Click a cell to link or unlink. The number is how many <strong>published</strong> prompts use that pair; it is
        counted live, never typed. A pair used by prompts cannot be unlinked.
      </p>
      {stylesTab ? await StyleGrid() : await ToolGrid()}
    </>
  )

  async function ToolGrid() {
    const { categories, tools, links } = await getToolMatrix(db)
    const byPair = new Map(links.map((link) => [`${link.categoryId}:${link.toolId}`, link]))
    if (categories.length === 0 || tools.length === 0) {
      return <p>Create at least one category and one tool first.</p>
    }
    return (
      <table className="table matrix">
        <thead>
          <tr>
            <th>Category</th>
            {tools.map((tool) => (
              <th key={tool.id}>
                {tool.name}
                {tool.isActive ? null : ' (hidden)'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id}>
              <td>
                {category.name}
                {category.isActive ? null : ' (hidden)'}
              </td>
              {tools.map((tool) => {
                const link = byPair.get(`${category.id}:${tool.id}`)
                return (
                  <td key={tool.id} className={link ? 'cell-on' : 'cell-off'}>
                    <div className="actions" style={{ justifyContent: 'center' }}>
                      <form action={toggleToolLink} className="inline-form">
                        <input type="hidden" name="categoryId" value={category.id} />
                        <input type="hidden" name="toolId" value={tool.id} />
                        <input type="hidden" name="enabled" value={link ? 'false' : 'true'} />
                        <button className="btn btn-secondary" type="submit" title={link ? 'Unlink' : 'Link'}>
                          {link ? link.publishedCount : '+'}
                        </button>
                      </form>
                      {link ? (
                        <Link href={`/admin/matrix/combo/${category.id}/${tool.id}/`} title="Combination settings">
                          edit
                        </Link>
                      ) : null}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  async function StyleGrid() {
    const { categories, styles, links } = await getStyleMatrix(db)
    const byPair = new Map(links.map((link) => [`${link.categoryId}:${link.styleId}`, link]))
    if (categories.length === 0 || styles.length === 0) {
      return <p>Create at least one category and one style first.</p>
    }
    return (
      <table className="table matrix">
        <thead>
          <tr>
            <th>Category</th>
            {styles.map((style) => (
              <th key={style.id}>
                {style.name}
                {style.isActive ? null : ' (hidden)'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id}>
              <td>
                {category.name}
                {category.supportsStyles ? null : ' (no styles)'}
              </td>
              {styles.map((style) => {
                const link = byPair.get(`${category.id}:${style.id}`)
                return (
                  <td key={style.id} className={link ? 'cell-on' : 'cell-off'}>
                    {category.supportsStyles ? (
                      <form action={toggleStyleLink} className="inline-form">
                        <input type="hidden" name="categoryId" value={category.id} />
                        <input type="hidden" name="styleId" value={style.id} />
                        <input type="hidden" name="enabled" value={link ? 'false' : 'true'} />
                        <button className="btn btn-secondary" type="submit" title={link ? 'Unlink' : 'Link'}>
                          {link ? link.publishedCount : '+'}
                        </button>
                      </form>
                    ) : (
                      '–'
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
}
```

- [ ] **Step 3: Write `src/app/admin/matrix/combo/[categoryId]/[toolId]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/db/pool'
import { requireUser } from '@/lib/current-user'
import { getToolLink } from '@/matrix/repo'
import { saveCombo } from '../../../actions'

export default async function ComboPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; toolId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await requireUser(['admin', 'editor'])
  const { categoryId: categoryText, toolId: toolText } = await params
  const categoryId = Number(categoryText)
  const toolId = Number(toolText)
  if (!Number.isInteger(categoryId) || !Number.isInteger(toolId)) notFound()
  const link = await getToolLink(getPool(), categoryId, toolId)
  if (!link) notFound()
  const { error } = await searchParams

  return (
    <>
      <div className="admin-head">
        <h1>
          {link.categoryName} × {link.toolName}
        </h1>
        <Link className="btn btn-secondary" href="/admin/matrix/">
          Back to matrix
        </Link>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}
      <p className="matrix-legend">
        {link.publishedCount} published prompt(s) currently use this combination ({link.usageCount} in total).
      </p>
      <form action={saveCombo} className="form-grid">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="toolId" value={toolId} />
        <div className="field">
          <label htmlFor="sortOrder">Order within the category</label>
          <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={link.sortOrder} />
        </div>
        <label className="check">
          <input name="isFeatured" type="checkbox" defaultChecked={link.isFeatured} />
          Featured (show this tool first on the category page)
        </label>
        <label className="check">
          <input name="isIndexable" type="checkbox" defaultChecked={link.isIndexable} />
          Indexable combination page (own title and intro for search engines)
        </label>
        <div className="field">
          <label htmlFor="seoTitle">SEO title</label>
          <input id="seoTitle" name="seoTitle" type="text" className="input" defaultValue={link.seoTitle} />
        </div>
        <div className="field">
          <label htmlFor="seoDescription">SEO description</label>
          <textarea id="seoDescription" name="seoDescription" className="input" rows={3} defaultValue={link.seoDescription} />
        </div>
        <div className="field">
          <label htmlFor="intro">Intro text</label>
          <textarea id="intro" name="intro" className="input" rows={5} defaultValue={link.intro} />
        </div>
        <div className="actions">
          <button className="btn btn-primary" type="submit">
            Save combination
          </button>
        </div>
      </form>
    </>
  )
}
```

- [ ] **Step 4: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```
Expected: typecheck exits 0; the build succeeds and lists the routes `/`, `/login`, `/admin`, `/admin/[entity]`, `/admin/[entity]/new`, `/admin/[entity]/[id]`, `/admin/matrix`, `/admin/matrix/combo/[categoryId]/[toolId]`. (If the build cannot download the Archivo font, retry once; it needs internet access at build time.)

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/matrix
git commit -m "feat(admin): add category-tool and category-style relations matrix screens" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: End-to-end verification, notes and push

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-custom-cms-rebuild-design.md` (only if the build revealed a needed correction)

- [ ] **Step 1: Run the full automated checks**

```bash
pnpm test
pnpm typecheck
pnpm build
```
Expected: every test passes (about 76 tests), typecheck exits 0, build succeeds.

- [ ] **Step 2: Start the dev server**

```bash
pnpm dev
```
Leave it running (background). Expected: `Ready` on http://localhost:3000.

- [ ] **Step 3: Manual walk-through in the browser (built-in browser tools)**

Open `http://localhost:3000/login/`, then check each item and note the result:

1. Visiting `http://localhost:3000/admin/` while signed out redirects to `/login/`.
2. Logging in with `owner@example.com` / `dev-password-123` lands on `/admin/` (Dashboard shows all zeros).
3. Wrong password shows "Email or password is incorrect."
4. Categories → New category: name `Portrait`, leave slug empty, Create. The list shows slug `portrait`. Create `Travel` too.
5. Tools → create `Midjourney` and `ChatGPT`. Styles → create `Cinematic`.
6. Relations matrix: click the `+` cell for Portrait × Midjourney; it turns into `0` (no published prompts yet). Click `edit`, set "Indexable" and an SEO title, Save; reopen and confirm the values persisted.
7. Matrix → Categories × styles: link Portrait × Cinematic.
8. Edit Travel and untick "Supports art styles", save. In the styles tab, the Travel row shows "–" cells.
9. Edit category Portrait, change slug to `portraits`, save. Query `SELECT * FROM redirects;` in the dev database and confirm `/category/portrait/ → /category/portraits/`.
10. Insert a prompt with SQL that uses the linked pair, then try to unlink Portrait × Midjourney in the matrix and confirm the red banner explains why it is blocked; try to delete Portrait and confirm the deletion is blocked with a message.
11. Log out (sidebar) and confirm `/admin/` redirects to `/login/` again.

Use this SQL for item 10 (run with `psql` against the dev database):

```sql
INSERT INTO prompts (slug, title, category_id, status)
SELECT 'studio-headshot', 'Studio headshot', id, 'published' FROM categories WHERE slug = 'portraits';
INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary)
SELECT p.id, p.category_id, t.id, true FROM prompts p, tools t WHERE p.slug = 'studio-headshot' AND t.slug = 'midjourney';
```

- [ ] **Step 4: Stop the dev server, clean the dev data if wanted**

Stop the dev server. The dev database may keep its test rows.

- [ ] **Step 5: Update the project memory note**

Edit `C:\Users\HRH\.claude\projects\F--Shahbaz-thepromptgalaxy\memory\project_current_status.md`: under the "SUPERSEDING STATUS" block add one line: `Plan 1A (foundation, auth, generic admin, taxonomy + relation matrix) implemented on branch rebuild/custom-cms; plans 1B (media + prompts), 1C (public site), 1D (deploy/backups) still to do.`

- [ ] **Step 6: Commit any remaining changes and ask about pushing**

```bash
git status --porcelain
git log --oneline -20
```
Expected: no unexpected changes; the commit list shows the tasks above.

Ask the owner whether to push the branch to GitHub as an off-machine backup (recommended, given what happened to the server):

```bash
git push -u origin rebuild/custom-cms
```
Run only after the owner says yes.

---

## Self-review checklist (completed while writing this plan)

- **Spec coverage for Phase 1A scope:** flat URL rules → registry `publicPathPrefix` + redirects (Task 10); dynamic category × tool × style matrix with live counts → Tasks 5, 11, 16; database-enforced relation rules and deletion rules → Tasks 5, 10, 11; admin registry, generic screens, role guards → Tasks 9, 14, 15; auth (sessions, scrypt, logout) → Tasks 7, 8, 13; migrations runner → Task 4; audit log → Tasks 5, 10, 11. Items intentionally deferred to later plans are listed under "Out of scope".
- **Type consistency:** `Queryable` (Task 3) is used by every repository; `EntityDef`/`FieldDef` (Task 9) are used by validate, repo, forms and combo fields; `ToggleResult`, `ToolLink`, `StyleLink`, `ComboPatch` (Task 11) are used by the matrix actions and pages; `FormState` lives in `src/registry/form-state.ts` and is imported by the action and the client form.
- **If `pnpm typecheck` reports that `pg.PoolClient` is not assignable to `Queryable`** (`Pick<pg.Pool, 'query'>`) in the `withTransaction` call sites, change the type in `src/db/pool.ts` to a structural interface: `export interface Queryable { query<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>> }`.
