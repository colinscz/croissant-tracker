import { eq } from 'drizzle-orm'
import { teams } from '../../../db/schema'

// Only owners pass the RLS delete policy; anyone else deletes zero rows.
export default defineEventHandler(async (event) => {
  const teamId = uuidParam(event, 'id')

  const deleted = await withUser(event, tx =>
    tx.delete(teams).where(eq(teams.id, teamId)).returning({ id: teams.id }),
  )

  if (!deleted.length) {
    throw createError({ statusCode: 403, message: 'Only team owners can delete a team.' })
  }
  return { ok: true }
})
