<template>
  <div class="p-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="text-6xl animate-float">🥐</div>
          <h1 class="text-4xl font-bold text-amber-800">Teams</h1>
          <div class="text-6xl animate-float" style="animation-delay: 0.5s">🥐</div>
        </div>
        <p class="text-lg text-amber-700">Croissant debts are tracked per team — only members can see them</p>
      </div>

      <!-- Error banner -->
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="error"
        class="mb-8"
      />

      <div class="space-y-8">
        <!-- Create a team -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">➕</div>
              <h2 class="text-xl font-semibold text-amber-800">Create a Team</h2>
            </div>
          </template>

          <UForm :state="newTeam" class="space-y-4" @submit="createNewTeam">
            <UFormField label="Team name" required>
              <UInput
                v-model="newTeam.name"
                placeholder="Marketing, Team Rocket, The Usual Suspects…"
              />
            </UFormField>

            <UButton
              type="submit"
              class="w-full croissant-gradient text-white font-semibold"
              size="lg"
              :loading="creating"
            >
              <div class="flex items-center gap-2">
                <span>Create Team</span>
                <div class="text-lg">🥐</div>
              </div>
            </UButton>
          </UForm>
        </UCard>

        <!-- Your teams -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">👥</div>
              <h2 class="text-xl font-semibold text-amber-800">Your Teams</h2>
            </div>
          </template>

          <div v-if="pending && teams.length === 0" class="text-center py-8 text-amber-600">
            <div class="text-4xl mb-2 animate-float">🥐</div>
            <p>Loading your teams…</p>
          </div>

          <div v-else-if="teams.length === 0" class="text-center py-8 text-amber-600">
            <div class="text-4xl mb-2">🫙</div>
            <p>You're not on a team yet. Create one above to start tracking!</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="team in teams"
              :key="team.id"
              class="flex items-center justify-between p-3 rounded-lg border cursor-pointer"
              :class="team.id === selectedTeamId
                ? 'bg-orange-50 border-orange-300'
                : 'bg-amber-50 border-amber-200'"
              @click="selectTeam(team.id)"
            >
              <div>
                <div class="font-semibold text-amber-800 flex items-center gap-2">
                  <span>{{ team.name }}</span>
                  <UBadge v-if="team.role === 'owner'" color="primary" variant="subtle" size="sm">
                    Owner
                  </UBadge>
                  <UBadge v-if="team.id === activeTeamId" color="success" variant="subtle" size="sm">
                    Active
                  </UBadge>
                </div>
                <div class="text-sm text-amber-600">
                  {{ memberCount(team.id) }}
                </div>
              </div>

              <UButton
                v-if="team.role === 'owner'"
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash-2"
                :aria-label="`Delete ${team.name}`"
                @click.stop="confirmDelete(team)"
              />
            </div>
          </div>
        </UCard>

        <!-- Members of the selected team -->
        <UCard v-if="selectedTeam" class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">📇</div>
              <h2 class="text-xl font-semibold text-amber-800">
                Members of {{ selectedTeam.name }}
              </h2>
            </div>
          </template>

          <div v-if="selectedMembers.length === 0" class="text-center py-8 text-amber-600">
            <p>No members loaded yet.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="member in selectedMembers"
              :key="member.profileId"
              class="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
            >
              <div>
                <div class="font-semibold text-amber-800 flex items-center gap-2">
                  <span>{{ memberLabel(member) }}</span>
                  <UBadge v-if="member.role === 'owner'" color="primary" variant="subtle" size="sm">
                    Owner
                  </UBadge>
                  <UBadge v-if="member.profileId === currentProfileId" color="neutral" variant="subtle" size="sm">
                    You
                  </UBadge>
                </div>
                <div class="text-sm text-amber-600">{{ member.email }}</div>
              </div>

              <UButton
                v-if="canRemove(member)"
                color="error"
                variant="ghost"
                size="sm"
                :aria-label="`Remove ${memberLabel(member)}`"
                @click="removeTeamMember(member)"
              >
                {{ member.profileId === currentProfileId ? 'Leave' : 'Remove' }}
              </UButton>
            </div>
          </div>

          <template v-if="selectedTeam.role === 'owner'" #footer>
            <UForm :state="newMember" class="space-y-4" @submit="addMember">
              <UFormField
                label="Add a member by email"
                required
                help="They need an existing Croissant Tracker profile — the email on their account."
              >
                <UInput
                  v-model="newMember.email"
                  type="email"
                  placeholder="colleague@example.com"
                  autocomplete="off"
                  icon="i-lucide-mail"
                />
              </UFormField>

              <UButton
                type="submit"
                class="w-full croissant-gradient text-white font-semibold"
                size="lg"
                :loading="addingMember"
              >
                <div class="flex items-center gap-2">
                  <span>Add to Team</span>
                  <div class="text-lg">✉️</div>
                </div>
              </UButton>
            </UForm>
          </template>
        </UCard>
      </div>
    </div>

    <!-- Delete confirmation -->
    <UModal v-model:open="deleteOpen" title="Delete this team?">
      <template #body>
        <p class="text-amber-700">
          Deleting <span class="font-semibold">{{ teamToDelete?.name }}</span> also deletes every
          croissant entry logged for it. This can't be undone.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="deleteOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="deleting" @click="deleteSelectedTeam">
            Delete team
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Team, TeamMember } from '~/composables/useTeams'

