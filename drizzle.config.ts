import { defineConfig } from 'drizzle-kit'

// `pnpm db:generate` diffs server/db/schema.ts against the last snapshot and
// writes a new SQL migration. It never connects to a database.
// Migrations are applied by server/db/migrate.ts (`pnpm db:migrate`, or the
// `app-migrate` service in docker-compose.yml).
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_OWNER_URL ?? '',
  },
})
