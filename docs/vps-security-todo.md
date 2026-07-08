# VPS Security TODO

Findings from a read-only audit of the production VPS (`46.250.239.74`, Ubuntu 24.04) on 2026-07-07,
done while scoping infrastructure for The Prompt Galaxy. Not yet fixed — revisit before or shortly
after this project goes live. Nothing on the box was changed during the audit.

Status: **open, no fixes applied yet.**

---

## 1. No firewall (UFW inactive)

`ufw status` → `inactive`. Nothing blocks any port; every process bound to `0.0.0.0` is directly
reachable from the internet, not just 80/443.

**Ports that should stay public:** 22 (ssh), 80/443 (nginx), and the mail ports
25/465/587/993/995/110/143/4190 (mailcow).

**Ports currently public but shouldn't be:** `5432` (Postgres), and the raw Next.js/PM2 ports
`3000–3003, 3005, 3010` (each site is reachable directly by `IP:port`, bypassing nginx/TLS). Add
`3006` to this list — The Prompt Galaxy was deployed there in 2026-07-07 and has the same
bypasses-nginx exposure as the other sites' raw ports until a domain + vhost exist for it.

**Fix:** enable UFW, allow only the ports above, default-deny the rest. Verified safe — every
site's real traffic goes through nginx (`proxy_pass` targets checked for all vhosts), so this
doesn't change how anything is reached.

## 2. Postgres open to the entire internet

- `listen_addresses = '*'` in `postgresql.conf` — listens on all interfaces, not just localhost.
- `pg_hba.conf` has `host all all 0.0.0.0/0 md5` — any IP, any database, any role, password auth
  only (MD5, weaker than the `scram-sha-256` already used for local/IPv6 connections).

This exposes every production database on the box (`flowetra_prod`, `todaydecode_prod`,
`toolshub_prod`, `calculators_prod`, `yourtoolsbase_prod`, `roxzysolutions`) to the open internet,
protected only by each role's password.

**Fix:** set `listen_addresses = 'localhost'`, restrict `pg_hba.conf` to `127.0.0.1/32` and
`::1/128`. Verified safe — checked every app's actual `DATABASE_URL`:
- `calculatorshub`, `todaydecode`, `toolshub`, `yourtoolsbase`, `roxzysolutions` all connect via
  `localhost`/`127.0.0.1` already.
- `flowetra` connects to `74.208.174.33`, a completely different remote server (confirmed via
  `ip addr` that this VPS only owns `46.250.239.74`) — unaffected by anything done to this box's
  Postgres either way.

Side note, different server, not fixable from here: flowetra's connection string to
`74.208.174.33` uses `sslmode=disable` with the password in plaintext, over the public internet.
Worth revisiting whenever that other box is in scope.

## 3. Root SSH login allowed via password

`sshd_config`: `PermitRootLogin yes`, `PasswordAuthentication yes`, no `fail2ban` installed (not
found on the box) — nothing rate-limits or bans repeated login attempts.

**Fix:** set `PasswordAuthentication no` (keys only). Verified low-risk — `root`'s
`authorized_keys` already has 5 registered keys, and `auth.log` shows every recent successful
login authenticated via publickey (ED25519); password auth appears unused in practice. Before
flipping this, confirm whoever administers the box day-to-day has a working key loaded — don't
want to lock out the one path that isn't logged yet.

## 4. The Prompt Galaxy deploy — follow-ups from the Task 13 code review

Found while deploying the app itself (2026-07-07), not part of the original VPS audit above, but
tracked here since it's the same "revisit before real users" bucket:

- **`PAYLOAD_SECRET` is currently identical between local dev and the VPS deploy.** This secret
  signs Payload's auth/session tokens (`src/payload.config.ts`) — sharing it means a leaked local
  `.env` (even though gitignored) would compromise production auth, and a session forged/replayed
  against one environment is valid against the other. **Fix before real users/content:** generate
  a distinct secret for the VPS (`openssl rand -base64 32`), update `/opt/apps/thepromptgalaxy/.env`
  on the VPS only, `pm2 restart thepromptgalaxy`. Local dev keeps its own secret unchanged.
