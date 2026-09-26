# Phase 1C — Public Site (home, hubs, prompt page, SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the placeholder home page with the public site from the Claude Design files: home ("two doors"), category / tool / style hubs with live filters, the prompt detail page, redirects for old slugs, sitemap, robots and structured data. All numbers on screen are computed from published prompts; nothing is hard-coded.

**Architecture:** Server components read through a small query layer (`src/site/`) that only ever returns published, active content. Pages are dynamic (no page cache yet; caching comes in plan 1D). Filters are plain query strings (`?tool=&style=&fit=great&price=free&sort=saved&page=2`) so every state is a link. Two small client components: the home "two doors" selector and the copy button. Old URLs are served by a catch-all route that looks the path up in `redirects`.

**Tech Stack:** Next.js 16 server components, `pg`, Vitest, existing Modernist CSS.

**Spec:** `docs/superpowers/specs/2026-09-24-custom-cms-rebuild-design.md` (sections 6, 8).
**Design source:** `ThePromptGalaxy Design.zip` (Homepage, CategoryPage, ToolPage, PromptDetail, PromptCard).

## Decisions made in this plan (override any you disagree with)

1. **Flat URLs, as agreed:** `/prompt/{slug}/`, `/category/{slug}/`, `/tool/{slug}/`, `/style/{slug}/`. The design's `github.md` mapped detail pages to `[subject]/[style]/[slug]`; that is not used.
2. **Combos are query filters.** `/category/portrait/?tool=midjourney` is a filtered view. It is indexable only when that pair's "indexable" flag is on in the matrix (canonical to itself); otherwise it is `noindex` with a canonical to the plain category page.
3. **Premium prompts:** until payments exist (Phase 3) the prompt text of a premium prompt is **not sent to the browser at all**; the page shows a locked panel with a "Go Premium" button that links to `/premium/` (a stub page: "coming soon"). Title, summary, example image, tools and FAQs stay public.
4. **Not built here (they need accounts, Phase 2):** Save button and save counts changing, submit-prompt, login/register pages of the design, search results (plan 1D), About/Contact/Privacy content pages (plan 1D, editable in admin). The nav links to them are hidden until they exist.
5. **Redirects** use `permanentRedirect` (HTTP 308, treated like 301 by Google).
6. **"Mirror" strip on the category page** (top category of a tool) becomes: on `/category/x/?tool=y`, a link "All {tool} prompts" to `/tool/y/`; on the tool hub the reverse.
7. **Sort options:** most saved (default), newest. **Price:** all / free / premium. **Great fit only** filters `prompt_tools.fit = 'great'` for the chosen tool.
8. Page size 24, numbered pagination.

## Out of scope
Search, static pages, menus and homepage builder (plan 1D), page caching, ads, analytics, accounts, payments.

## Conventions
Same as plan 1B: branch `rebuild/custom-cms`, run from `F:/Shahbaz/thepromptgalaxy`, DB tests need the dev tunnel (`ssh -i ~/.ssh/id_ed25519 -o ServerAliveInterval=15 -o ExitOnForwardFailure=yes -N -L 5434:127.0.0.1:5432 root@46.250.239.74` in the background), commits end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, files with `$`/apostrophes are written with the file tool. Deploy as before (`git archive` → scp → build → `pm2 restart`). Verify on the VPS, not with a local dev server.

## File structure

```
src/site/types.ts            card / detail / hub types + URL helpers
src/site/cards.ts            listCards(filters) – the one query behind every grid
src/site/hubs.ts             getCategoryHub / getToolHub / getStyleHub, getHome, getNav
src/site/prompt.ts           getPublicPrompt(slug)
src/site/redirects.ts        resolveRedirect(path)
src/site/*.test.ts
src/app/(site)/layout.tsx    nav + footer
src/app/(site)/page.tsx      home            (moves src/app/page.tsx)
src/app/(site)/HomeDoors.tsx client selector
src/app/(site)/category/[slug]/page.tsx, tool/[slug]/page.tsx, style/[slug]/page.tsx
src/app/(site)/prompt/[slug]/page.tsx, CopyButton.tsx
src/app/(site)/premium/page.tsx
src/app/(site)/[...path]/page.tsx   redirect catch-all
src/app/sitemap.ts, robots.ts
src/components/site/PromptCard.tsx, Pager.tsx, HubFilters.tsx
src/styles/site.css
```

