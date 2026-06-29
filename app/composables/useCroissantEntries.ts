import type { Database } from '~/types/database'

// Shape used throughout the UI. Mirrors the previous localStorage records so
// the page components didn't need to change, but the `id` is now the bigint
// primary key assigned by Postgres.
export interface CroissantEntry {
  id: number
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
 */
export const useCroissantEntries = () => {
  // Typed via the `supabase.types` path configured in nuxt.config.ts.
  const supabase = useSupabaseClient()

  const entries = useState<CroissantEntry[]>('croissant-entries', () => [])
  const pending = useState<boolean>('croissant-entries-pending', () => false)
  const error = useState<string | null>('croissant-entries-error', () => null)

  const fetchEntries = async () => {
    pending.value = true
    error.value = null

    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false })

    if (fetchError) {
      error.value = fetchError.message
      pending.value = false
      return
    }

    entries.value = (data ?? []).map(fromRow)
    pending.value = false
  }

  const addEntry = async (input: { name: string, date: string, reason?: string }) => {
    error.value = null

    const { data, error: insertError } = await supabase
      .from(TABLE)
      .insert({
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
