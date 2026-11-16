import { sql } from 'drizzle-orm'

// Liveness + database reachability, for the Docker HEALTHCHECK. No auth, no data.
export default defineEventHandler(async () => {
  try {
    await useDb().execute(sql`select 1`)
    return { ok: true }
  }
  catch {
    throw createError({ statusCode: 503, message: 'Database unavailable' })
  }
})
