import type { EntryRow } from '~~/server/db/schema'

// Shape used throughout the UI. `id` is the bigint primary key assigned by
// Postgres.
export interface CroissantEntry {
  id: number
  teamId: string
  /** Profile that owes the croissants — the one person who can't resolve it. */
  debtorProfileId: string
  name: string
  date: string
  reason: string
  delivered: boolean
  deliveredDate: string | null
  createdAt: string
}

// The API returns Drizzle rows, already camelCase; JSON leaves them as-is.
const fromRow = (row: EntryRow): CroissantEntry => ({ ...row, reason: row.reason ?? '' })

/**
 * Croissant entries, via the app's own API (server/api/teams/[id]/entries,
 * server/api/entries/[id]).
 *
 * Provides a reactive `entries` list plus CRUD helpers. State is shared across
 * components via `useState`; errors are surfaced as strings, never thrown.
 *
 * Entries belong to a team, so every call is scoped to one: RLS in Postgres
 * independently rejects any team the signed-in user isn't a member of.
 *
 * Every entry names the profile that owes the croissants. The
 * `prevent_self_delivery` trigger rejects `markAsDelivered` on your own debt,
 * and that failure arrives here as an ordinary error message.
 */
export const useCroissantEntries = () => {
  const entries = useState<CroissantEntry[]>('croissant-entries', () => [])
  const pending = useState<boolean>('croissant-entries-pending', () => false)
  const error = useState<string | null>('croissant-entries-error', () => null)

  const fetchEntries = async (teamId: string | null) => {
    error.value = null

    // No team selected yet (e.g. the user isn't on one) — nothing to show.
    if (!teamId) {
      entries.value = []
      return
    }

    pending.value = true

    try {
      const rows = await $fetch<EntryRow[]>(`/api/teams/${teamId}/entries`)
      entries.value = rows.map(fromRow)
    }
    catch (fetchError) {
      error.value = apiErrorMessage(fetchError)
    }
    finally {
      pending.value = false
    }
  }

  // `name` is a display snapshot of the debtor's label at logging time; the
  // profile id is what the self-delivery rule is enforced against.
  const addEntry = async (input: {
    teamId: string
    debtorProfileId: string
    name: string
    date: string
    reason?: string
  }) => {
    error.value = null

    try {
      const row = await $fetch<EntryRow>(`/api/teams/${input.teamId}/entries`, {
        method: 'POST',
        body: {
          debtorProfileId: input.debtorProfileId,
          name: input.name.trim(),
          date: input.date,
          reason: input.reason?.trim() ?? '',
        },
      })
      entries.value = [fromRow(row), ...entries.value]
    }
    catch (insertError) {
      error.value = apiErrorMessage(insertError)
    }
  }

  const markAsDelivered = async (id: number) => {
    error.value = null
    try {
      const row = await $fetch<EntryRow>(`/api/entries/${id}`, {
        method: 'PATCH',
        body: { delivered: true },
      })
      const updated = fromRow(row)
      entries.value = entries.value.map(e => (e.id === id ? updated : e))
    }
    catch (updateError) {
      error.value = apiErrorMessage(updateError)
    }
  }

  return {
    entries,
    pending,
    error,
    fetchEntries,
    addEntry,
    markAsDelivered,
  }
}
