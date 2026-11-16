import { asc, eq } from 'drizzle-orm'
import { teamMembers, teams } from '../../db/schema'

// Teams the caller is on, each with the caller's role. RLS already limits
// `teams` to the caller's teams; the join picks out their own membership row.
export default defineEventHandler(event =>
  withUser(event, async (tx) => {
    const user = requireUser(event)
    return tx
      .select({
        id: teams.id,
        name: teams.name,
        createdBy: teams.createdBy,
        createdAt: teams.createdAt,
        role: teamMembers.role,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.profileId, user.id))
      .orderBy(asc(teams.createdAt))
  }),
)
