// Shapes used throughout the UI — exactly what the /api/teams routes return.
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

/** Display name for a member: real name if we have one, else the email. */
export const memberLabel = (member: TeamMember) =>
  member.fullName || member.username || member.email

/**
 * Teams and team membership, via the app's own API (server/api/teams/**).
 *
 * Mirrors useCroissantEntries: shared `useState` collections plus CRUD helpers
 * that surface errors as strings instead of throwing. RLS in Postgres means
 * these calls only ever see teams the signed-in user is on.
 *
 * `activeTeamId` is shared state so the tracker page and this page agree on
 * which team is being viewed.
 */
export const useTeams = () => {
  const { user, fetchCurrentUser } = useCurrentUser()

  const teams = useState<Team[]>('teams', () => [])
  const members = useState<Record<string, TeamMember[]>>('team-members', () => ({}))
  const activeTeamId = useState<string | null>('active-team-id', () => null)
  const pending = useState<boolean>('teams-pending', () => false)
  const error = useState<string | null>('teams-error', () => null)

  const activeTeam = computed(() => teams.value.find(t => t.id === activeTeamId.value) ?? null)

  // The Hanko user id is the profile id; RLS compares against the same value.
  const currentProfileId = computed<string | null>(() => user.value?.id ?? null)

  // Keep the selection pointing at a team the user still belongs to.
  const syncActiveTeam = () => {
    if (!teams.value.some(t => t.id === activeTeamId.value)) {
      activeTeamId.value = teams.value[0]?.id ?? null
    }
  }

  const fetchTeams = async () => {
    pending.value = true
    error.value = null

    try {
      // Pages compare rows against currentProfileId, so make sure it's loaded.
      if (!user.value) await fetchCurrentUser()
      teams.value = await $fetch<Team[]>('/api/teams')
      syncActiveTeam()
    }
    catch (fetchError) {
      error.value = apiErrorMessage(fetchError)
    }
    finally {
      pending.value = false
    }
  }

  const createTeam = async (name: string) => {
    error.value = null

    try {
      // One server-side step creates the team and the creator's owner row
      // (create_team in server/db/migrations/0001_rls_functions.sql).
      const team = await $fetch<Team>('/api/teams', { method: 'POST', body: { name: name.trim() } })
      teams.value = [...teams.value, team]
      activeTeamId.value = team.id
      await fetchMembers(team.id)
      return team
    }
    catch (insertError) {
      error.value = apiErrorMessage(insertError)
      return null
    }
  }

  const forgetTeam = (teamId: string) => {
    teams.value = teams.value.filter(t => t.id !== teamId)
    const { [teamId]: _removed, ...rest } = members.value
    members.value = rest
    syncActiveTeam()
  }

  const deleteTeam = async (teamId: string) => {
    error.value = null

    try {
      await $fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
    }
    catch (deleteError) {
      error.value = apiErrorMessage(deleteError)
      return false
    }

    forgetTeam(teamId)
    return true
  }

  const fetchMembers = async (teamId: string) => {
    error.value = null

    try {
      const list = await $fetch<TeamMember[]>(`/api/teams/${teamId}/members`)
      members.value = { ...members.value, [teamId]: list }
    }
    catch (fetchError) {
      error.value = apiErrorMessage(fetchError)
    }
  }

  /**
   * Assign an existing profile to a team by the email on their account. The
   * lookup runs in Postgres (add_team_member_by_email), so the browser never
   * gets a queryable directory of everyone's email address.
   */
  const addMemberByEmail = async (teamId: string, email: string) => {
    error.value = null

    try {
      await $fetch(`/api/teams/${teamId}/members`, { method: 'POST', body: { email: email.trim() } })
    }
    catch (addError) {
      error.value = apiErrorMessage(addError)
      return false
    }

    await fetchMembers(teamId)
    return true
  }

  const removeMember = async (teamId: string, profileId: string) => {
    error.value = null

    try {
      await $fetch(`/api/teams/${teamId}/members/${profileId}`, { method: 'DELETE' })
    }
    catch (deleteError) {
      error.value = apiErrorMessage(deleteError)
      return false
    }

    // Removing yourself means you lose access to the team entirely.
    if (profileId === currentProfileId.value) {
      forgetTeam(teamId)
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
    currentProfileId,
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
