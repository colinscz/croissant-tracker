import { sql } from 'drizzle-orm'

interface MemberRow {
  [key: string]: unknown
  profile_id: string
  email: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'owner' | 'member'
  created_at: string
}

// Member list with emails. list_team_members returns nothing unless the caller
// is on the team, so this is not an email directory.
export default defineEventHandler(async (event) => {
  const teamId = uuidParam(event, 'id')

  const rows = await withUser(event, tx =>
    tx.execute<MemberRow>(sql`select * from public.list_team_members(${teamId})`),
  )

  return rows.map(row => ({
    profileId: row.profile_id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: new Date(row.created_at).toISOString(),
  }))
})