---

### Task 1: URL helpers and card query (TDD)

**Files:** Create `src/site/types.ts`, `src/site/cards.ts`; Test `src/site/cards.test.ts`

- [ ] **Step 1: Write `src/site/types.ts`**

```ts
export type Card = {
  id: number
  slug: string
  title: string
  categoryName: string
  categorySlug: string
  authorHandle: string | null
  saveCount: number
  isPremium: boolean
  isChain: boolean
  stepCount: number
  exampleMediaId: number | null
  primaryToolName: string | null
}

export type CardFilters = {
  categoryId?: number
  toolId?: number
  styleId?: number
  greatFitOnly?: boolean
  price?: 'free' | 'premium'
  sort?: 'saved' | 'newest'
  limit: number
  offset: number
}

export const promptUrl = (slug: string) => `/prompt/${slug}/`
export const categoryUrl = (slug: string) => `/category/${slug}/`
export const toolUrl = (slug: string) => `/tool/${slug}/`
export const styleUrl = (slug: string) => `/style/${slug}/`

export function compactNumber(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(Math.round(n / 100) / 10).toString().replace(/\.0$/, '')}k`
  return String(n)
}
```

- [ ] **Step 2: Write the failing test `src/site/cards.test.ts`** (seed: categories portrait/travel, tools mj/gpt, style cinematic, media, five prompts with statuses, saves, premium, chain)

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { listCards } from '@/site/cards'
import { compactNumber } from '@/site/types'
import { closeTestPool, resetDb } from '@/test/db'

let pool: Awaited<ReturnType<typeof resetDb>>
const ids: Record<string, number> = {}

async function one(sql: string, params: unknown[] = []): Promise<number> {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id
}

async function prompt(key: string, o: { cat: string; status?: string; saves?: number; premium?: boolean; chain?: boolean; tools?: [string, 'great' | 'good'][]; styles?: string[]; published?: string }) {
  const id = await one(
    `INSERT INTO prompts (slug, title, category_id, status, save_count, is_premium, is_chain, published_at, author_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [key, key.toUpperCase(), ids[o.cat], o.status ?? 'published', o.saves ?? 0, o.premium ?? false, o.chain ?? false, (o.status ?? 'published') === 'published' ? (o.published ?? '2026-09-01') : null, ids.user],
  )
  ids[key] = id
  for (const [i, [tool, fit]] of (o.tools ?? []).entries()) {
    await pool.query('INSERT INTO prompt_tools (prompt_id, category_id, tool_id, is_primary, fit) VALUES ($1,$2,$3,$4,$5)', [id, ids[o.cat], ids[tool], i === 0, fit])
  }
  for (const s of o.styles ?? []) await pool.query('INSERT INTO prompt_styles (prompt_id, category_id, style_id) VALUES ($1,$2,$3)', [id, ids[o.cat], ids[s]])
  if (o.chain) for (const p of [0, 1]) await pool.query(`INSERT INTO prompt_steps (prompt_id, position, text) VALUES ($1,$2,'t')`, [id, p])
}

