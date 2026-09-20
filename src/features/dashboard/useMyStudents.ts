import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import type { Batch, Enrollment, Student } from '../../lib/types'
import { useAuth } from '../auth/AuthProvider'

export type MyStudent = Student & { enrollments: Array<Enrollment & { batches: Batch | null }> }

const STORAGE_KEY = 'tp.activeChild'

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private mode or blocked storage: the URL still remembers the choice.
  }
}

/**
 * The students this account may see (RLS decides): a student's own record,
 * or every linked child for a guardian. Also tracks which one is selected,
 * in the URL (?child=...) with the last choice remembered on this device.
 * Later features (schedule, dues, attendance) read `active` from here.
 */
export function useMyStudents() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()

  const query = useQuery({
    queryKey: ['my-students', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, enrollments(*, batches(*))')
        .order('full_name')
      if (error) throw error
      return data as unknown as MyStudent[]
    },
  })

  const list = query.data ?? []
  const wanted = params.get('child') ?? readStored()
  const active = list.find((s) => s.id === wanted) ?? list[0] ?? null

  const setActive = (id: string) => {
    writeStored(id)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('child', id)
        return next
      },
      { replace: true },
    )
  }

  return { ...query, students: list, active, setActive }
}
