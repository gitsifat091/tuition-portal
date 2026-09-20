import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, ConfirmDialog, Field, Select, Spinner } from '../../components/ui'
import { formatClock, WEEKDAY_NAMES, WEEKDAY_ORDER } from '../../lib/time'
import type { Batch, WeeklySlot } from '../../lib/types'
import { scheduleError, useAddSlot, useBatchSlots, useDeleteSlot, useGenerateSessions } from './api'

/** Admin, on the batch page: the batch's weekly routine and a generate button. */
export function WeeklyRoutineCard({ batch }: { batch: Pick<Batch, 'id' | 'name' | 'active'> }) {
  const slots = useBatchSlots(batch.id)
  const add = useAddSlot()
  const generate = useGenerateSessions()
  const [form, setForm] = useState({ weekday: '6', start: '16:00', end: '17:30' })
  const [localError, setLocalError] = useState('')
  const [removing, setRemoving] = useState<WeeklySlot | null>(null)

  const order = (d: number) => WEEKDAY_ORDER.indexOf(d)
  const list = [...(slots.data ?? [])].sort(
    (a, b) => order(a.weekday) - order(b.weekday) || a.start_time.localeCompare(b.start_time),
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (form.end <= form.start) {
      setLocalError('The end time must be after the start time.')
      return
    }
    setLocalError('')
    generate.reset()
    add.mutate({ batch_id: batch.id, weekday: Number(form.weekday), start_time: form.start, end_time: form.end })
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Weekly routine</h2>
        <Link to={`/admin/schedule?batch=${batch.id}`} className="text-sm font-medium text-brand-700 hover:underline">
          See this batch's classes &rsaquo;
        </Link>
      </div>

      {slots.isPending ? (
        <Spinner />
      ) : slots.error ? (
        <Alert tone="error">{slots.error.message}</Alert>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">No routine yet. Add the days and times this batch normally meets.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="inline-block w-28 font-medium">{WEEKDAY_NAMES[s.weekday]}</span>
                <span className="text-slate-700">
                  {formatClock(s.start_time)} to {formatClock(s.end_time)}
                </span>
              </span>
              <Button variant="danger" className="px-2.5 py-1.5" onClick={() => setRemoving(s)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
        <Select label="Day" name="slot-day" value={form.weekday} onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}>
          {WEEKDAY_ORDER.map((d) => (
            <option key={d} value={d}>
              {WEEKDAY_NAMES[d]}
            </option>
          ))}
        </Select>
        <Field label="Start" name="slot-start" type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} required />
        <Field label="End" name="slot-end" type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} required />
        <Button type="submit" loading={add.isPending}>
          Add
        </Button>
      </form>
      {(localError || add.error) && <Alert tone="error">{localError || scheduleError(add.error)}</Alert>}

      {list.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-4">
          {batch.active ? (
            <>
              <Button variant="secondary" loading={generate.isPending} onClick={() => generate.mutate({ weeks: 4, batchId: batch.id })}>
                Generate the next 4 weeks for this batch
              </Button>
              <p className="text-xs text-slate-500">
                After changing the routine, generate again. Existing classes are never duplicated.
              </p>
            </>
          ) : (
            <Alert tone="info">This batch is archived, so no new classes are generated.</Alert>
          )}
          {generate.isSuccess && (
            <Alert tone={generate.data > 0 ? 'success' : 'info'}>
              {generate.data > 0
                ? `Added ${generate.data} class${generate.data === 1 ? '' : 'es'}.`
                : 'Nothing new to add. Every class for the next 4 weeks already exists.'}
            </Alert>
          )}
          {generate.error && <Alert tone="error">{scheduleError(generate.error)}</Alert>}
        </div>
      )}

      <RemoveSlotDialog slot={removing} batchName={batch.name} onClose={() => setRemoving(null)} />
    </Card>
  )
}

function RemoveSlotDialog({ slot, batchName, onClose }: { slot: WeeklySlot | null; batchName: string; onClose: () => void }) {
  const remove = useDeleteSlot()
  return (
    <ConfirmDialog
      open={slot !== null}
      title="Remove this routine slot?"
      confirmLabel="Remove"
      danger
      loading={remove.isPending}
      onCancel={onClose}
      onConfirm={() => slot && remove.mutate(slot.id, { onSettled: onClose })}
    >
      {slot && (
        <>
          {WEEKDAY_NAMES[slot.weekday]} {formatClock(slot.start_time)} to {formatClock(slot.end_time)} will no longer be part of{' '}
          {batchName}. Its future classes that you have not changed are removed too. Past classes, and ones you cancelled or
          moved, stay.
        </>
      )}
    </ConfirmDialog>
  )
}
