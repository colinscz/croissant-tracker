// Apply pending migrations from server/db/migrations.
//
// Runs as the schema owner (DATABASE_OWNER_URL), never as the app role: the app
// login has no DDL rights by design. Used by `pnpm db:migrate` locally and,
// bundled to a single file, by the `app-migrate` service in docker-compose.yml.
//
// Plain erasable TypeScript only (no enums/namespaces), so Node runs it
// directly with type stripping.
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.DATABASE_OWNER_URL
if (!url) {
  console.error('DATABASE_OWNER_URL is not set')
  process.exit(1)
}

const migrationsFolder = process.env.MIGRATIONS_DIR ?? new URL('./migrations', import.meta.url).pathname

const client = postgres(url, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(client), { migrationsFolder })
  console.log('Migrations applied')
}
catch (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
}
finally {
  await client.end()
}
