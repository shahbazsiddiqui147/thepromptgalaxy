# Local development setup

The development and test databases live on the VPS Postgres (isolated role `galaxy_dev`, databases
`promptgalaxy_dev` and `promptgalaxy_test`) and are reached through an SSH tunnel. The production database
(`promptgalaxy_prod`) is a separate database; never point `DATABASE_URL` at it from a development machine.

1. Node 20.19+ and pnpm 9 (`corepack enable`).
2. Open the tunnel and leave it running (local port 5434 -> VPS Postgres):

   ```bash
   ssh -i ~/.ssh/id_ed25519 -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -N -L 5434:127.0.0.1:5432 root@46.250.239.74
   ```

   The tunnel can drop; restart the command if a database command fails with `ECONNREFUSED`.
3. One-time role and database creation on the server (already done on 2026-09-24):

   ```sql
   CREATE ROLE galaxy_dev LOGIN PASSWORD '<random>';
   CREATE DATABASE promptgalaxy_dev OWNER galaxy_dev;
   CREATE DATABASE promptgalaxy_test OWNER galaxy_dev;
   ```
4. `cp .env.example .env` and fill in `DATABASE_URL` / `TEST_DATABASE_URL` with the role's password and port 5434.
   (A local PostgreSQL works too: use `localhost:5432` URLs instead.)
5. `pnpm install`
6. `pnpm migrate` applies migrations to the dev database.
7. `pnpm create-admin --email you@example.com --password 'a-long-password' --name 'Your Name' --handle yourhandle`
8. `pnpm dev`, then open http://localhost:3000/login/
9. `pnpm test` runs the suite against `TEST_DATABASE_URL` (the database name must contain `test`).
