<template>
  <div class="p-4">
    <div class="max-w-6xl mx-auto">
      <PageHero
        title="Croissant Tracker"
        subtitle="Who owes croissants for being late?"
      />

      <!-- Error banner -->
      <UAlert
        v-if="pageError"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Couldn't reach the croissant database"
        :description="pageError"
        class="mb-8"
      />

      <!-- Team selector: entries belong to a team, so pick which one you're looking at -->
      <div
        v-if="teams.length > 1"
        class="flex items-center justify-center gap-3 mb-8"
      >
        <span class="text-sm font-medium text-muted">Team</span>
        <USelect
          v-model="activeTeamId"
          :items="teamOptions"
          value-key="value"
          icon="i-lucide-users"
          class="w-56"
        />
      </div>
      <div
        v-else-if="activeTeam"
        class="text-center text-sm text-muted mb-8"
      >
        Team: <span class="font-semibold text-highlighted">{{ activeTeam.name }}</span>
      </div>

      <!-- Loading state -->
      <EmptyState
        v-if="pending || teamsPending"
        loading
        description="Loading croissant debts…"
      />

      <!-- Not on a team yet: there's nowhere to log a late arrival -->
      <EmptyState
        v-else-if="!activeTeamId"
        icon="i-lucide-users"
        title="You're not on a team yet"
        description="Croissant debts are tracked per team, so create or join one to get started."
      >
        <UButton
          to="/teams"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          class="croissant-gradient text-white font-semibold"
        >
          Go to Teams
        </UButton>
      </EmptyState>

      <template v-else>
        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon="i-lucide-clock"
            :value="totalLateCount"
            label="Total Late Arrivals"
          />
          <StatCard
            icon="i-lucide-croissant"
            color="warning"
            :value="pendingCroissants"
            label="Croissants Owed"
          />
          <StatCard
            icon="i-lucide-circle-check"
            color="success"
            :value="deliveredCroissants"
            label="Croissants Delivered"
          />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Add New Late Arrival -->
          <SectionCard
            title="Add Late Arrival"
            icon="i-lucide-clock-plus"
          >
            <UForm
              :state="newEntry"
              class="space-y-4"
              @submit="addLateArrival"
            >
              <!-- A team member, not free text: the debtor has to be identifiable
                   for the "somebody else confirms it" rule to mean anything. -->
              <UFormField
                label="Name"
                required
              >
                <USelectMenu
                  v-model="newEntry.debtorProfileId"
                  :items="memberOptions"
                  value-key="value"
                  icon="i-lucide-user"
                  placeholder="Who was late?"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Date"
                required
              >
                <UInput
                  v-model="newEntry.date"
                  type="date"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Reason (optional)">
                <UTextarea
                  v-model="newEntry.reason"
                  placeholder="Why were they late?"
                  class="w-full"
                />
              </UFormField>

              <UButton
                type="submit"
                size="lg"
                icon="i-lucide-plus"
                class="w-full justify-center croissant-gradient text-white font-semibold"
              >
                Add to Tracker
              </UButton>
            </UForm>
          </SectionCard>

          <!-- Current Debts -->
          <SectionCard
            title="Current Croissant Debts"
            icon="i-lucide-croissant"
          >
            <EmptyState
              v-if="currentDebts.length === 0"
              icon="i-lucide-party-popper"
              description="No one owes croissants right now!"
            />

            <div
              v-else
              class="space-y-3"
            >
              <div
                v-for="debt in currentDebts"
                :key="debt.id"
                class="flex items-center justify-between gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20"
              >
                <div>
                  <div class="font-semibold text-highlighted">
                    {{ debt.name }}
                  </div>
                  <div class="text-sm text-muted">
                    {{ formatDate(debt.date) }}
                  </div>
                  <div
                    v-if="debt.reason"
                    class="text-xs text-dimmed italic"
                  >
                    {{ debt.reason }}
                  </div>
                </div>
                <!-- You can't clear your own tab — a teammate has to confirm it.
                     Enforced in Postgres too (prevent_self_delivery, 0007). -->
                <div
                  v-if="debt.debtorProfileId === currentProfileId"
                  class="flex items-center gap-1.5 shrink-0 text-xs text-muted text-right"
                >
                  <UIcon
                    name="i-lucide-user-check"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  A teammate has to confirm this one
                </div>
                <UButton
                  v-else
                  color="success"
                  size="sm"
                  icon="i-lucide-check"
                  class="shrink-0"
                  @click="markAsDelivered(debt.id)"
                >
                  Delivered
                </UButton>
              </div>
            </div>
          </SectionCard>
        </div>

        <!-- Leaderboard -->
        <div class="mt-8">
          <SectionCard
            title="Late Arrival Leaderboard"
            icon="i-lucide-trophy"
          >
            <p
              v-if="leaderboard.length === 0"
              class="text-center py-8 text-muted"
            >
              No data yet. Add some late arrivals to see the leaderboard!
            </p>

            <div
              v-else
              class="space-y-2"
            >
              <div
                v-for="(person, index) in leaderboard"
                :key="person.profileId"
                class="flex items-center justify-between gap-3 p-3 rounded-lg border"
                :class="index < 3 ? 'bg-primary/10 border-primary/25' : 'bg-elevated/50 border-default'"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="inline-flex items-center justify-center size-8 shrink-0 rounded-full font-bold tabular-nums text-sm"
                    :class="index < 3 ? 'bg-primary text-inverted' : 'bg-accented text-muted'"
                  >
                    <span class="sr-only">Rank</span>{{ index + 1 }}
                  </span>
                  <div>
                    <div class="font-semibold text-highlighted">
                      {{ person.name }}
                    </div>
                    <div class="text-sm text-muted">
                      {{ person.count }} late arrival{{ person.count !== 1 ? 's' : '' }}
                    </div>
                  </div>
                </div>
                <div class="text-right text-sm text-muted">
                  {{ person.delivered }} delivered, {{ person.pending }} pending
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <!-- Recent History -->
        <div class="mt-8">
          <SectionCard
            title="Recent History"
            icon="i-lucide-history"
          >
            <p
              v-if="recentEntries.length === 0"
              class="text-center py-8 text-muted"
            >
              No history yet. Start tracking late arrivals!
            </p>

            <div
              v-else
              class="space-y-2"
            >
              <div
                v-for="entry in recentEntries"
                :key="entry.id"
                class="flex items-center justify-between gap-3 p-3 rounded-lg bg-elevated/50 border border-default"
              >
                <div>
                  <div class="font-semibold text-highlighted">
                    {{ entry.name }}
                  </div>
                  <div class="text-sm text-muted">
                    {{ formatDate(entry.date) }}
                  </div>
                  <div
                    v-if="entry.reason"
                    class="text-xs text-dimmed italic"
                  >
                    {{ entry.reason }}
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <UBadge
                    :color="entry.delivered ? 'success' : 'warning'"
                    variant="subtle"
                    :icon="entry.delivered ? 'i-lucide-check' : 'i-lucide-croissant'"
                  >
                    {{ entry.delivered ? 'Delivered' : 'Pending' }}
                  </UBadge>
                  <div
                    v-if="entry.deliveredDate"
                    class="text-xs text-muted mt-1"
                  >
                    Delivered: {{ formatDate(entry.deliveredDate) }}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// Entries are persisted in Supabase (see useCroissantEntries / supabase/migrations).