beforeEach(async () => {
  pool = await resetDb()
  ids.user = await one(`INSERT INTO users (email, password_hash, display_name, handle) VALUES ('a@x.com','x','A','lensfox') RETURNING id`)
  ids.portrait = await one(`INSERT INTO categories (slug, name) VALUES ('portrait','Portrait') RETURNING id`)
  ids.travel = await one(`INSERT INTO categories (slug, name) VALUES ('travel','Travel') RETURNING id`)
  ids.mj = await one(`INSERT INTO tools (slug, name) VALUES ('midjourney','Midjourney') RETURNING id`)
  ids.gpt = await one(`INSERT INTO tools (slug, name) VALUES ('chatgpt','ChatGPT') RETURNING id`)
  ids.cine = await one(`INSERT INTO styles (slug, name) VALUES ('cinematic','Cinematic') RETURNING id`)
  for (const [c, t] of [['portrait', 'mj'], ['portrait', 'gpt'], ['travel', 'gpt']]) await pool.query('INSERT INTO category_tools (category_id, tool_id) VALUES ($1,$2)', [ids[c], ids[t]])
  await pool.query('INSERT INTO category_styles (category_id, style_id) VALUES ($1,$2)', [ids.portrait, ids.cine])
  await prompt('a', { cat: 'portrait', saves: 30, tools: [['mj', 'great']], styles: ['cine'], published: '2026-09-03' })
  await prompt('b', { cat: 'portrait', saves: 50, premium: true, chain: true, tools: [['gpt', 'good'], ['mj', 'good']], published: '2026-09-01' })
  await prompt('c', { cat: 'travel', saves: 10, tools: [['gpt', 'great']], published: '2026-09-02' })
  await prompt('d', { cat: 'portrait', status: 'draft', saves: 999, tools: [['mj', 'great']] })
})
afterAll(closeTestPool)

const titles = async (f: Partial<Parameters<typeof listCards>[1]> = {}) =>
  (await listCards(pool, { limit: 24, offset: 0, ...f })).cards.map((c) => c.slug)

describe('listCards', () => {
  it('returns only published prompts, most saved first, with the total', async () => {
    const { cards, total } = await listCards(pool, { limit: 24, offset: 0 })
    expect(cards.map((c) => c.slug)).toEqual(['b', 'a', 'c'])
    expect(total).toBe(3)
    expect(cards[0]).toMatchObject({ authorHandle: 'lensfox', isPremium: true, isChain: true, stepCount: 2, primaryToolName: 'ChatGPT', categoryName: 'Portrait' })
  })
  it('sorts by newest', async () => {
    expect(await titles({ sort: 'newest' })).toEqual(['a', 'c', 'b'])
  })
  it('filters by category, tool and style', async () => {
    expect(await titles({ categoryId: ids.portrait })).toEqual(['b', 'a'])
    expect(await titles({ toolId: ids.gpt })).toEqual(['b', 'c'])
    expect(await titles({ categoryId: ids.portrait, toolId: ids.mj })).toEqual(['b', 'a'])
    expect(await titles({ styleId: ids.cine })).toEqual(['a'])
  })
  it('great-fit-only applies to the chosen tool', async () => {
    expect(await titles({ toolId: ids.mj, greatFitOnly: true })).toEqual(['a'])
    expect(await titles({ toolId: ids.gpt, greatFitOnly: true })).toEqual(['c'])
  })
  it('filters by price and paginates', async () => {
    expect(await titles({ price: 'premium' })).toEqual(['b'])
    expect(await titles({ price: 'free' })).toEqual(['a', 'c'])
    const page2 = await listCards(pool, { limit: 2, offset: 2 })
    expect(page2.cards.map((c) => c.slug)).toEqual(['c'])
    expect(page2.total).toBe(3)
  })
  it('hides prompts whose category is inactive', async () => {
    await pool.query('UPDATE categories SET is_active = false WHERE id = $1', [ids.travel])
    expect(await titles()).toEqual(['b', 'a'])
  })
})

describe('compactNumber', () => {
  it('shortens large numbers', () => {
    expect([950, 1200, 3400, 15000].map(compactNumber)).toEqual(['950', '1.2k', '3.4k', '15k'])
  })
})
```

- [ ] **Step 3: Run to verify it fails** — `pnpm test src/site/cards.test.ts` → cannot resolve `@/site/cards`.

- [ ] **Step 4: Write `src/site/cards.ts`**

```ts
import type { Queryable } from '@/db/pool'
import type { Card, CardFilters } from '@/site/types'

