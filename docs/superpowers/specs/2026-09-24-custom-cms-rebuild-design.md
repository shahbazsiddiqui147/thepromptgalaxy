# The Prompt Galaxy — Custom CMS Rebuild: Design Spec

Date: 2026-09-24
Status: Draft for owner review

## 1. Background and goal

The production VPS was rebuilt around 2026-09-13. The old Payload-based deployment, its database and all
backups were lost; only the code survived (GitHub: `shahbazsiddiqui147/thepromptgalaxy`). The owner has decided to
rebuild from scratch with these constraints:

- The backend and CMS are **custom-built**. No third-party CMS (no Payload). The frontend stays **Next.js**.
- **Everything is controlled from the admin.** No category, tool, style, relation, count, menu, homepage copy,
  page text or setting is hardcoded in the frontend.
- The **tool ↔ category relation is dynamic** (admin-managed matrix, live counts).
- The public UI/UX comes from the Claude Design export `ThePromptGalaxy Design.zip` (Modernist system: light
  ground `#f3f2f2`, accent `#ec3013`, Archivo, zero radius, 2px rules; "two doors" IA — by category / by tool —
  with art styles as a third filter).
- The live site stays **down** until the rebuild replaces it. There is no interim redeploy of the old version.

Goal: a self-contained Next.js + PostgreSQL application with a hand-built admin that manages every piece of content
and every relationship the public site shows.

## 2. Non-goals (this spec)

- Premium subscriptions and payment processing (Phase 3, separate spec; depends on the payment provider chosen).
- Google / third-party login (Phase 1 is email + password only; an OAuth toggle can be added later).
- Migrating any old content: there is no backup, so the new database starts empty.
- The public visual design itself (owned by the Claude Design export; this spec only defines the data and behaviour
  behind it).

## 3. Architecture

One Next.js (App Router) application containing the public site and the admin (`/admin`).

- Database: PostgreSQL 16 (already installed on the VPS). New database `promptgalaxy_prod` with its own role.
- Data access: plain `pg` with hand-written SQL in query modules. Schema changes are **versioned SQL migration
  files** applied by a small runner that records applied files in a `schema_migrations` table. No auto-push.
- Admin: driven by a **schema registry** (see section 7). Each entity is declared once (fields, types, relations,
  validation, list columns, permissions) and the generic list/edit screens are generated from it. Screens that do not
  fit the generic shape (matrix, moderation queue, homepage builder, menu editor) are hand-built.
- Auth: server-side sessions stored in Postgres, httpOnly + Secure + SameSite=Lax cookie, scrypt password hashes.
- Media: uploaded files stored on disk under a configurable directory outside the app folder, served by the app;
  image variants generated with `sharp`.
- Process: one PM2 process (`thepromptgalaxy`, port 3006) behind nginx with a Let's Encrypt certificate for
  `thepromptgalaxy.com`.

Allowed dependencies are libraries only (`next`, `react`, `pg`, `sharp`, a markdown/HTML sanitizer, test tooling).
No CMS, no ORM, no admin framework.

## 4. URL structure (flat)

Prompt URLs never contain category, tool or style, so re-linking in the admin never breaks a public URL.

| Page | URL |
|---|---|
| Home | `/` |
| Prompt | `/prompt/{slug}/` |
| Category index / hub | `/category/`, `/category/{slug}/` |
| Tool index / hub | `/tool/`, `/tool/{slug}/` |
| Style index / hub | `/style/`, `/style/{slug}/` |
| Combination | `/category/{slug}/?tool={slug}&style={slug}` (filters) |
| System pages | `/search/`, `/submit/`, `/login/`, `/register/`, `/account/`, `/account/saved/`, `/premium/` |
| CMS pages | `/about/`, `/contact/`, `/privacy/` and any admin-created page at `/{page-slug}/` |
| Admin | `/admin/...` |

Rules:

- Prompt slugs are globally unique, generated from the title, editable while the prompt is a draft, and **locked at
  first publish**. If an admin later changes a published slug, the old path is stored in `redirects` and served as a
  301.
- Breadcrumbs are built from data (prompt → primary category → primary tool), never parsed from the URL.
- Each entity type has its own prefix, so a category can never collide with a system route. CMS page slugs are
  validated against a reserved list (`admin`, `api`, `prompt`, `category`, `tool`, `style`, `search`, `submit`,
  `login`, `register`, `account`, `premium`, `_next`).
- Filtered combination URLs canonicalize to the hub URL unless the combo is flagged **indexable** in the matrix, in
  which case it gets a self-referencing canonical, its own title, description and intro text.

## 5. Data model

All tables have `id`, `created_at`, `updated_at`. Slugs are lower-case, unique per table.

### 5.1 Taxonomy

- `categories`: `slug`, `name`, `description`, `icon_media_id`, `sort_order`, `is_active`, `supports_styles`,
  `seo_title`, `seo_description`.