const { entries, pending, error, fetchEntries, addEntry, markAsDelivered: deliverEntry } = useCroissantEntries()

// Entries belong to a team, so the tracker always shows one team at a time.
const { teams, members, activeTeamId, activeTeam, currentProfileId, pending: teamsPending, error: teamsError, fetchTeams, fetchMembers } = useTeams()

// The page loads from both composables (entries, plus members for the picker),
// so either one's failure belongs in the banner.
const pageError = computed(() => error.value || teamsError.value)

const teamOptions = computed(() => teams.value.map(team => ({ label: team.name, value: team.id })))

// Late arrivals are logged against a team member, so the debtor is a real
// account the "someone else marks it delivered" rule can be checked against.
const teamMembers = computed(() => (activeTeamId.value && members.value[activeTeamId.value]) || [])
const memberOptions = computed(() =>
  teamMembers.value.map(member => ({ label: memberLabel(member), value: member.profileId }))
)

const emptyEntry = () => ({
  debtorProfileId: null,
  date: new Date().toISOString().split('T')[0],
  reason: ''
})

const newEntry = ref(emptyEntry())

// Computed properties
const totalLateCount = computed(() => entries.value.length)
const pendingCroissants = computed(() => entries.value.filter(e => !e.delivered).length)
const deliveredCroissants = computed(() => entries.value.filter(e => e.delivered).length)

const currentDebts = computed(() => 
  entries.value
    .filter(e => !e.delivered)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
)

const recentEntries = computed(() => 
  [...entries.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
)

// Grouped by profile rather than by the name string, so renaming a profile
// doesn't split someone's history in two. The stored name is the fallback label
// for anyone who has since left the team.
const leaderboard = computed(() => {
  const counts = {}
  entries.value.forEach(entry => {
    if (!counts[entry.debtorProfileId]) {
      counts[entry.debtorProfileId] = { name: entry.name, count: 0, delivered: 0, pending: 0 }
    }
    counts[entry.debtorProfileId].count++
    if (entry.delivered) {
      counts[entry.debtorProfileId].delivered++
    } else {
      counts[entry.debtorProfileId].pending++
    }
  })

  return Object.entries(counts)
    .map(([profileId, data]) => {
      const member = teamMembers.value.find(m => m.profileId === profileId)
      return { profileId, ...data, name: member ? memberLabel(member) : data.name }
    })
    .sort((a, b) => b.count - a.count)
})

// Methods
const addLateArrival = async () => {
  if (!newEntry.value.debtorProfileId || !newEntry.value.date || !activeTeamId.value) return

  const debtor = teamMembers.value.find(m => m.profileId === newEntry.value.debtorProfileId)
  if (!debtor) return

  await addEntry({
    teamId: activeTeamId.value,
    debtorProfileId: debtor.profileId,
    // Snapshot of the label at logging time; the profile id is what counts.
    name: memberLabel(debtor),
    date: newEntry.value.date,
    reason: newEntry.value.reason
  })

  // Reset form
  newEntry.value = emptyEntry()
}

const markAsDelivered = (id) => deliverEntry(id)

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Lifecycle: teams first, since the entries query is scoped to the active one.
// Members come along for the ride — they populate the "who was late?" picker and
// the leaderboard labels.
const loadTeam = async (teamId) => {
  await Promise.all([
    fetchEntries(teamId),
    teamId ? fetchMembers(teamId) : Promise.resolve()
  ])
}

onMounted(async () => {
  await fetchTeams()
  await loadTeam(activeTeamId.value)
})

watch(activeTeamId, teamId => {
  newEntry.value = emptyEntry()
  loadTeam(teamId)
})

// SEO
useHead({
  title: 'Croissant Tracker — Track Late Arrivals',
  meta: [
    { name: 'description', content: 'Fun app to track who owes croissants for being late to meetings or work!' }
  ]
})
</script>