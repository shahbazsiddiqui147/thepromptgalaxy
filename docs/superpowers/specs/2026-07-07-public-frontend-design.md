# The Prompt Galaxy — Public Frontend Design

**Status:** Approved via brainstorming conversation, 2026-07-07. Ready for implementation planning.

## 1. Goal

Build the actual public-facing website — the pages visitors browse and read — on top of the
existing, already-deployed Payload CMS backend (live at `46.250.239.74:3006`). This is Phase 2 of
the original project plan; Phase 1 (CMS + admin) is done.

**Decision carried over from an earlier detour:** we considered ripping out Payload entirely to
build a fully custom CMS, because of a stated concern that Payload "requires a license." Verified
directly against the npm registry: `payload`, `@payloadcms/next`, and `@payloadcms/db-postgres` are
all MIT licensed — free, self-hosted, no fees, no royalties. The concern doesn't apply. Payload
stays. Full stylistic control lives entirely in this new frontend, which has zero connection to
how the admin panel looks — that was never actually in conflict.

## 2. Architecture

- Next.js (App Router, already running) renders the frontend using Payload's **Local API** —
  in-process function calls, not HTTP, since Payload is embedded in the same Next.js process. No
  network round-trip for server-rendered pages.
- **Rendering strategy: ISR (Incremental Static Regeneration).** Pages are cached and served as
  fast static HTML, but regenerate when content changes (either time-based revalidation or
  on-demand revalidation triggered from a Payload `afterChange` hook when a prompt is
  published/edited). This is what makes the SEO/AEO story real: fast, fully server-rendered HTML,
  not a client-side-only app, while staying current as the admin publishes.
- `next.config.ts` gets `trailingSlash: true` — every route ends in `/`, and Next.js handles
  redirecting the non-trailing-slash form so the two never coexist as separate indexable URLs.

## 3. Schema change: Content Type becomes a real collection

Currently `Prompts.contentType` is a hardcoded 2-option `select` (`single` / `chain`). Per the
admin-control requirement (Subjects, Art Styles, Tools, **and Content Type** must all be
add/edit/update/delete-able from the admin, no hardcoded values anywhere), this becomes a new
`content-types` collection, matching the existing Subjects/ArtStyles/Tools pattern:

- `name` (text) — e.g. "Single-frame", "Chain", or any future type an admin adds
- `slug` (text)
- `usesSteps` (checkbox) — replaces the current hardcoded `data.contentType === 'chain'` string
  check that drives the Prompts form's conditional fields

`Prompts.contentType` changes from `select` to a `relationship` pointing at `content-types`.

**Technical wrinkle:** Payload's admin `condition` function (which shows/hides the Prompt Text vs.
Steps fields) runs against the current form's field data and can't do a live database lookup of
the referenced Content Type's `usesSteps` flag mid-edit. Fix: a `beforeChange` hook on `Prompts`
that looks up the selected Content Type and copies its `usesSteps` value onto a hidden field on the
Prompt itself. The admin never sees or manages this hidden field directly — it's just what the
conditional-field logic actually checks, kept in sync automatically whenever Content Type changes.

## 4. URL structure

All URLs end in a trailing slash (`trailingSlash: true`).

| Page | URL pattern | Example | Indexing |
|---|---|---|---|
| Homepage | `/` | `/` | index |
| Subject archive | `/[subject]/` | `/travel/` | index |
| Subject+Style archive | `/[subject]/[style]/` | `/travel/cinematic/` | index, **content-gated** (see §7) |
| Prompt detail | `/[subject]/[style]/[prompt-slug]/` | `/travel/cinematic/golden-hour-overlook/` | index — the one canonical URL per prompt |
| Pure Style archive | `/style/[style]/` | `/style/cinematic/` | index |
| Tool archive | `/tool/[tool]/` | `/tool/midjourney/` | index |
| Chains archive | `/chains/` | `/chains/` | index — links to prompts at their real canonical URL, never a second copy of the content |
| Interactive browse | `/browse/?...` | `/browse/?tool=midjourney` | **noindex**, canonical back to the relevant archive page |
| Search | `/search/?q=...` | — | noindex |

