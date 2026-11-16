import { sql } from 'drizzle-orm'
import { drizzle  } from 'drizzle-orm/postgres-js'
import type {PostgresJsDatabase} from 'drizzle-orm/postgres-js';
import postgres from 'postgres'
import type { H3Event } from 'h3'
import * as schema from '../db/schema'

export type Db = PostgresJsDatabase<typeof schema>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

let db: Db | undefined

/**
 * The shared connection pool, logged in as `croissant_app` (NUXT_DATABASE_URL).
 * That role is subject to row-level security, so on its own it can't see any
 * rows — use `withUser` to run queries as the signed-in user.
 */
export const useDb = (): Db => {
  if (!db) {
    const url = useRuntimeConfig().databaseUrl
    if (!url) {
      throw createError({ statusCode: 500, message: 'NUXT_DATABASE_URL is not configured' })
    }
    db = drizzle(postgres(url, { max: 10, onnotice: () => {} }), { schema })
  }
  return db
}

/**
 * Run `fn` in a transaction scoped to the signed-in Hanko user.
 *
 * `set_config(..., true)` is transaction-local, so `app.current_user_id()` —
 * which every RLS policy and trigger reads — is set for exactly these queries
 * and is cleared before the pooled connection serves anyone else. This is the
 * stand-in for the JWT that PostgREST used to hand Postgres on Supabase.
 *
 * Postgres errors are translated into HTTP errors carrying the database's own
 * message (see toHttpError), which the composables surface in a UAlert.
 */
export const withUser = async <T>(event: H3Event, fn: (tx: Tx) => Promise<T>): Promise<T> => {
  const user = requireUser(event)
  try {
    return await useDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${user.id}, true)`)
      return fn(tx)
    })
  }
  catch (error) {
    throw toHttpError(error)
  }
}
