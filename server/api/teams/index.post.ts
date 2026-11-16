import { sql } from 'drizzle-orm'

interface CreatedTeam {
  [key: string]: unknown
  id: string
  name: string
  created_by: string
  created_at: string
}

// Via the create_team function: the team row and the creator's owner row have
// to be written in one security-definer step (see 0001_rls_functions.sql).
export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: unknown }>(event)
  const name = requireString(body?.name, 'Team name', { max: 100 })

  return withUser(event, async (tx) => {
    const [team] = await tx.execute<CreatedTeam>(
      sql`select id, name, created_by, created_at from public.create_team(${name})`,
    )
    if (!team) throw createError({ statusCode: 500, message: 'Team was not created' })
    return {
      id: team.id,
      name: team.name,
      createdBy: team.created_by,
      createdAt: new Date(team.created_at).toISOString(),
      role: 'owner' as const,
    }
  })
})
