import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Spinner } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

/** Student and guardian home. Schedule, dues and the rest are added from F3 onwards. */
export function DashboardPage() {
  const { profile } = useAuth()

  // RLS returns only the rows this account may see: a student's own record.
  const students = useQuery({
    queryKey: ['my-students', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('full_name')
      if (error) throw error
      return data
    },
  })

  const firstName = (profile?.full_name ?? '').split(' ')[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-slate-600">Your class schedule, dues and notes will appear here soon.</p>
      </div>

      {students.isPending && <Spinner />}
      {students.error && <Alert tone="error">{students.error.message}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {students.data?.map((s) => (
          <Card key={s.id} className="space-y-1">
            <p className="text-sm text-slate-500">Student</p>
            <p className="font-bangla text-lg font-semibold">{s.full_name}</p>
            {s.class_level && <p className="text-slate-600">Class {s.class_level}</p>}
            <p className="text-sm text-slate-500">Joined {formatDate(s.joined_on)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
