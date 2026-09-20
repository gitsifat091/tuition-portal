// Database types for the tables that exist so far (F1, F2, F3).
// Later you can regenerate this file with:
//   npx supabase gen types typescript --project-id YOUR-PROJECT-REF > src/lib/types.ts

export type Role = 'admin' | 'student' | 'guardian' | 'pending'
export type SessionStatus = 'scheduled' | 'cancelled' | 'rescheduled' | 'extra'

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
      batches: {
        Row: {
          id: string
          name: string
          class_level: string | null
          subject: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          class_level?: string | null
          subject?: string | null
          active?: boolean
        }
        Update: {
          name?: string
          class_level?: string | null
          subject?: string | null
          active?: boolean
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          batch_id: string
          monthly_fee: number
          start_month: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          batch_id: string
          monthly_fee?: number
          start_month?: string
          active?: boolean
        }
        Update: {
          monthly_fee?: number
          start_month?: string
          active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'enrollments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enrollments_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'batches'
            referencedColumns: ['id']
          },
        ]
      }
      guardian_links: {
        Row: {
          id: string
          student_id: string
          guardian_name: string | null
          guardian_email: string
          phone: string | null
          relation: string | null
          guardian_profile_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          guardian_name?: string | null
          guardian_email: string
          phone?: string | null
          relation?: string | null
        }
        Update: {
          guardian_name?: string | null
          guardian_email?: string
          phone?: string | null
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'guardian_links_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'guardian_links_guardian_profile_id_fkey'
            columns: ['guardian_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      weekly_slots: {
        Row: {
          id: string
          batch_id: string
          weekday: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          weekday: number
          start_time: string
          end_time: string
        }
        Update: {
          weekday?: number
          start_time?: string
          end_time?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_slots_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'batches'
            referencedColumns: ['id']
          },
        ]
      }
      class_sessions: {
        Row: {
          id: string
          batch_id: string
          slot_id: string | null
          slot_date: string | null
          starts_at: string
          ends_at: string
          status: SessionStatus
          original_starts_at: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          starts_at: string
          ends_at: string
          status?: SessionStatus
          note?: string | null
        }
        Update: {
          starts_at?: string
          ends_at?: string
          status?: SessionStatus
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'class_sessions_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'batches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_sessions_slot_id_fkey'
            columns: ['slot_id']
            isOneToOne: false
            referencedRelation: 'weekly_slots'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      keepalive: { Args: Record<string, never>; Returns: string }
      generate_sessions: { Args: { p_weeks?: number; p_batch_id?: string }; Returns: number }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Student = Tables['students']['Row']
export type NewStudent = Tables['students']['Insert']
export type Batch = Tables['batches']['Row']
export type NewBatch = Tables['batches']['Insert']
export type Enrollment = Tables['enrollments']['Row']
export type NewEnrollment = Tables['enrollments']['Insert']
export type GuardianLink = Tables['guardian_links']['Row']
export type NewGuardianLink = Tables['guardian_links']['Insert']
export type WeeklySlot = Tables['weekly_slots']['Row']
export type NewWeeklySlot = Tables['weekly_slots']['Insert']
export type ClassSession = Tables['class_sessions']['Row']
export type NewClassSession = Tables['class_sessions']['Insert']
