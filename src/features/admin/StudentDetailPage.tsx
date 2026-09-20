import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Select, Spinner } from '../../components/ui'
import { currentMonthInput, fromMonthInput } from '../../lib/format'
import type { GuardianLink } from '../../lib/types'
import {
  friendlyError,
  useAddEnrollment,
  useAddGuardian,
  useBatchesList,
  useDeleteGuardian,
  useDeleteStudent,
  useStudent,
  useUpdateStudent,
  type StudentDetail,
} from './api'
import { EnrollmentRow } from './EnrollmentRow'

/** Admin: one student's details, batches (with fees) and guardians. */
export function StudentDetailPage() {
  const { id } = useParams()
  const student = useStudent(id)

  if (student.isPending) return <Spinner />
  if (student.error) return <Alert tone="error">{student.error.message}</Alert>
  if (!student.data) {
    return (
      <Card className="space-y-2">
        <p>This student does not exist any more.</p>
        <BackLink />
      </Card>
    )
  }

  const s = student.data
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-bangla text-2xl font-semibold">{s.full_name}</h1>
          {!s.active && <Badge>Inactive</Badge>}
          {s.profile_id ? <Badge tone="paid">Signed up</Badge> : <Badge tone="due">Not signed up</Badge>}
        </div>
      </div>

      <DetailsCard key={s.id} student={s} />
      <BatchesCard student={s} />
      <GuardiansCard student={s} />
      <DangerCard student={s} />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/admin" className="text-sm font-medium text-brand-700 hover:underline">
      &lsaquo; All students
    </Link>
  )
}

/* ------------------------------------------------------------------ */