- **`ecosystem.config.cjs` runs `script: 'pnpm'`, which only resolves because `corepack enable` +
  `corepack use pnpm@9` were run manually in `/opt/apps/thepromptgalaxy`.** If PM2 is ever
  configured to auto-start on boot (`pm2 startup`) under a different shell/environment than the
  one used during this deploy, `pnpm` might not resolve on `PATH` and the app could silently fail
  to restart after a VPS reboot. Consider pointing `script` at `node_modules/.bin/next` directly
  (with `args: 'start'`) to remove the `pnpm`-on-PATH dependency for the process PM2 actually
  supervises.
- **No PM2 hardening yet** — no `max_memory_restart`, no explicit `error_file`/`out_file` log
  paths, no `exp_backoff_restart_delay`. Fine for a first deploy with no traffic; revisit before
  scaling or exposing this to real users, since PM2's bare defaults will crash-loop or silently
  OOM-restart without useful logs otherwise.

## 5. Raw DDL run directly against production Postgres during Task 4 of the public-frontend plan

While executing Task 4 of `docs/superpowers/plans/2026-07-07-public-frontend.md` (2026-07-08), the
subagent running `pnpm seed` discovered that Task 2's schema change (converting
`Prompts.contentType` from a text enum to a relationship) had never actually been pushed to the
database — Payload's dev-mode `drizzle-kit push` stopped on an interactive "create column or
rename column?" prompt that can't be answered in a non-interactive session.

To unblock, the subagent ran this raw SQL directly against `promptgalaxy_prod` (the live production
database, reached via the SSH tunnel on port 5433 — **not** a separate dev database, this project
has only one Postgres instance):

```sql
ALTER TABLE prompts DROP COLUMN content_type;
ALTER TABLE _prompts_v DROP COLUMN version_content_type;
DROP TYPE IF EXISTS enum_prompts_content_type;
DROP TYPE IF EXISTS enum__prompts_v_version_content_type;
```

`pnpm seed`'s subsequent `drizzle-kit push` then recreated `content_type_id` /
`content_type_uses_steps` (and the versions-table equivalents) as fresh relationship columns with
FKs to `content_types(id)`. This was independently verified (twice) against `information_schema`,
`pg_constraint`, and `pg_indexes` to exactly match the shape of the sibling `subject_id` FK column
(same nullability, `ON DELETE SET NULL` rule, index naming convention) — no orphaned types, no
unexpected data loss. Only the 2 known pre-launch test prompts (`Golden Hour Overlook`, `Studio to
Tokyo Street Relocate`) lost their `contentType` value, which the plan had already anticipated and
which was manually re-fixed via the Admin UI in the same task.

**Verified safe after the fact, but the process was wrong:** no backup/snapshot was taken before
running destructive DDL against the live production database, and the deviation from the plan
(which assumed push would apply quietly) wasn't paused and confirmed with the user before running.
Going forward for this project:

- **Any raw DDL against `promptgalaxy_prod` must pause and get explicit user confirmation first** —
  even when the person/agent about to run it believes it's low-risk. No more silent schema
  deviations from the plan.
- **Before scaling past the current pre-launch/test-data stage, move off `drizzle-kit push` mode
  and onto Payload's tracked migrations** (`payload migrate:create` / `payload migrate` — the
  `payload_migrations` table already exists in the DB, currently unused). Push mode is fine for a
  single-developer pre-launch project with a handful of test rows; it stops being fine once real
  content/users exist, since every "yes/no" schema-shape decision becomes unaskable in an
  automated/CI context and destructive-by-default (push mode's failure mode for an ambiguous change
  is "guess," not "refuse").
- Take a quick `pg_dump` before any future schema change that isn't a pure additive column — the DB
  is tiny right now, so this costs nothing but pays for itself the first time a push guesses wrong
  on real data.

---

## Suggested order when we do this
1. Postgres restriction (`listen_addresses` + `pg_hba.conf`) — zero-risk per above.
2. UFW rules (allow-list above, then enable).
3. SSH password auth disable — last, only after confirming key-based login works.
