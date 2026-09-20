import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { addDays, toTimestamp } from '../../lib/time'
import type { Batch, ClassSession, NewClassSession, NewWeeklySlot, SessionStatus, WeeklySlot } from '../../lib/types'

// Admin keys start with 'admin' (the admin screens refresh together, as in F2).
// Student and guardian keys start with 'schedule'. Every schedule change
// refreshes both.

export type SessionWithBatch = ClassSession & { batches: Pick<Batch, 'id' | 'name' | 'subject'> | null }
export type SlotWithBatch = WeeklySlot & { batches: Pick<Batch, 'id' | 'name' | 'subject'> | null }

const SESSION_SELECT = '*, batches(id, name, subject)'

/** [fromKey, toKey) as Bangladesh dates, turned into timestamps. */
function rangeBounds(fromKey: string, toKey: string) {
  return { from: toTimestamp(fromKey, '00:00'), to: toTimestamp(toKey, '00:00') }
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/**
 * Classes that start between two dates.
 * With batchIds (student or guardian view) only those batches are asked for;
 * RLS still decides what comes back. Without batchIds (admin) all batches.
 */
export function useSessions({ fromKey, toKey, batchIds }: { fromKey: string; toKey: string; batchIds?: string[] }) {
  const ids = batchIds ? [...batchIds].sort() : undefined
  return useQuery({
    queryKey: ids ? ['schedule', 'sessions', ids, fromKey, toKey] : ['admin', 'sessions', fromKey, toKey],
    enabled: !ids || ids.length > 0,
    queryFn: async () => {
      const { from, to } = rangeBounds(fromKey, toKey)
      let query = supabase
        .from('class_sessions')
        .select(SESSION_SELECT)
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
      if (ids) query = query.in('batch_id', ids)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as SessionWithBatch[]
    },
  })
}

/** Classes from today (Bangladesh date) for the next `days` days. Callers drop ones already over. */
export function useUpcomingSessions(batchIds: string[] | undefined, todayKey: string, days = 28) {
  return useSessions({ fromKey: todayKey, toKey: addDays(todayKey, days), batchIds })
}

/** Weekly routine of the given batches (student or guardian view). */
export function useRoutine(batchIds: string[]) {
  const ids = [...batchIds].sort()
  return useQuery({
    queryKey: ['schedule', 'slots', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_slots')
        .select('*, batches(id, name, subject)')
        .in('batch_id', ids)
        .order('weekday')
        .order('start_time')
      if (error) throw error
      return data as unknown as SlotWithBatch[]
    },
  })
}

/** Admin: the weekly routine of one batch. */
export function useBatchSlots(batchId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'slots', batchId],
    enabled: Boolean(batchId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_slots')
        .select('*')
        .eq('batch_id', batchId!)
        .order('weekday')
        .order('start_time')
      if (error) throw error
      return data
    },
  })
}

/* ------------------------------------------------------------------ */
/* Mutations (admin only; RLS blocks everyone else)                    */
/* ------------------------------------------------------------------ */

function useScheduleMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['schedule'] }),
      ])
    },
  })
}

export function useAddSlot() {
  return useScheduleMutation(async (input: NewWeeklySlot) => {
    const { error } = await supabase.from('weekly_slots').insert(input)
    if (error) throw error
  })
}

/** Also removes this slot's future classes that were never changed (database trigger). */
export function useDeleteSlot() {
  return useScheduleMutation(async (id: string) => {
    const { error } = await supabase.from('weekly_slots').delete().eq('id', id)
    if (error) throw error
  })
}

/** Creates the dated classes from the routine. Returns how many were added. */
export function useGenerateSessions() {
  return useScheduleMutation(async ({ weeks, batchId }: { weeks: number; batchId?: string }) => {
    const { data, error } = await supabase.rpc('generate_sessions', {
      p_weeks: weeks,
      ...(batchId ? { p_batch_id: batchId } : {}),
    })
    if (error) throw error
    return data ?? 0
  })
}

export function useAddExtraClass() {
  return useScheduleMutation(async (input: NewClassSession) => {
    const { error } = await supabase.from('class_sessions').insert({ ...input, status: 'extra' })
    if (error) throw error
  })
}

/**
 * Cancel, restore, move or edit the note of a class.
 * Moving a class to a new time marks it rescheduled and remembers the first
 * time (database trigger).
 */
export function useUpdateSession() {
  return useScheduleMutation(
    async ({ id, ...changes }: { id: string; starts_at?: string; ends_at?: string; status?: SessionStatus; note?: string | null }) => {
      const { error } = await supabase.from('class_sessions').update(changes).eq('id', id)
      if (error) throw error
    },
  )
}

export function useDeleteSession() {
  return useScheduleMutation(async (id: string) => {
    const { error } = await supabase.from('class_sessions').delete().eq('id', id)
    if (error) throw error
  })
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** What a cancelled class goes back to when restored. */
export function restoredStatus(s: ClassSession): SessionStatus {
  if (!s.slot_id && !s.slot_date) return 'extra'
  return s.original_starts_at ? 'rescheduled' : 'scheduled'
}

/** Turns database errors into sentences a person can act on. */
export function scheduleError(err: Error | null | undefined): string {
  if (!err) return ''
  const m = err.message
  if (/weekly_slots_batch_day_time_key/i.test(m)) return 'This batch already has a class at that day and time.'
  if (/weekly_slots_time_order|class_sessions_time_order/i.test(m)) return 'The end time must be after the start time.'
  if (/Weeks must be between/i.test(m)) return 'Choose between 1 and 12 weeks.'
  if (/Only the admin|row-level security/i.test(m)) return 'Only the admin can do this.'
  return m
}
