// Database types for the tables that exist so far (F1).
// Later you can regenerate this file with:
//   npx supabase gen types typescript --project-id YOUR-PROJECT-REF > src/lib/types.ts

export type Role = 'admin' | 'student' | 'guardian' | 'pending'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: Role
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: Role
          created_at?: string
        }
        Update: {
          full_name?: string | null
          role?: Role
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          full_name: string
          class_level: string | null
          email: string | null
          phone: string | null
          profile_id: string | null
          joined_on: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          class_level?: string | null
          email?: string | null
          phone?: string | null
          joined_on?: string
          active?: boolean
        }
        Update: {
          full_name?: string
          class_level?: string | null
          email?: string | null
          phone?: string | null
          joined_on?: string
          active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'students_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      keepalive: { Args: Record<string, never>; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type NewStudent = Database['public']['Tables']['students']['Insert']
