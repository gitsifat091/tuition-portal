import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Button, Card, Field, Spinner } from '../../components/ui'
import type { Student } from '../../lib/types'
import { friendlyError, useAddStudent, useStudentsList, type StudentListItem } from './api'

const emptyForm = { full_name: '', email: '', class_level: '', phone: '' }

/** Admin: add students and see each one's batches, guardians and sign-up status. */
export function AdminStudentsPage() {
  const [form, setForm] = useState(emptyForm)
  const [added, setAdded] = useState<Student | null>(null)
  const [filter, setFilter] = useState('')

  const students = useStudentsList()
  const addStudent = useAddStudent()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setAdded(null)
    addStudent.mutate(
      {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase() || null,
        class_level: form.class_level.trim() || null,
        phone: form.phone.trim() || null,
      },
      {
        onSuccess: (student) => {
          setForm(emptyForm)
          setAdded(student)
        },
      },
    )
  }

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const q = filter.trim().toLowerCase()
  const visible = (students.data ?? []).filter(
    (s) => !q || s.full_name.toLowerCase().includes(q) || (s.email ?? '').includes(q),
  )

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
          {added && (
            <Alert tone="success">
              {added.profile_id
                ? `${added.full_name} already had an account and is now linked. `
                : `${added.full_name} added. They will be linked when they sign up with ${added.email ?? 'their email'}. `}
              <Link to={`/admin/students/${added.id}`} className="font-medium underline">
                Add batches and guardians
              </Link>
            </Alert>
          )}
          <Button type="submit" loading={addStudent.isPending}>
            Add student
          </Button>
        </form>
      </Card>

      {students.isPending && <Spinner />}
      {students.error && <Alert tone="error">{students.error.message}</Alert>}

      {students.data && students.data.length === 0 && (
        <p className="text-slate-500">No students yet. Add your first one above.</p>
      )}

      {students.data && students.data.length > 5 && (
        <Field
          label="Find a student"
          name="filter"
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Name or email"
        />
      )}

      <ul className="space-y-3">
        {visible.map((s) => (
          <li key={s.id}>
            <StudentRow student={s} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function StudentRow({ student: s }: { student: StudentListItem }) {
  const batchNames = s.enrollments
    .filter((e) => e.active && e.batches)
    .map((e) => e.batches!.name)
    .sort()
  const guardians = s.guardian_links.length
  const guardiansLinked = s.guardian_links.filter((g) => g.guardian_profile_id).length

  return (
    <Link
      to={`/admin/students/${s.id}`}
      className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:ring-brand-600">
        <div className="min-w-0 space-y-0.5">
          <p className="font-bangla font-semibold">{s.full_name}</p>
          <p className="truncate text-sm text-slate-600">
            {[s.email, s.class_level && `Class ${s.class_level}`, s.phone].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-slate-500">
            {batchNames.length ? batchNames.join(', ') : 'No batch yet'}
            {' · '}
            {guardians === 0
              ? 'No guardian'
              : `${guardians} guardian${guardians > 1 ? 's' : ''} (${guardiansLinked} signed up)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!s.active && <Badge>Inactive</Badge>}
          {s.profile_id ? <Badge tone="paid">Signed up</Badge> : <Badge tone="due">Not signed up</Badge>}
          <span aria-hidden className="text-slate-400">
            &rsaquo;
          </span>
        </div>
      </Card>
    </Link>
  )
}
