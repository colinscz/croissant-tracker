import { and, eq } from 'drizzle-orm'
import { teamMembers } from '../../../../db/schema'

// Owners can remove anyone; members can remove themselves (leave). Both rules
// are the RLS delete policy; the last-owner guard is a trigger.
export default defineEventHandler(async (event) => {
  const teamId = uuidParam(event, 'id')
  const profileId = uuidParam(event, 'profileId')

  const deleted = await withUser(event, tx =>
    tx
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.profileId, profileId)))
      .returning({ profileId: teamMembers.profileId }),
  )

  if (!deleted.length) {
    throw createError({ statusCode: 403, message: 'Only team owners can remove other members.' })
  }
  return { ok: true }
})
