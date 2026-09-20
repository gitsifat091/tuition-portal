import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type {
  Batch,
  Enrollment,
  GuardianLink,
  NewBatch,
  NewEnrollment,
  NewGuardianLink,
  NewStudent,
  Student,
} from '../../lib/types'

// Every admin query key starts with 'admin', so one invalidate refreshes all
// admin screens after any change. The data is small, so this stays cheap.
const adminKey = ['admin'] as const

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export type StudentListItem = Student & {
  enrollments: Array<Pick<Enrollment, 'id' | 'active'> & { batches: Pick<Batch, 'id' | 'name'> | null }>
  guardian_links: Array<Pick<GuardianLink, 'id' | 'guardian_profile_id'>>
}

export function useStudentsList() {
  return useQuery({
    queryKey: [...adminKey, 'students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, enrollments(id, active, batches(id, name)), guardian_links(id, guardian_profile_id)')
        .order('full_name')
      if (error) throw error
      return data as unknown as StudentListItem[]
    },
  })
}

export type StudentDetail = Student & {
  enrollments: Array<Enrollment & { batches: Batch | null }>
  guardian_links: GuardianLink[]
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: [...adminKey, 'student', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, enrollments(*, batches(*)), guardian_links(*)')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as StudentDetail | null
    },
  })
}

export type BatchListItem = Batch & { enrollments: Array<Pick<Enrollment, 'id' | 'active' | 'monthly_fee'>> }

export function useBatchesList() {
  return useQuery({
    queryKey: [...adminKey, 'batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, enrollments(id, active, monthly_fee)')
        .order('name')
      if (error) throw error
      return data as unknown as BatchListItem[]
    },
  })
}

export type BatchDetail = Batch & {
  enrollments: Array<
    Enrollment & { students: Pick<Student, 'id' | 'full_name' | 'class_level' | 'active' | 'profile_id'> | null }
  >
}

export function useBatch(id: string | undefined) {
  return useQuery({
    queryKey: [...adminKey, 'batch', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, enrollments(*, students(id, full_name, class_level, active, profile_id))')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as BatchDetail | null
    },
  })
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

function useAdminMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKey }),
  })
}

export function useAddStudent() {
  return useAdminMutation(async (input: NewStudent) => {
    const { data, error } = await supabase.from('students').insert(input).select().single()
    if (error) throw error
    return data
  })
}

export function useUpdateStudent() {
  return useAdminMutation(async ({ id, ...changes }: { id: string } & Partial<NewStudent>) => {
    const { data, error } = await supabase.from('students').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  })
}

export function useDeleteStudent() {
  return useAdminMutation(async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) throw error
  })
}

export function useAddBatch() {
  return useAdminMutation(async (input: NewBatch) => {
    const { data, error } = await supabase.from('batches').insert(input).select().single()
    if (error) throw error
    return data
  })
}

export function useUpdateBatch() {
  return useAdminMutation(async ({ id, ...changes }: { id: string } & Partial<NewBatch>) => {
    const { error } = await supabase.from('batches').update(changes).eq('id', id)
    if (error) throw error
  })
}

export function useDeleteBatch() {
  return useAdminMutation(async (id: string) => {
    const { error } = await supabase.from('batches').delete().eq('id', id)
    if (error) throw error
  })
}

export function useAddEnrollment() {
  return useAdminMutation(async (input: NewEnrollment) => {
    const { error } = await supabase.from('enrollments').insert(input)
    if (error) throw error
  })
}

export function useUpdateEnrollment() {
  return useAdminMutation(
    async ({ id, ...changes }: { id: string; monthly_fee?: number; start_month?: string; active?: boolean }) => {
      const { error } = await supabase.from('enrollments').update(changes).eq('id', id)
      if (error) throw error
    },
  )
}

export function useDeleteEnrollment() {
  return useAdminMutation(async (id: string) => {
    const { error } = await supabase.from('enrollments').delete().eq('id', id)
    if (error) throw error
  })
}

export function useAddGuardian() {
  return useAdminMutation(async (input: NewGuardianLink) => {
    const { data, error } = await supabase.from('guardian_links').insert(input).select().single()
    if (error) throw error
    return data
  })
}

export function useDeleteGuardian() {
  return useAdminMutation(async (id: string) => {
    const { error } = await supabase.from('guardian_links').delete().eq('id', id)
    if (error) throw error
  })
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** Turns database errors into sentences a person can act on. */
export function friendlyError(err: Error | null | undefined): string {
  if (!err) return ''
  const m = err.message
  if (/students_email_lower_key/i.test(m)) return 'A student with this email already exists.'
  if (/batches_name_lower_key/i.test(m)) return 'A batch with this name already exists.'
  if (/enrollments_student_id_batch_id_key/i.test(m)) return 'This student is already in that batch.'
  if (/guardian_links_student_email_key/i.test(m)) return 'This guardian email is already linked to this student.'
  if (/enrollments_batch_id_fkey/i.test(m)) return 'This batch still has students. Remove them or archive the batch instead.'
  if (/monthly_fee_check/i.test(m)) return 'The fee cannot be negative.'
  if (/guardian_email_check|students_email_check/i.test(m)) return 'That email address does not look right.'
  if (/row-level security/i.test(m)) return 'Only the admin can do this.'
  return m
}
