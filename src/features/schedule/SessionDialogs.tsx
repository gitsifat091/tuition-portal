import { useState, type FormEvent } from 'react'
import { Alert, Button, ConfirmDialog, Field, Modal, Select } from '../../components/ui'
import { dateKeyOf, formatWhen, timeInputOf, toTimestamp, todayKey } from '../../lib/time'
import type { Batch } from '../../lib/types'
import {
  restoredStatus,
  scheduleError,
  useAddExtraClass,
  useDeleteSession,
  useUpdateSession,
  type SessionWithBatch,
} from './api'

const small = 'px-2.5 py-1.5'

/** Admin buttons on one class: Move, Cancel, Restore, Delete. */
export function SessionActions({ session: s }: { session: SessionWithBatch }) {
  const [open, setOpen] = useState<'move' | 'cancel' | 'delete' | null>(null)
  const update = useUpdateSession()
  const remove = useDeleteSession()
  const close = () => setOpen(null)
  const cancelled = s.status === 'cancelled'

  return (
    <>
      {cancelled ? (
        <Button
          variant="ghost"
          className={small}
          loading={update.isPending}
          onClick={() => update.mutate({ id: s.id, status: restoredStatus(s) })}
        >
          Restore
        </Button>
      ) : (
        <>
          <Button variant="ghost" className={small} onClick={() => setOpen('move')}>
            Move
          </Button>
          <Button variant="danger" className={small} onClick={() => setOpen('cancel')}>
            Cancel
          </Button>
        </>
      )}
      <Button variant="ghost" className={`${small} text-slate-500`} onClick={() => setOpen('delete')}>
        Delete
      </Button>
      {update.error && !open && <span className="text-xs text-red-700">{scheduleError(update.error)}</span>}

      {open === 'move' && <MoveDialog session={s} onClose={close} />}
      {open === 'cancel' && <CancelDialog session={s} onClose={close} />}
      <ConfirmDialog
        open={open === 'delete'}
        title="Delete this class?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={close}
        onConfirm={() => remove.mutate(s.id, { onSettled: close })}
      >
        {formatWhen(s.starts_at)}
        {s.batches ? `, ${s.batches.name}` : ''}. Students will no longer see it at all.
        {s.slot_id && ' Use Cancel instead if they should know it is off. A deleted routine class comes back if you generate again.'}
      </ConfirmDialog>
    </>
  )
}

function CancelDialog({ session: s, onClose }: { session: SessionWithBatch; onClose: () => void }) {
  const update = useUpdateSession()
  const [note, setNote] = useState(s.note ?? '')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({ id: s.id, status: 'cancelled', note }, { onSuccess: onClose })
  }

  return (
    <Modal open title="Cancel this class?" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          {formatWhen(s.starts_at)}
          {s.batches ? `, ${s.batches.name}` : ''}. Students and guardians will see it as cancelled.
        </p>
        <Field
          label="Reason (optional, students see this)"
          name="cancel-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: Eid holiday"
          maxLength={300}
        />
        {update.error && <Alert tone="error">{scheduleError(update.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Keep class
          </Button>
          <Button type="submit" variant="destructive" loading={update.isPending}>
            Cancel class
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function MoveDialog({ session: s, onClose }: { session: SessionWithBatch; onClose: () => void }) {
  const update = useUpdateSession()
  const [form, setForm] = useState({
    date: dateKeyOf(s.starts_at),
    start: timeInputOf(s.starts_at),
    end: timeInputOf(s.ends_at),
    note: s.note ?? '',
  })
  const [localError, setLocalError] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (form.end <= form.start) {
      setLocalError('The end time must be after the start time.')
      return
    }
    setLocalError('')
    update.mutate(
      {
        id: s.id,
        starts_at: toTimestamp(form.date, form.start),
        ends_at: toTimestamp(form.date, form.end),
        note: form.note,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open title="Move or edit class" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          {s.batches?.name}. Now {formatWhen(s.starts_at)}.
          {s.original_starts_at && ` First planned for ${formatWhen(s.original_starts_at)}.`}
        </p>
        <Field label="Date" name="move-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" name="move-start" type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} required />
          <Field label="End" name="move-end" type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} required />
        </div>
        <Field
          label="Note (optional, students see this)"
          name="move-note"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="For example: moved because of the exam"
          maxLength={300}
        />
        <p className="text-xs text-slate-500">
          A routine class moved to a new time shows as Rescheduled. Moving it back to its first time makes it normal again.
        </p>
        {(localError || update.error) && <Alert tone="error">{localError || scheduleError(update.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Close
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Admin: add a one-off class outside the routine. */
export function ExtraClassDialog({
  open,
  onClose,
  batches,
  defaultBatchId,
}: {
  open: boolean
  onClose: () => void
  batches: Pick<Batch, 'id' | 'name' | 'active'>[]
  defaultBatchId?: string
}) {
  const add = useAddExtraClass()
  const activeBatches = batches.filter((b) => b.active)
  const [form, setForm] = useState({
    batchId: defaultBatchId && activeBatches.some((b) => b.id === defaultBatchId) ? defaultBatchId : '',
    date: todayKey(),
    start: '16:00',
    end: '17:00',
    note: '',
  })
  const [localError, setLocalError] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (form.end <= form.start) {
      setLocalError('The end time must be after the start time.')
      return
    }
    setLocalError('')
    add.mutate(
      {
        batch_id: form.batchId,
        starts_at: toTimestamp(form.date, form.start),
        ends_at: toTimestamp(form.date, form.end),
        note: form.note,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={open} title="Add an extra class" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Select label="Batch" name="extra-batch" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))} required>
          <option value="">Choose a batch</option>
          {activeBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Field label="Date" name="extra-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" name="extra-start" type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} required />
          <Field label="End" name="extra-end" type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} required />
        </div>
        <Field
          label="Note (optional, students see this)"
          name="extra-note"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="For example: exam preparation"
          maxLength={300}
        />
        {(localError || add.error) && <Alert tone="error">{localError || scheduleError(add.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={add.isPending}>
            Close
          </Button>
          <Button type="submit" loading={add.isPending}>
            Add class
          </Button>
        </div>
      </form>
    </Modal>
  )
}
