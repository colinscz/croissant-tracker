import { sql } from 'drizzle-orm'

// Emails we've already written to `profiles` in this process, keyed by user id.
// Saves a write transaction on every API call; a changed email misses the cache
// and is synced again.
const syncedEmails = new Map<string, string>()

/**
 * For every /api request: verify the Hanko session (if any) into
 * `event.context.user`, and make sure the user has an up-to-date `profiles`
 * row — the job Supabase's `auth.users` trigger used to do. Team membership and
 * entries reference that row, and "add member by email" looks it up.
 *
 * Page requests are left alone: this is a client-rendered SPA and page access
 * is handled by @nuxtjs/hanko's route middleware in the browser.
 */
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return

  const user = await verifyHankoSession(event)
  if (!user) return
  event.context.user = user

  // Hanko is configured with email as a required identifier, so the claim is
  // always there in practice; a null still creates the profile row.
  const email = user.email ?? ''
  if (syncedEmails.get(user.id) === email) return

  try {
    await useDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${user.id}, true)`)
      await tx.execute(sql`select app.sync_own_profile(${user.email})`)
    })
    syncedEmails.set(user.id, email)
  }
  catch (error) {
    throw toHttpError(error)
  }
})