export async function listCards(db: Queryable, f: CardFilters): Promise<{ cards: Card[]; total: number }> {
  const params = [
    f.categoryId ?? null,
    f.toolId ?? null,
    f.styleId ?? null,
    f.greatFitOnly === true,
    f.price ?? null,
  ]
  const where = `
    WHERE p.status = 'published' AND c.is_active
      AND ($1::bigint IS NULL OR p.category_id = $1)
      AND ($2::bigint IS NULL OR EXISTS (
            SELECT 1 FROM prompt_tools x WHERE x.prompt_id = p.id AND x.tool_id = $2 AND (NOT $4 OR x.fit = 'great')))
      AND ($3::bigint IS NULL OR EXISTS (SELECT 1 FROM prompt_styles s WHERE s.prompt_id = p.id AND s.style_id = $3))
      AND ($5::text IS NULL OR ($5 = 'premium' AND p.is_premium) OR ($5 = 'free' AND NOT p.is_premium))`
  const order = f.sort === 'newest' ? 'p.published_at DESC, p.id DESC' : 'p.save_count DESC, p.published_at DESC, p.id DESC'
  const [list, count] = await Promise.all([
    db.query<Card>(
      `SELECT p.id, p.slug, p.title, c.name AS "categoryName", c.slug AS "categorySlug", u.handle AS "authorHandle",
              p.save_count AS "saveCount", p.is_premium AS "isPremium", p.is_chain AS "isChain",
              (SELECT count(*)::int FROM prompt_steps st WHERE st.prompt_id = p.id) AS "stepCount",
              p.example_media_id AS "exampleMediaId", t.name AS "primaryToolName"
         FROM prompts p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN users u ON u.id = p.author_id
         LEFT JOIN prompt_tools pt ON pt.prompt_id = p.id AND pt.is_primary
         LEFT JOIN tools t ON t.id = pt.tool_id
         ${where}
        ORDER BY ${order} LIMIT $6 OFFSET $7`,
      [...params, f.limit, f.offset],
    ),
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM prompts p JOIN categories c ON c.id = p.category_id ${where}`, params),
  ])
  return { cards: list.rows, total: count.rows[0].n }
}
```

- [ ] **Step 5: Run to verify it passes, typecheck, commit** — expected 7 tests pass.

```bash
pnpm test src/site/cards.test.ts && pnpm typecheck
git add src/site && git commit -m "feat(site): add public card query with tool, style, fit and price filters" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Public prompt query with premium redaction (TDD)

**Files:** Create `src/site/prompt.ts`; Test `src/site/prompt.test.ts`

`getPublicPrompt(db, slug)` returns `null` unless the prompt is published and its category is active; otherwise:

```ts
export type PublicPrompt = {
  id: number; slug: string; title: string; summary: string
  category: { id: number; name: string; slug: string }
  author: string | null; saveCount: number; publishedAt: Date; updatedAt: Date
  isPremium: boolean; isChain: boolean
  /** null for premium prompts (text is never sent to the browser) */
  promptText: string | null
  steps: { label: string; text: string | null; exampleMediaId: number | null }[]
  referenceRequired: boolean; referenceNote: string
  exampleMediaId: number | null
  quickAnswer: string; articleHtml: string
  tools: { id: number; name: string; slug: string; fit: 'great' | 'good'; isPrimary: boolean }[]
  styles: { id: number; name: string; slug: string }[]
  faqs: { question: string; answer: string }[]
  similar: Card[]                 // published + active only, in saved order
  seoTitle: string; seoDescription: string
}
```

- [ ] **Step 1: Failing tests** covering: draft/archived/inactive-category → `null`; free prompt returns `promptText` and step texts; premium prompt returns `promptText: null` and every `steps[].text` null but keeps labels and step media; tools ordered primary first with fit; similar excludes drafts and keeps `position` order; unknown slug → `null`.
- [ ] **Step 2: Implement** with the same select-list pattern as plan 1B `getPromptForEdit` plus joins to `tools`/`styles`/`categories`/`users`; `similar` comes from `similar_prompts` joined to `prompts` where `status='published'`, mapped to `Card` with the same column list as `listCards` (extract the column list into a shared constant `CARD_SELECT` in `cards.ts` and reuse it).
- [ ] **Step 3: Run tests, typecheck, commit** `feat(site): add public prompt query that never returns premium text`.

---

### Task 3: Hub, home and navigation queries (TDD)

**Files:** Create `src/site/hubs.ts`; Test `src/site/hubs.test.ts`

Functions (all return only active rows, counts = published prompts, computed live):

- `getNav(db)` → `{ categories: {slug,name,count}[]; tools: {slug,name,count}[]; totals: { prompts, categories, tools } }`, ordered by `sort_order, name`.
- `getHome(db)` → `{ categories: (…count)[], tools: (…count)[], pairCounts: {categoryId,toolId,count}[], styles: {slug,name}[], mostSaved: Card[] (4), totals }`. `pairCounts` come from `prompt_tools` join published prompts, so the home selector shows real "N with ChatGPT" numbers.
- `getCategoryHub(db, slug)` → `null` if missing/inactive; else `{ category, tools: {id,slug,name,count,isIndexable}[] (linked + active, with published counts in this category), styles: {id,slug,name,count}[] (only if `supports_styles`), intro? }` — `intro`/SEO come from `category_tools` only when a tool filter is passed (`getComboMeta(db, categoryId, toolId)` → `{ seoTitle, seoDescription, intro, isIndexable } | null`).
- `getToolHub(db, slug)` → mirror: `{ tool, categories: {id,slug,name,count}[] }`.
- `getStyleHub(db, slug)` → `{ style, categories: {id,slug,name,count}[] }`.

- [ ] **Step 1: Failing tests:** counts ignore drafts; inactive categories/tools disappear from nav and hubs; `getCategoryHub('travel')` lists only linked tools with per-category counts; styles omitted when `supports_styles=false`; `getComboMeta` returns the matrix fields and `null` for unlinked pairs; `getHome().mostSaved` has at most 4 published cards ordered by saves; unknown slug → `null`.
- [ ] **Step 2: Implement** with plain SQL (grouped counts joined to published prompts).
- [ ] **Step 3: Run tests, typecheck, commit** `feat(site): add nav, home and hub queries with live counts`.

---

### Task 4: Redirect resolution and catch-all route (TDD for the lookup)

**Files:** Create `src/site/redirects.ts`, `src/app/(site)/[...path]/page.tsx`; Test `src/site/redirects.test.ts`

```ts
import type { Queryable } from '@/db/pool'

/** Normalizes a request path to the stored form: leading and trailing slash, no query. */
export function normalizePath(segments: string[]): string {
  return '/' + segments.map((s) => decodeURIComponent(s).toLowerCase()).join('/') + '/'
}

export async function resolveRedirect(db: Queryable, path: string): Promise<{ to: string; status: 301 | 302 } | null> {
  const { rows } = await db.query<{ to_path: string; status_code: 301 | 302 }>(
    'SELECT to_path, status_code FROM redirects WHERE from_path = $1',
    [path],
  )
  return rows[0] ? { to: rows[0].to_path, status: rows[0].status_code } : null
}
```

- [ ] **Step 1: Tests:** `normalizePath(['prompt','My-Slug'])` → `/prompt/my-slug/`; `resolveRedirect` returns the stored target and `null` for unknown paths.
- [ ] **Step 2: Catch-all page:** looks the path up; if found `permanentRedirect(to)` (or `redirect` for 302), else `notFound()`. `dynamic = 'force-dynamic'`. Add a real `not-found.tsx` (site styled: heading, "Back to home", links to categories).
- [ ] **Step 3: Commit** `feat(site): serve slug-change redirects and a styled 404`.

---

### Task 5: Site shell, PromptCard, Pager, CSS

**Files:** Create `src/app/(site)/layout.tsx`, `src/components/site/PromptCard.tsx`, `Pager.tsx`, `src/styles/site.css`; Move `src/app/page.tsx` → `src/app/(site)/page.tsx`; Modify `src/app/layout.tsx` (import `site.css`).

- **Layout:** header exactly like the design's `.nav`: brand mark + name, "By category" (menu of active categories with counts) and "By tool" dropdown links to `/category/` and `/tool/` index anchors on the home page (`/#categories`, `/#tools`), social icons (X, Instagram, YouTube; URLs from env `NEXT_PUBLIC_SOCIAL_*` for now, admin setting in 1D), Log in / Submit / Go Premium buttons rendered as links to `/login/`, `/submit/` (hidden until built), `/premium/`. Footer: the four-column footer from the design; the footer totals line ("N tested prompts across M tools and K categories") comes from `getNav().totals`; Company links hidden until pages exist.
- **PromptCard** (server component): 4:5 image area using `/media/{id}/card/` (falls back to `var(--color-neutral-400)` block with "Example output" caption), badges PREMIUM / FREE / `CHAIN · N STEPS`, category kicker, title, author handle, saves via `compactNumber`, whole card is a `<Link href={promptUrl(slug)}>`. The design's Copy button is omitted on cards (copying happens on the detail page).
- **Pager:** previous/next plus numbered links, builds hrefs from the current query string.
- **CSS:** port the inline styles of the design into classes (`.site-nav`, `.site-footer`, `.hero`, `.doors`, `.grid-cards`, `.filters`, `.detail`, …) in `site.css` so pages stay readable.
- [ ] **Step 1:** implement the above; `pnpm typecheck && pnpm build`.
- [ ] **Step 2: Commit** `feat(site): add public layout, prompt card and pager`.

---

### Task 6: Home page

**Files:** `src/app/(site)/page.tsx`, `src/app/(site)/HomeDoors.tsx`

- Server page calls `getHome` and renders: hero, the two-doors block (client `HomeDoors` receives categories, tools, `pairCounts`), the art-styles strip, "Most saved this week" (4 cards, link "See all →" to `/category/{first}/` is replaced by `/prompts/`? **No** — link goes to the most-saved list at `/?`; until search exists the "See all" link is omitted), how-it-works and chain teaser blocks (static copy from the design; the chain example links to the most-saved chain prompt if one exists), premium banner, footer.
- **HomeDoors (client):** state `{category, tool}`; clicking a row toggles it; counts shown are real (`pairCounts`); the hero line and CTA follow the design (`/category/{slug}/?tool={slug}` / `/category/{slug}/` / `/tool/{slug}/`). Empty state when no categories exist yet: "No prompts yet".
- Metadata: title "ThePromptGalaxy – tested AI prompts", description built from totals.
- [ ] **Step 1:** implement; typecheck; build.
- [ ] **Step 2: Commit** `feat(site): add the home page with live two-door selector`.

---

### Task 7: Category, tool and style hubs

**Files:** `src/app/(site)/category/[slug]/page.tsx`, `tool/[slug]/page.tsx`, `style/[slug]/page.tsx`, `src/components/site/HubFilters.tsx`

- Shared parsing helper `parseHubQuery(searchParams)` in `src/site/query.ts` (with a small unit test): `tool`, `category`, `style` slugs, `fit=great`, `price=free|premium`, `sort=saved|newest`, `page` (≥1) → `CardFilters` inputs; unknown values are ignored.
- **Category hub:** heading with the category name and description; tool tabs ("All tools" + linked tools with counts) as links that set `?tool=`; style chips (only if `supports_styles`) set `?style=`; filter row (Great fit only – only when a tool is selected, Price, Sort) rendered as links/`<form method="get">`; card grid + `Pager`; "All {tool} prompts →" link to `/tool/{tool}/` when a tool is selected. Not found / inactive → `notFound()`.
- **Tool hub / style hub:** mirrored with category tabs.
- **Metadata:** title from `seo_title` or `"{Category} prompts – ThePromptGalaxy"`; with a tool filter use the matrix combo's `seoTitle`/`seoDescription`/`intro` when set, canonical = the combo URL when `isIndexable`, else `robots: { index: false }` and canonical = the plain hub. Pages ≥ 2 and any `style`/`fit`/`price`/`sort` query are `noindex, follow`.
- [ ] **Step 1:** write `query.ts` + test; implement pages; typecheck; build.
- [ ] **Step 2: Commit** `feat(site): add category, tool and style hubs with filters and pagination`.

---

### Task 8: Prompt detail page

**Files:** `src/app/(site)/prompt/[slug]/page.tsx`, `CopyButton.tsx`, `src/app/(site)/premium/page.tsx`

- Breadcrumb: Category / primary tool / title (links to `/category/{slug}/`, `/category/{slug}/?tool={tool}`).
- Left: example image (`/media/{id}/card/`, `alt` from media alt). Right: badges, `<h1>`, summary, author, saves, tool tags (primary first, "Great fit" marker), style tags; then the prompt: single prompt box or numbered steps (each with its own optional result image). **Free:** `CopyButton` (client, `navigator.clipboard.writeText`, "Copied" state; for chains "Copy full chain" joins steps with blank lines and per-step buttons). **Premium:** locked panel instead of text, button to `/premium/`.
- Reference-photo note when `referenceRequired`. Then quick answer, article (`dangerouslySetInnerHTML` of the already sanitized HTML), FAQs (native `<details>`), "More {category} prompts on {tool}" using `similar` (fall back to `listCards` same category/tool, excluding itself, limit 4, when there are no manual similar links).
- Metadata: `seoTitle || title`, `seoDescription || summary`, canonical `/prompt/{slug}/`, Open Graph image = `/media/{id}/card/`. JSON-LD: `Article`-style `CreativeWork` with name, description, image, author, datePublished/dateModified, plus `FAQPage` when FAQs exist, plus `BreadcrumbList`. Premium prompts omit the text from JSON-LD too.
- `/premium/` stub: "Premium is coming soon" with a link home.
- [ ] **Step 1:** implement; typecheck; build.
- [ ] **Step 2: Commit** `feat(site): add the prompt detail page with copy, premium lock, FAQ and structured data`.

---

### Task 9: Sitemap and robots

**Files:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/site/sitemap.ts` (+ test)

- `getSitemapEntries(db)` returns: home; every active category, tool and style hub; every **indexable** combo (`category_tools.is_indexable`) as `/category/{c}/?tool={t}`; every published prompt with `lastModified = updated_at`. Test: drafts, inactive categories and non-indexable combos are excluded.
- Base URL from env `SITE_URL` (default `https://thepromptgalaxy.com`); add it to `.env.example`.
- `robots.ts`: allow `/`, disallow `/admin/`, `/login/`, `/account/`, sitemap link.
- [ ] **Step 1:** test first, then implement; **Step 2: Commit** `feat(site): add sitemap and robots`.

---

### Task 10: Verify and deploy

- [ ] **Step 1:** `pnpm test` (all pass, expect about 165), `pnpm typecheck`, `pnpm build`.
- [ ] **Step 2: Deploy** exactly as plan 1B Task 11 Step 3 (no migrations in this plan).
- [ ] **Step 3: Verify live** with the content already created in the admin (curl and `get_page_text`, no local dev server):
  - `/` shows real category and tool counts; selecting Portrait + a tool changes the hero and the CTA link.
  - `/category/{slug}/`, `/category/{slug}/?tool={slug}`, `/tool/{slug}/`, `/style/{slug}/` render cards; filters change the grid; `?page=2` and `?sort=newest` carry `noindex`.
  - `/prompt/{slug}/` shows the prompt, Copy works, a premium prompt shows no text in the HTML source (`curl … | grep` for a phrase from its text returns nothing).
  - Change a published prompt's slug in the admin: the old URL 308-redirects to the new one; an unknown URL returns the styled 404 with status 404.
  - `/sitemap.xml` lists prompts and hubs; `/robots.txt` disallows `/admin/`.
- [ ] **Step 4:** update memory (`project_current_status.md`), push.

## Self-review

- **Spec coverage:** flat URL scheme (Decision 1), live counts (Tasks 1, 3, 6), primary tool and fit (Tasks 1, 7, 8), combo pages with admin-controlled indexing (Tasks 3, 7, 9), redirects on slug change (Task 4), premium protection (Tasks 2, 8), sitemap/robots/JSON-LD (Tasks 8, 9). Search, static pages, menus and homepage builder are deliberately in plan 1D.
- **Placeholders:** Tasks 2, 3 and 5-8 describe behavior and required outputs but leave the page markup to be written directly from the design files (`Homepage.dc.html`, `CategoryPage.dc.html`, `ToolPage.dc.html`, `PromptDetail.dc.html`, `PromptCard.dc.html`); the queries that carry the risk (Tasks 1, 2, 3, 4, 9) are test-first.
- **Risks:** dynamic rendering on every request is fine for launch traffic and is revisited in plan 1D; `EXISTS` subqueries in `listCards` are index-backed by the primary keys on `prompt_tools` / `prompt_styles`.