const {
  teams,
  members,
  activeTeamId,
  currentProfileId,
  pending,
  error,
  fetchTeams,
  createTeam,
  deleteTeam,
  fetchMembers,
  addMemberByEmail,
  removeMember,
} = useTeams()

// Which team's member list is expanded below. Defaults to the active team.
const selectedTeamId = ref<string | null>(null)
const selectedTeam = computed(() => teams.value.find(t => t.id === selectedTeamId.value) ?? null)
const selectedMembers = computed(() =>
  selectedTeamId.value ? members.value[selectedTeamId.value] ?? [] : []
)

const newTeam = reactive({ name: '' })
const newMember = reactive({ email: '' })
const creating = ref(false)
const addingMember = ref(false)
const deleting = ref(false)
const deleteOpen = ref(false)
const teamToDelete = ref<Team | null>(null)

const memberCount = (teamId: string) => {
  const list = members.value[teamId]
  if (!list) return 'Select to see members'
  return `${list.length} member${list.length === 1 ? '' : 's'}`
}

// Owners can remove anyone; everyone can leave a team themselves. The last
// owner can't go — the database rejects it, so don't offer the button either.
const canRemove = (member: TeamMember) => {
  const isSelf = member.profileId === currentProfileId.value
  if (!isSelf && selectedTeam.value?.role !== 'owner') return false
  if (member.role !== 'owner') return true
  return selectedMembers.value.filter(m => m.role === 'owner').length > 1
}

const selectTeam = async (teamId: string) => {
  selectedTeamId.value = teamId
  // Also make it the team the tracker page shows.
  activeTeamId.value = teamId
  if (!members.value[teamId]) await fetchMembers(teamId)
}

const createNewTeam = async () => {
  if (!newTeam.name.trim()) return

  creating.value = true
  const team = await createTeam(newTeam.name)
  creating.value = false

  if (team) {
    newTeam.name = ''
    selectedTeamId.value = team.id
  }
}

const addMember = async () => {
  if (!newMember.email.trim() || !selectedTeamId.value) return

  addingMember.value = true
  const added = await addMemberByEmail(selectedTeamId.value, newMember.email)
  addingMember.value = false

  if (added) newMember.email = ''
}

const removeTeamMember = async (member: TeamMember) => {
  if (!selectedTeamId.value) return

  const removedTeamId = selectedTeamId.value
  const removed = await removeMember(removedTeamId, member.profileId)

  // If you removed yourself, the team is gone from your list.
  if (removed && member.profileId === currentProfileId.value) {
    selectedTeamId.value = activeTeamId.value
  }
}

const confirmDelete = (team: Team) => {
  teamToDelete.value = team
  deleteOpen.value = true
}

const deleteSelectedTeam = async () => {
  if (!teamToDelete.value) return

  deleting.value = true
  const deleted = await deleteTeam(teamToDelete.value.id)
  deleting.value = false

  if (deleted) {
    if (selectedTeamId.value === teamToDelete.value.id) {
      selectedTeamId.value = activeTeamId.value
    }
    deleteOpen.value = false
    teamToDelete.value = null
  }
}

onMounted(async () => {
  await fetchTeams()
  if (activeTeamId.value) await selectTeam(activeTeamId.value)
})

useHead({
  title: 'Teams - Croissant Tracker',
  meta: [
    { name: 'description', content: 'Create teams and assign colleagues to them so croissant debts stay within the group.' }
  ]
})
</script>
