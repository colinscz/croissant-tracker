import type { Database } from '~/types/database'

// Shapes used throughout the UI. DB columns are snake_case; these are the
// camelCase equivalents, matching the convention in useCroissantEntries.
export interface Team {
  id: string
  name: string
  createdBy: string
  createdAt: string
  role: TeamRole
}

export interface TeamMember {
  profileId: string
  email: string
  username: string | null
  fullName: string | null
  avatarUrl: string | null
  role: TeamRole
  createdAt: string
}

export type TeamRole = 'owner' | 'member'

type TeamRow = Database['public']['Tables']['teams']['Row']
type MemberRpcRow = Database['public']['Functions']['list_team_members']['Returns'][number]

// `teams` joined with the caller's own membership row, so each team carries the
// role the current user has on it.
type TeamWithMembership = TeamRow & { team_members: { role: string }[] }

const asRole = (role: string): TeamRole => (role === 'owner' ? 'owner' : 'member')

const fromTeamRow = (row: TeamWithMembership): Team => ({
  id: row.id,
  name: row.name,
  createdBy: row.created_by,
  createdAt: row.created_at,
  role: asRole(row.team_members[0]?.role ?? 'member'),
})

const fromMemberRow = (row: MemberRpcRow): TeamMember => ({
  profileId: row.profile_id,
  email: row.email,
  username: row.username,
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
  role: asRole(row.role),
  createdAt: row.created_at,
})

/** Display name for a member: real name if we have one, else the email. */
export const memberLabel = (member: TeamMember) =>
  member.fullName || member.username || member.email

/**
 * Teams and team membership backed by Supabase.
 *
 * Mirrors useCroissantEntries: shared `useState` collections plus CRUD helpers
 * that surface Postgres errors as strings instead of throwing. RLS (migration
 * 0003) means these queries only ever return teams the signed-in user is on.
 *
 * `activeTeamId` is shared state so the tracker page and this page agree on
 * which team is being viewed.
 */
export const useTeams = () => {
  // Typed via the `supabase.types` path configured in nuxt.config.ts.
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const teams = useState<Team[]>('teams', () => [])
  const members = useState<Record<string, TeamMember[]>>('team-members', () => ({}))
  const activeTeamId = useState<string | null>('active-team-id', () => null)
  const pending = useState<boolean>('teams-pending', () => false)
  const error = useState<string | null>('teams-error', () => null)

  const activeTeam = computed(() => teams.value.find(t => t.id === activeTeamId.value) ?? null)

  // Keep the selection pointing at a team the user still belongs to.
  const syncActiveTeam = () => {
    if (!teams.value.some(t => t.id === activeTeamId.value)) {
      activeTeamId.value = teams.value[0]?.id ?? null
    }
  }

  const fetchTeams = async () => {
    if (!user.value) return

    pending.value = true
    error.value = null

    const { data, error: fetchError } = await supabase
      .from('teams')
      .select('*, team_members!inner(role)')
      .eq('team_members.profile_id', user.value.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      error.value = fetchError.message
      pending.value = false
      return
    }

    teams.value = ((data ?? []) as TeamWithMembership[]).map(fromTeamRow)
    syncActiveTeam()
    pending.value = false
  }

  const createTeam = async (name: string) => {
    error.value = null

    if (!user.value) {
      error.value = 'You need to be signed in to create a team.'
      return null
    }

    // Via RPC rather than a table insert: creating the team and the creator's
    // owner row has to happen in one server-side step (see create_team in 0003).
    const { data, error: insertError } = await supabase.rpc('create_team', { p_name: name.trim() })

    if (insertError) {
      error.value = insertError.message
      return null
    }

    // create_team made the creator an owner.
    const team: Team = {
      id: data.id,
      name: data.name,
      createdBy: data.created_by,
      createdAt: data.created_at,
      role: 'owner',
    }

    teams.value = [...teams.value, team]
    activeTeamId.value = team.id
    await fetchMembers(team.id)
    return team
  }

  const deleteTeam = async (teamId: string) => {
    error.value = null

    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      error.value = deleteError.message
      return false
    }

    teams.value = teams.value.filter(t => t.id !== teamId)
    const { [teamId]: _removed, ...rest } = members.value
    members.value = rest
    syncActiveTeam()
    return true
  }

  const fetchMembers = async (teamId: string) => {
    error.value = null

    const { data, error: rpcError } = await supabase.rpc('list_team_members', { p_team_id: teamId })

    if (rpcError) {
      error.value = rpcError.message
      return
    }

    members.value = { ...members.value, [teamId]: (data ?? []).map(fromMemberRow) }
  }

  /**
   * Assign an existing profile to a team by the email on their account.
   * The lookup runs in Postgres (add_team_member_by_email) because auth.users
   * isn't readable from the browser.
   */
  const addMemberByEmail = async (teamId: string, email: string) => {
    error.value = null

    const { error: rpcError } = await supabase.rpc('add_team_member_by_email', {
      p_team_id: teamId,
      p_email: email.trim(),
    })

    if (rpcError) {
      error.value = rpcError.message
      return false
    }

    await fetchMembers(teamId)
    return true
  }

  const removeMember = async (teamId: string, profileId: string) => {
    error.value = null

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('profile_id', profileId)

    if (deleteError) {
      error.value = deleteError.message
      return false
    }

    // Removing yourself means you lose access to the team entirely.
    if (profileId === user.value?.id) {
      teams.value = teams.value.filter(t => t.id !== teamId)
      const { [teamId]: _removed, ...rest } = members.value
      members.value = rest
      syncActiveTeam()
      return true
    }

    await fetchMembers(teamId)
    return true
  }

  return {
    teams,
    members,
    activeTeamId,
    activeTeam,
    pending,
    error,
    fetchTeams,
    createTeam,
    deleteTeam,
    fetchMembers,
    addMemberByEmail,
    removeMember,
  }
}