function DetailsCard({ student: s }: { student: StudentDetail }) {
  const [form, setForm] = useState({
    full_name: s.full_name,
    email: s.email ?? '',
    class_level: s.class_level ?? '',
    phone: s.phone ?? '',
    active: s.active,
  })
  const [saved, setSaved] = useState(false)
  const update = useUpdateStudent()

  const emailChanged = (form.email.trim().toLowerCase() || null) !== s.email

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    update.mutate(
      {
        id: s.id,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase() || null,
        class_level: form.class_level.trim() || null,
        phone: form.phone.trim() || null,
        active: form.active,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  const set = (key: 'full_name' | 'email' | 'class_level' | 'phone') => (e: ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="full_name" value={form.full_name} onChange={set('full_name')} required />
          <Field label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <Field label="Class" name="class_level" value={form.class_level} onChange={set('class_level')} />
          <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => {
              setSaved(false)
              setForm((f) => ({ ...f, active: e.target.checked }))
            }}
            className="h-4 w-4 accent-brand-700"
          />
          Active student
        </label>
        {emailChanged && s.profile_id && (
          <Alert tone="info">
            Changing the email unlinks the current account. The account with the new email is linked instead once it
            signs up.
          </Alert>
        )}
        {update.error && <Alert tone="error">{friendlyError(update.error)}</Alert>}
        {saved && <Alert tone="success">Saved.</Alert>}
        <Button type="submit" loading={update.isPending}>
          Save details
        </Button>
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function BatchesCard({ student: s }: { student: StudentDetail }) {
  const batches = useBatchesList()
  const add = useAddEnrollment()
  const [batchId, setBatchId] = useState('')
  const [fee, setFee] = useState('')
  const [month, setMonth] = useState(currentMonthInput())

  const enrolledIds = new Set(s.enrollments.map((e) => e.batch_id))
  const available = (batches.data ?? []).filter((b) => b.active && !enrolledIds.has(b.id))
  const enrollments = [...s.enrollments].sort((a, b) => (a.batches?.name ?? '').localeCompare(b.batches?.name ?? ''))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate(
      { student_id: s.id, batch_id: batchId, monthly_fee: Number(fee || 0), start_month: fromMonthInput(month) },
      {
        onSuccess: () => {
          setBatchId('')
          setFee('')
        },
      },
    )
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Batches</h2>

      {enrollments.length === 0 ? (
        <p className="text-sm text-slate-500">Not in any batch yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {enrollments.map((e) => (
            <EnrollmentRow
              key={e.id}
              enrollment={e}
              title={
                <Link to={`/admin/batches/${e.batch_id}`} className="hover:underline">
                  {e.batches?.name ?? 'Unknown batch'}
                </Link>
              }
              removeText={`${s.full_name} will be removed from ${e.batches?.name ?? 'this batch'}.`}
            />
          ))}
        </div>
      )}

      {batches.data && batches.data.length === 0 ? (
        <Alert tone="info">
          Create a batch first on the{' '}
          <Link to="/admin/batches" className="font-medium underline">
            Batches
          </Link>{' '}
          tab.
        </Alert>
      ) : available.length === 0 ? (
        batches.data && <p className="text-sm text-slate-500">Already in every active batch.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end">
          <Select label="Add to batch" name="batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} required>
            <option value="">Choose a batch</option>
            {available.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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

const emptyGuardian = { guardian_name: '', guardian_email: '', relation: '', phone: '' }

function GuardiansCard({ student: s }: { student: StudentDetail }) {
  const [form, setForm] = useState(emptyGuardian)
  const [message, setMessage] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<GuardianLink | null>(null)
  const add = useAddGuardian()
  const remove = useDeleteGuardian()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    add.mutate(
      {
        student_id: s.id,
        guardian_name: form.guardian_name.trim() || null,
        guardian_email: form.guardian_email.trim().toLowerCase(),
        relation: form.relation.trim() || null,
        phone: form.phone.trim() || null,
      },
      {
        onSuccess: (g) => {
          setForm(emptyGuardian)
          setMessage(
            g.guardian_profile_id
              ? `${g.guardian_email} already had an account and can now see ${s.full_name}.`
              : `Added. They will see ${s.full_name} after signing up with ${g.guardian_email}.`,
          )
        },
      },
    )
  }

  const set = (key: keyof typeof emptyGuardian) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const guardians = [...s.guardian_links].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Guardians</h2>

      {guardians.length === 0 ? (
        <p className="text-sm text-slate-500">No guardian yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {guardians.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="font-bangla font-medium">
                  {g.guardian_name || g.guardian_email}
                  {g.relation && <span className="font-sans font-normal text-slate-500"> · {g.relation}</span>}
                </p>
                <p className="truncate text-sm text-slate-600">{[g.guardian_email, g.phone].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex items-center gap-2">
                {g.guardian_profile_id ? <Badge tone="paid">Signed up</Badge> : <Badge tone="due">Not signed up</Badge>}
                <Button variant="danger" onClick={() => setToRemove(g)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-medium">Add a guardian</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Email"
            name="guardian_email"
            type="email"
            value={form.guardian_email}
            onChange={set('guardian_email')}
            hint="The email the guardian will sign in with."
            required
          />
          <Field label="Name" name="guardian_name" value={form.guardian_name} onChange={set('guardian_name')} />
          <Field
            label="Relation"
            name="relation"
            value={form.relation}
            onChange={set('relation')}
            placeholder="Mother, Father, ..."
            list="relation-options"
          />
          <Field label="Phone" name="guardian_phone" type="tel" value={form.phone} onChange={set('phone')} />
        </div>
        <datalist id="relation-options">
          <option value="Mother" />
          <option value="Father" />
          <option value="Brother" />
          <option value="Sister" />
          <option value="Uncle" />
          <option value="Aunt" />
        </datalist>
        {add.error && <Alert tone="error">{friendlyError(add.error)}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        <Button type="submit" loading={add.isPending}>
          Add guardian
        </Button>
      </form>

      {remove.error && <Alert tone="error">{friendlyError(remove.error)}</Alert>}

      <ConfirmDialog
        open={toRemove !== null}
        title="Remove guardian?"
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onCancel={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.id, { onSettled: () => setToRemove(null) })}
      >
        {toRemove?.guardian_email} will no longer see {s.full_name}. If this was their only child here, their account
        goes back to the waiting screen.
      </ConfirmDialog>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function DangerCard({ student: s }: { student: StudentDetail }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const remove = useDeleteStudent()

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-semibold">Remove student</h2>
        <p className="text-sm text-slate-600">
          Deletes the student, their batch places and guardian links. Mark them inactive instead to keep the record.
        </p>
      </div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Remove student
      </Button>
      {remove.error && <Alert tone="error">{friendlyError(remove.error)}</Alert>}
      <ConfirmDialog
        open={open}
        title={`Remove ${s.full_name}?`}
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          remove.mutate(s.id, {
            onSuccess: () => navigate('/admin', { replace: true }),
            onSettled: () => setOpen(false),
          })
        }
      >
        Their account, and any guardian with no other child here, will go back to the waiting screen. This cannot be
        undone.
      </ConfirmDialog>
    </Card>
  )
}
