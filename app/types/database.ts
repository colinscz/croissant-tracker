// Database schema types for the typed Supabase client.
// Mirror of supabase/migrations/0001–0007.
//
// `profiles` is not created by this repo's migrations — it already exists in the
// Supabase project (the standard profile table keyed on the auth.users id). It's
// declared here so team membership joins type-check.

export interface Database {
  public: {
    Tables: {
      croissant_entries: {
        Row: {
          id: number
          team_id: string
          debtor_profile_id: string
          name: string
          date: string
          reason: string
          delivered: boolean
          delivered_date: string | null
          created_at: string
        }
        Insert: {
          id?: number
          team_id: string
          debtor_profile_id: string
          name: string
          date: string
          reason?: string
          delivered?: boolean
          delivered_date?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          team_id?: string
          debtor_profile_id?: string
          name?: string
          date?: string
          reason?: string
          delivered?: boolean
          delivered_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'croissant_entries_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'croissant_entries_debtor_profile_id_fkey'
            columns: ['debtor_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          team_id: string
          profile_id: string
          role: string
          created_at: string
        }
        Insert: {
          team_id: string
          profile_id: string
          role?: string
          created_at?: string
        }
        Update: {
          team_id?: string
          profile_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          email?: string | null
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_team: {
        Args: { p_name: string }
        Returns: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
      }
      add_team_member_by_email: {
        Args: { p_team_id: string, p_email: string }
        Returns: {
          team_id: string
          profile_id: string
          role: string
          created_at: string
        }
      }
      list_team_members: {
        Args: { p_team_id: string }
        Returns: {
          profile_id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: string
          created_at: string
        }[]
      }
    }
    Enums: Record<string, never>
  }
}
