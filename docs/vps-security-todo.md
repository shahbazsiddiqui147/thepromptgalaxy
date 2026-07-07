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
`3000–3003, 3005, 3010` (each site is reachable directly by `IP:port`, bypassing nginx/TLS).

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

---

## Suggested order when we do this
1. Postgres restriction (`listen_addresses` + `pg_hba.conf`) — zero-risk per above.
2. UFW rules (allow-list above, then enable).
3. SSH password auth disable — last, only after confirming key-based login works.
