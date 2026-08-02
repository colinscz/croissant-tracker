// Database schema types for the typed Supabase client.
// Mirror of supabase/migrations/0001_croissant_entries.sql.

export interface Database {
  public: {
    Tables: {
      croissant_entries: {
        Row: {
          id: number
          name: string
          date: string
          reason: string
          delivered: boolean
          delivered_date: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          date: string
          reason?: string
          delivered?: boolean
          delivered_date?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          date?: string
          reason?: string
          delivered?: boolean
          delivered_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
