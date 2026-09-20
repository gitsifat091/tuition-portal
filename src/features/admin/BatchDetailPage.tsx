import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Select, Spinner } from '../../components/ui'
import { currentMonthInput, formatTaka, fromMonthInput } from '../../lib/format'
import {
  friendlyError,
  useAddEnrollment,
  useBatch,
  useDeleteBatch,
  useStudentsList,
  useUpdateBatch,
  type BatchDetail,
} from './api'
import { WeeklyRoutineCard } from '../schedule/WeeklyRoutineCard'
import { EnrollmentRow } from './EnrollmentRow'

/** Admin: one batch, its students and their fees, and its weekly routine. */
export function BatchDetailPage() {
  const { id } = useParams()
  const batch = useBatch(id)

  if (batch.isPending) return <Spinner />
  if (batch.error) return <Alert tone="error">{batch.error.message}</Alert>
  if (!batch.data) {
    return (
      <Card className="space-y-2">
        <p>This batch does not exist any more.</p>
        <BackLink />
      </Card>
    )
  }

  const b = batch.data
  const current = b.enrollments.filter((e) => e.active)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{b.name}</h1>
          {!b.active && <Badge>Archived</Badge>}
        </div>
        <p className="text-slate-600">
          {current.length} active student{current.length === 1 ? '' : 's'} ·{' '}
          {formatTaka(current.reduce((sum, e) => sum + e.monthly_fee, 0))} / month
        </p>
      </div>

      <StudentsCard batch={b} />
      <WeeklyRoutineCard batch={b} />
      <DetailsCard key={b.id} batch={b} />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/admin/batches" className="text-sm font-medium text-brand-700 hover:underline">
      &lsaquo; All batches
    </Link>
  )
}

/* ------------------------------------------------------------------ */

function StudentsCard({ batch: b }: { batch: BatchDetail }) {
  const students = useStudentsList()
  const add = useAddEnrollment()
  const [studentId, setStudentId] = useState('')
  const [fee, setFee] = useState('')
  const [month, setMonth] = useState(currentMonthInput())

  const enrolledIds = new Set(b.enrollments.map((e) => e.student_id))
  const available = (students.data ?? []).filter((s) => s.active && !enrolledIds.has(s.id))
  const enrollments = [...b.enrollments].sort((x, y) =>
    (x.students?.full_name ?? '').localeCompare(y.students?.full_name ?? ''),
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate(
      { student_id: studentId, batch_id: b.id, monthly_fee: Number(fee || 0), start_month: fromMonthInput(month) },
      {
        onSuccess: () => {
          setStudentId('')
          setFee('')
        },
      },
    )
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Students</h2>

      {enrollments.length === 0 ? (
        <p className="text-sm text-slate-500">No students in this batch yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {enrollments.map((e) => (
            <EnrollmentRow
              key={e.id}
              enrollment={e}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/students/${e.student_id}`} className="font-bangla hover:underline">
                    {e.students?.full_name ?? 'Unknown student'}
                  </Link>
                  {e.students && !e.students.profile_id && <Badge tone="due">Not signed up</Badge>}
                </span>
              }
              removeText={`${e.students?.full_name ?? 'This student'} will be removed from ${b.name}.`}
            />
          ))}
        </div>
      )}

      {!b.active ? (
        <Alert tone="info">This batch is archived. Restore it below to add students.</Alert>
      ) : students.data && available.length === 0 ? (
        <p className="text-sm text-slate-500">
          Every active student is already in this batch.{' '}
          <Link to="/admin" className="font-medium text-brand-700 hover:underline">
            Add a new student
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end">
          <Select label="Add student" name="student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Choose a student</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.class_level ? ` (Class ${s.class_level})` : ''}
              </option>
            ))}
          </Select>
          <Field
            label="Monthly fee (৳)"
            name="fee"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
          />
          <Field label="Start month" name="start_month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          <Button type="submit" loading={add.isPending}>
            Add
          </Button>
        </form>
      )}
      {add.error && <Alert tone="error">{friendlyError(add.error)}</Alert>}
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function DetailsCard({ batch: b }: { batch: BatchDetail }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: b.name, class_level: b.class_level ?? '', subject: b.subject ?? '' })
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = useUpdateBatch()
  const remove = useDeleteBatch()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    update.mutate(
      { id: b.id, name: form.name.trim(), class_level: form.class_level.trim() || null, subject: form.subject.trim() || null },
      { onSuccess: () => setSaved(true) },
    )
  }

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const hasStudents = b.enrollments.length > 0

  return (
    <Card className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="font-semibold">Batch details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" name="name" value={form.name} onChange={set('name')} required />
          <Field label="Class" name="class_level" value={form.class_level} onChange={set('class_level')} />
          <Field label="Subject" name="subject" value={form.subject} onChange={set('subject')} />
        </div>
        {update.error && <Alert tone="error">{friendlyError(update.error)}</Alert>}
        {saved && <Alert tone="success">Saved.</Alert>}
        <Button type="submit" loading={update.isPending}>
          Save details
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={() => update.mutate({ id: b.id, active: !b.active })} disabled={update.isPending}>
          {b.active ? 'Archive batch' : 'Restore batch'}
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={hasStudents}>
          Delete batch
        </Button>
        <p className="w-full text-xs text-slate-500">
          {b.active
            ? 'Archiving hides the batch from students and guardians and keeps its history.'
            : 'Archived batches are hidden from students and guardians.'}
          {hasStudents && ' A batch can only be deleted once it has no students.'}
        </p>
      </div>
      {remove.error && <Alert tone="error">{friendlyError(remove.error)}</Alert>}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${b.name}?`}
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(b.id, {
            onSuccess: () => navigate('/admin/batches', { replace: true }),
            onSettled: () => setConfirmDelete(false),
          })
        }
      >
        This cannot be undone.
      </ConfirmDialog>
    </Card>
  )
}