- `tools`: `slug`, `name`, `vendor`, `logo_media_id`, `sort_order`, `is_active`, `seo_title`, `seo_description`.
- `styles`: `slug`, `name`, `sort_order`, `is_active`.

### 5.2 Relations (the matrix)

- `category_tools` (PK `category_id, tool_id`): `sort_order` (tool order inside that category), `is_featured`,
  `is_indexable`, `seo_title`, `seo_description`, `intro`.
- `category_styles` (PK `category_id, style_id`): `sort_order`.

A category's tool tabs, a tool's category tabs, the "top category" mirror card and the style chips are all read from
these tables joined with live prompt counts.

### 5.3 Prompts

- `prompts`: `slug`, `title`, `summary`, `category_id` (primary category, required), `prompt_text` (single prompts),
  `is_chain`, `is_premium`, `reference_required`, `reference_note`, `example_media_id`, `article_html`
  (sanitized), `quick_answer`, `status` (`draft | pending | published | rejected | archived`), `rejection_reason`,
  `author_id`, `reviewed_by`, `published_at`, `save_count` (denormalized, updated in the same transaction as
  `saves`), `seo_title`, `seo_description`, `search_vector` (generated `tsvector`). Unique `(id, category_id)`.
- `prompt_tools`: `prompt_id`, `category_id`, `tool_id`, `is_primary`, `fit` (`great | good`).
  - FK `(prompt_id, category_id)` → `prompts(id, category_id)` `ON UPDATE CASCADE`.
  - FK `(category_id, tool_id)` → `category_tools(category_id, tool_id)` `ON DELETE RESTRICT`.
  - Partial unique index: one `is_primary` row per prompt.
  - Result: a prompt can only use tools that are valid for its category, and changing a prompt's category fails
    unless every attached tool is valid for the new category. Enforced by the database, not only the UI.
- `prompt_styles`: `prompt_id`, `category_id`, `style_id` with the same composite-FK pattern against
  `category_styles`.
- `prompt_steps`: `prompt_id`, `position`, `label`, `text`, `example_media_id` (chains).
- `prompt_faqs`: `prompt_id`, `position`, `question`, `answer`.
- `similar_prompts`: `prompt_id`, `similar_id`, `position` (manual overrides; when empty, similar prompts are
  computed from same category + shared style/tool).

### 5.4 People

- `users`: `email` (unique), `password_hash`, `display_name`, `handle` (unique, shown as `@handle`), `role`
  (`admin | editor | moderator | member`), `is_premium`, `is_disabled`, `last_login_at`.
- `sessions`: `token_hash`, `user_id`, `expires_at`, `ip`, `user_agent`.
- `saves`: `user_id`, `prompt_id` (PK both).

### 5.5 Content and site

