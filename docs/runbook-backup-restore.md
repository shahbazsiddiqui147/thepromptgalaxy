# Backup and restore runbook

## What is backed up

- **Database `promptgalaxy_prod`** as a PostgreSQL custom-format dump (`db-YYYYMMDD-HHMMSS.dump`).
- **Uploads** (`/opt/apps/thepromptgalaxy/uploads`, once media exists) as `uploads-YYYYMMDD-HHMMSS.tar.gz`.

## Where the copies live

1. **On the server:** `/var/backups/promptgalaxy/` (last 14 of each), written nightly at 03:15 by
   `/etc/cron.d/promptgalaxy-backup` running `deploy/backup.sh`. Log: `/var/log/promptgalaxy-backup.log`.
   `latest-db.dump` and `latest-uploads.tar.gz` point at the newest files.
2. **On the owner's PC:** `%USERPROFILE%\galaxy-backups\` (last 30 of each), pulled over SSH by the Windows scheduled
   task **PromptGalaxy Backup Pull** (daily at 12:00, at logon, and as soon as possible after a missed run).
   Script: `%USERPROFILE%\galaxy-backups\pull-backup.ps1` (source in `deploy/pull-backup.ps1`). Log: `pull.log`.

A backup only counts once it exists on the PC. Check `pull.log` now and then.

## Check that backups are healthy

```bash
ssh -i ~/.ssh/id_ed25519 root@46.250.239.74 "tail -3 /var/log/promptgalaxy-backup.log; ls -lh /var/backups/promptgalaxy | tail -4"
```

The newest line must say `OK:` with today's date and a size of at least a few KB.

## Restore onto a clean server

1. Provision the server (Node 22, pnpm 9.15.9, PostgreSQL 16, nginx, certbot, PM2), deploy the code following the
   steps in `deploy/` (git archive, install, build, PM2, nginx, certificate).
2. Create the role and an empty database:

   ```sql
   CREATE ROLE promptgalaxy_app LOGIN PASSWORD '<new random password>';
   CREATE DATABASE promptgalaxy_prod OWNER promptgalaxy_app;
   ```
3. Put the new password in `/opt/apps/thepromptgalaxy/.env` as `DATABASE_URL`.
4. Copy the newest dump from `%USERPROFILE%\galaxy-backups\` to the server, then restore it:

   ```bash
   pg_restore --no-owner --role=promptgalaxy_app -d promptgalaxy_prod db-YYYYMMDD-HHMMSS.dump
   ```
5. Restore uploads: `tar -xzf uploads-YYYYMMDD-HHMMSS.tar.gz -C /opt/apps/thepromptgalaxy/`
6. `pnpm migrate` (applies any migration newer than the dump), `pm2 restart thepromptgalaxy`.
7. Log in to `/admin` and confirm the categories, tools and prompts are back.

Run a test restore into a scratch database (`createdb promptgalaxy_restore_test`) after any major change.
