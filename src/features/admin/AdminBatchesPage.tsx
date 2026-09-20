import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Button, Card, Field, Spinner } from '../../components/ui'
import { formatTaka } from '../../lib/format'
import { friendlyError, useAddBatch, useBatchesList, type BatchListItem } from './api'

const emptyForm = { name: '', class_level: '', subject: '' }

/** Admin: create batches and see how many students each one has. */
export function AdminBatchesPage() {
  const [form, setForm] = useState(emptyForm)
  const [showArchived, setShowArchived] = useState(false)
  const batches = useBatchesList()
  const addBatch = useAddBatch()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    addBatch.mutate(
      {
        name: form.name.trim(),
        class_level: form.class_level.trim() || null,
        subject: form.subject.trim() || null,
      },
      { onSuccess: () => setForm(emptyForm) },
    )
  }

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const active = (batches.data ?? []).filter((b) => b.active)
  const archived = (batches.data ?? []).filter((b) => !b.active)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Batches</h1>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="font-semibold">Create a batch</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" name="name" value={form.name} onChange={set('name')} placeholder="e.g. Class 9 Math" required />
            <Field label="Class" name="class_level" value={form.class_level} onChange={set('class_level')} placeholder="e.g. 9" />
            <Field label="Subject" name="subject" value={form.subject} onChange={set('subject')} placeholder="e.g. Math" />
          </div>
          {addBatch.error && <Alert tone="error">{friendlyError(addBatch.error)}</Alert>}
          {addBatch.isSuccess && <Alert tone="success">Batch created. Open it to add students.</Alert>}
          <Button type="submit" loading={addBatch.isPending}>
            Create batch
          </Button>
        </form>
      </Card>

      {batches.isPending && <Spinner />}
      {batches.error && <Alert tone="error">{batches.error.message}</Alert>}
      {batches.data && batches.data.length === 0 && (
        <p className="text-slate-500">No batches yet. Create your first one above.</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {active.map((b) => (
          <li key={b.id}>
            <BatchCard batch={b} />
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <div className="space-y-3">
          <Button variant="ghost" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived}>
            {showArchived ? 'Hide' : 'Show'} archived batches ({archived.length})
          </Button>
          {showArchived && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {archived.map((b) => (
                <li key={b.id}>
                  <BatchCard batch={b} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function BatchCard({ batch: b }: { batch: BatchListItem }) {
  const current = b.enrollments.filter((e) => e.active)
  const monthly = current.reduce((sum, e) => sum + e.monthly_fee, 0)

  return (
    <Link
      to={`/admin/batches/${b.id}`}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      <Card className="h-full space-y-1 transition hover:ring-brand-600">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{b.name}</p>
          {!b.active && <Badge>Archived</Badge>}
        </div>
        <p className="text-sm text-slate-600">
          {[b.class_level && `Class ${b.class_level}`, b.subject].filter(Boolean).join(' · ') || 'No class or subject set'}
        </p>
        <p className="text-sm text-slate-500">
          {current.length} student{current.length === 1 ? '' : 's'} · {formatTaka(monthly)} / month
        </p>
      </Card>
    </Link>
  )
}
