import type { Database } from '~/types/database'

// Shape used throughout the UI. Mirrors the previous localStorage records so
// the page components didn't need to change, but the `id` is now the bigint
// primary key assigned by Postgres.
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

type EntryRow = Database['public']['Tables']['croissant_entries']['Row']

const TABLE = 'croissant_entries'

const fromRow = (row: EntryRow): CroissantEntry => ({
  id: row.id,
  teamId: row.team_id,
  debtorProfileId: row.debtor_profile_id,
  name: row.name,
  date: row.date,
  reason: row.reason ?? '',
  delivered: row.delivered,
  deliveredDate: row.delivered_date,
  createdAt: row.created_at,
})

/**
 * Croissant entries backed by Supabase.
 *
 * Provides a reactive `entries` list plus CRUD helpers. State is shared across
 * components via `useState`, and changes are persisted to the
 * `croissant_entries` table.
 *
 * Entries belong to a team (migration 0004), so every call is scoped to one:
 * `fetchEntries`/`addEntry` take the team id, and RLS independently rejects any
 * team the signed-in user isn't a member of.
 *
 * Every entry names the profile that owes the croissants (migration 0007). The
 * `prevent_self_delivery` trigger rejects `markAsDelivered` on your own debt, so
 * that failure arrives here as an ordinary error message.
 */
export const useCroissantEntries = () => {
  const supabase = useSupabaseClient<Database>()

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

    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('team_id', teamId)
      .order('date', { ascending: false })

    if (fetchError) {
      error.value = fetchError.message
      pending.value = false
      return
    }

    entries.value = (data ?? []).map(fromRow)
    pending.value = false
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

    const { data, error: insertError } = await supabase
      .from(TABLE)
      .insert({
        team_id: input.teamId,
        debtor_profile_id: input.debtorProfileId,
        name: input.name.trim(),
        date: input.date,
        reason: input.reason?.trim() ?? '',
        delivered: false,
        delivered_date: null,
      })
      .select()
      .single()

    if (insertError) {
      error.value = insertError.message
      return
    }

    if (data) {
      entries.value = [fromRow(data), ...entries.value]
    }
  }

  const markAsDelivered = async (id: number) => {
    error.value = null
    const deliveredDate = new Date().toISOString().split('T')[0]

    const { data, error: updateError } = await supabase
      .from(TABLE)
      .update({ delivered: true, delivered_date: deliveredDate })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      error.value = updateError.message
      return
    }

    if (data) {
      const updated = fromRow(data)
      entries.value = entries.value.map(e => (e.id === id ? updated : e))
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