- `pages`: `slug`, `title`, `body_html` (sanitized), `seo_title`, `seo_description`, `is_published`.
- `content_blocks`: `page_key` (e.g. `home`), `block_type`, `position`, `is_active`, `data` (jsonb, validated by the
  block type's registry definition). Home block types: `hero`, `doors`, `styles_strip`, `prompt_row`, `steps`,
  `chain_teaser`, `cta_banner`.
- `menus` / `menu_items`: `menu_key` (`header`, `footer`), `group_label`, `label`, `href`, `position`, `is_active`.
- `contact_reasons`: `label`, `position`, `is_active`. `contact_messages`: `name`, `email`, `reason_id`,
  `message`, `status` (`new | handled`).
- `media`: `filename`, `mime`, `size`, `width`, `height`, `alt`, `variants` (jsonb).
- `site_settings`: typed key/value rows: site name, tagline, logo, favicon, contact and privacy emails, social links,
  review-time text ("48 hours"), feature toggles (`submissions_open`, `registration_open`), analytics/ad snippets.
- `redirects`: `from_path` (unique), `to_path`, `status_code`.
- `audit_log`: `user_id`, `entity`, `entity_id`, `action`, `diff` (jsonb).

### 5.6 Computed, never stored or typed by hand

Prompt counts per category, tool, style and combination; the homepage total ("N prompts across X tools and Y
categories"); the "top category" mirror card; search facet counts; "most saved this week". Only published prompts in
active categories and tools are counted.

## 6. Relation and deletion rules

1. A tool is selectable for a prompt only if `category_tools` has the pair; styles likewise via `category_styles`.
   The prompt form filters its pickers live when the category changes.
2. Removing a matrix pair that any prompt uses is blocked with a list of the affected prompts. The admin may
   instead set the category or tool inactive.
3. Categories, tools and styles that have prompts cannot be deleted, only deactivated. Inactive items disappear from
   all public navigation, hubs, facets and counts; their prompts are hidden from listings and return 404.
4. A category with `supports_styles = false` shows no style filter and rejects `prompt_styles` rows.
5. Approving a submission requires a valid primary tool and category pair; the moderator can fix the pair in the
   review screen before publishing.

## 7. Admin

Served under `/admin`, styled with the Modernist tokens. Roles: `admin` (everything), `editor` (content, no users or
settings), `moderator` (moderation queue only), `member` (no admin access).

- **Schema registry.** Each entity declares fields (text, textarea, rich text, number, boolean, select, relation,
  many-relation, media, slug, jsonb block), validation, list columns, filters, default sort and per-role
  permissions. The generic screens provide: paginated list with search, filters and status chips; create/edit form
  with relation pickers; slug auto-generation and lock rules; draft/publish; bulk actions; audit logging; "view on
  site" and draft preview links.
- **Relations matrix screen.** Grid of categories × tools (and a second tab: categories × styles) with checkboxes
  and live prompt counts per cell. Clicking a cell opens that combination's settings (order, featured, indexable, SEO
  title/description/intro). Row/column bulk toggles.
- **Moderation queue.** Pending submissions with the example image, prompt text and chosen category/tool; approve,
  reject with reason, or edit-then-approve.
- **Homepage builder.** Ordered list of `content_blocks` for `home` with add, reorder, enable/disable and a typed
  form per block. The hero line supports the token `{total}`.
- **Menus, pages, contact reasons, redirects, site settings, media library** (drag-and-drop inline uploader, no
  drawer navigation), **users**, **contact inbox**, **audit log viewer**.

## 8. Public rendering and caching

- Server components read Postgres directly through the query modules.
- Pages are cached with tags (`prompt:{id}`, `category:{id}`, `tool:{id}`, `style:{id}`, `home`, `nav`, `settings`,
  `counts`). Any admin write revalidates the tags it affects immediately. There is no time-based staleness to wait
  out and no process restart is ever needed to clear a cache.
- Search uses Postgres full-text (`tsvector`) with trigram matching for typos and partial words. Facets (category,
  tool, price free/premium) and sort (relevance, most saved, newest) are SQL. No external search service.
- Personalized state (save button, logged-in nav) is fetched client-side after load so cached pages stay shared.
- Sitemap and robots are generated from the database, including indexable combos and CMS pages.

## 9. Authentication and security

- Register/login/logout, password reset by emailed token (SMTP configured in settings), account page with saved
  prompts and submissions.
- Sessions in Postgres; rotation on login; logout invalidates the row.
- Mutations go through server actions or route handlers that verify the session, the role and the `Origin` header.
- Rate limits on login, register, contact and submit (per IP and per account, stored in Postgres).
- Uploads: allow-listed MIME types, size cap, re-encoded with `sharp`, random stored filenames.
- Rich text and page bodies are sanitized on write with an allow-list of tags and attributes.
- Secrets live only in the server `.env`; the repository never contains credentials.

## 10. Deployment and backups

- Provision on the shared VPS: database `promptgalaxy_prod` and role `promptgalaxy_app` (least privilege), app
  directory `/opt/apps/thepromptgalaxy`, PM2 process on port 3006, nginx vhost and certificate for
  `thepromptgalaxy.com`. No other site on the box is touched.
- Deploys are git-based (`git pull` from GitHub on the server, `pnpm install`, `pnpm build`, apply pending
  migrations, `pm2 restart`) with a documented rollback (previous release directory plus a pre-deploy `pg_dump`).
- Nightly job on the server: `pg_dump` plus an archive of the uploads directory, keeping the last 14 on the server.
- **Off-server copy (required before go-live).** Default design: a scheduled task on the owner's Windows PC pulls the
  latest archive over SSH key each day and keeps the last 30. The runbook documents restore from a clean server.
  The nightly job also refuses to report success if the archive is empty or smaller than 1 KB.

## 11. Testing

- Unit tests: slug generation and locking, redirect creation, matrix validity checks, count queries, permission
  checks, block validators.
- Integration tests against a throwaway Postgres schema: composite-FK enforcement (invalid tool for a category
  fails), deletion blocking, moderation flow, tag revalidation triggers.
- Playwright smoke tests: admin CRUD for each entity, matrix edit changing public counts, submit → approve → visible
  on hubs, search facets, and every public route returning 200 with seed data.

## 12. Phasing

- **Phase 1 – Foundation and browsing:** migrations runner, auth, media, schema registry and generic admin,
  taxonomy + matrix screen, prompts (single and chain), public pages (home, hubs, prompt, search), pages/menus/
  settings/homepage builder, deployment, backups.
- **Phase 2 – Community:** submissions and moderation queue, saves and account pages, contact form and inbox,
  password reset email, audit log viewer.
- **Phase 3 – Premium:** plans, checkout and webhooks with the chosen payment provider, premium gating of prompts.
  Separate spec.

Each phase gets its own implementation plan.
