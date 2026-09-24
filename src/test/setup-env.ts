import { existsSync } from 'node:fs'

// Vitest does not load .env by itself; the DB tests need TEST_DATABASE_URL.
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}
