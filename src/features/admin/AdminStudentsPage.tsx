import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Field, Spinner } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import type { NewStudent, Student } from '../../lib/types'

const emptyForm = { full_name: '', email: '', class_level: '', phone: '' }

/**
 * F1 admin screen: add students by email and see whether they have signed up.
 * Batches, fees and guardians arrive in F2.
 */
export function AdminStudentsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState<string | null>(null)

  const students = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const addStudent = useMutation({
    mutationFn: async (input: NewStudent) => {
      const { data, error } = await supabase.from('students').insert(input).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (student) => {
      setForm(emptyForm)
      setMessage(
        student.profile_id
          ? `${student.full_name} already had an account and is now linked.`
          : `${student.full_name} added. They will be linked when they sign up with ${student.email ?? 'their email'}.`,
      )
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })

  const removeStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    addStudent.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase() || null,
      class_level: form.class_level.trim() || null,
      phone: form.phone.trim() || null,
    })
  }

  const onDelete = (s: Student) => {
    // Plain browser confirm keeps F1 small; a proper modal comes with the admin screens in F2.
    if (window.confirm(`Remove ${s.full_name}? Their account will go back to the waiting screen.`)) {
      removeStudent.mutate(s.id)
    }
  }

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Students</h1>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="font-semibold">Add a student</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="full_name" value={form.full_name} onChange={set('full_name')} required />
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={set('email')}
              hint="The email they will sign in with. This is what links the account."
            />
            <Field label="Class" name="class_level" value={form.class_level} onChange={set('class_level')} placeholder="e.g. 9" />
            <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} />
          </div>
          {addStudent.error && <Alert tone="error">{friendlyError(addStudent.error)}</Alert>}
          {message && <Alert tone="success">{message}</Alert>}
          <Button type="submit" loading={addStudent.isPending}>
            Add student
          </Button>
        </form>
      </Card>

      {students.isPending && <Spinner />}
      {students.error && <Alert tone="error">{students.error.message}</Alert>}
      {removeStudent.error && <Alert tone="error">{removeStudent.error.message}</Alert>}

      {students.data && students.data.length === 0 && (
        <p className="text-slate-500">No students yet. Add your first one above.</p>
      )}

      <ul className="space-y-3">
        {students.data?.map((s) => (
          <li key={s.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bangla font-semibold">{s.full_name}</p>
                <p className="truncate text-sm text-slate-600">
                  {[s.email, s.class_level && `Class ${s.class_level}`, s.phone].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-slate-400">Added {formatDate(s.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.profile_id ? <Badge tone="paid">Signed up</Badge> : <Badge tone="due">Not signed up</Badge>}
                <Button variant="danger" onClick={() => onDelete(s)} disabled={removeStudent.isPending}>
                  Remove
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}

function friendlyError(err: Error): string {
  if (/students_email_lower_key|duplicate key/i.test(err.message)) return 'A student with this email already exists.'
  if (/row-level security/i.test(err.message)) return 'Only the admin can add students.'
  return err.message
}