**Why Subject + Style (not Tool) form the canonical prompt path:** a Prompt has exactly one
Subject and one Art Style (single-select), but can have multiple Tools (multi-select). Putting
Tool in the path would mean a multi-tool prompt needs several different URLs for identical
content — the exact duplicate-content problem faceted navigation is infamous for. Subject and
Style are safe because they're guaranteed unique per prompt.

## 5. Page-by-page content

**Homepage (`/`):** Hero (brand + tagline + prominent search) → featured/trending prompt carousel
→ taxonomy entry cards (Subject / Style / Tool / Chains) → dedicated Chains spotlight (the actual
competitive differentiator, not buried in a general carousel) → Recently Added → one ad slot → a
short, direct "what is this site" blurb for AEO/GEO citability. Deliberately excluded: newsletter
signup, testimonials, pricing — none fit a browse-first prompt library at this stage.

**Subject / Style / Tool archive pages:** intro blurb (Quick-Answer-style, citable), grid of
matching prompts, links into the interactive `/browse/` view for further filtering.

**Subject+Style archive pages:** same as above, but only created/indexed once a term combination
has real content behind it (see §7) — never auto-generated for all possible combinations.

**Chains archive (`/chains/`):** index/spotlight of chain-type prompts, each card linking to that
prompt's real canonical URL (under its own Subject/Style path) — this page is a curated list, not
an alternate home for the content.

**Prompt detail page:** matches the existing prototype exactly — title, blurb, taxonomy tag row
(Subject/Style/Content-Type/Reference-Required), Quick Answer box, result preview (single-frame
gallery or chain step progression), the prompt text (or numbered chain steps) in copy-boxes, tool
compatibility list, "why this works" article + tips, FAQ accordion, similar prompts, ad slots — as
already designed in the two approved prototypes.

## 6. Reference-image prompts — confirmed scope

The site never handles a visitor's own photo. `referenceRequired` (checkbox) + `referenceNote`
(text, e.g. "Face only") are informational metadata the admin sets — shown as a badge before the
prompt text so the visitor knows what they'll need before they leave the site to run the prompt on
the actual AI tool. The "your reference photo" box in the result preview is illustrative only, not
a real upload widget. Separately, "Example Results" images (showing what a prompt produces) are
real uploads, but made by the **admin** curating the page — not visitor-submitted content. No new
upload-handling feature is needed for any of this; it's covered by existing fields.

## 7. SEO / AEO / GEO plan

Researched directly (see chat log for sources) rather than assumed:

- **Faceted navigation discipline:** ~50% of all Google-reported crawl issues trace to
  uncontrolled facet-combination URLs (one real-world case: <200k products → 500M+ crawlable
  pages). Mitigation here: only Subject, Style, Tool, and Chains get always-on archive pages.
  Subject+Style combination pages are **gated behind a content threshold** (e.g., only
  generated/indexed once a term pair has ~5+ real prompts) — never mechanically generated for all
  6 subjects × 12 styles regardless of whether there's anything to show.
- **Schema markup:** `CollectionPage` + `ItemList` on every archive page, `FAQPage` on prompt
  detail pages (already in the approved prototype), `BreadcrumbList` site-wide. Structured data
  measurably improves AI-answer-engine citation likelihood.
- **URL depth ≠ ranking factor** (confirmed via Google's John Mueller directly) — hierarchical
  URLs were chosen for UX/organization/context, not because flat URLs would rank worse. Click
  depth (clicks from homepage) matters more than literal path depth.
- **Canonicalization:** `/browse/` filter states are noindex with a canonical tag back to the
  relevant single-facet archive page, so the interactive UX doesn't create duplicate-content risk.

## 8. Domain / deployment sequencing

No domain purchase needed to start or finish building this. Everything is developed and verified
against the VPS's IP:port (`46.250.239.74:3006`), exactly like the CMS backend was. Domain
purchase + DNS + nginx vhost + SSL is a small, separate step whenever the domain is bought — it
does not block frontend development.

## 9. Out of scope for this spec

- Admin-panel visual reskinning (branding/colors) — optional cosmetic follow-up, not required for
  the public frontend to work.
- User accounts, saved prompts, submission/moderation workflow — flagged in the original project
  plan as a later phase.
- Cross-tool side-by-side comparison view — later roadmap item.
- Content-threshold automation details (exact number, how it's computed) — implementation plan
  will pin down the specific mechanism.
