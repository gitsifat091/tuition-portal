import { useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Badge, Button, ConfirmDialog, Field } from '../../components/ui'
import { formatMonth, formatTaka, fromMonthInput, toMonthInput } from '../../lib/format'
import type { Enrollment } from '../../lib/types'
import { friendlyError, useDeleteEnrollment, useUpdateEnrollment } from './api'

/**
 * One enrollment (a student in a batch) with its fee and start month.
 * Used on both the student page and the batch page; `title` is the other side
 * (the batch name on a student page, the student name on a batch page).
 */
export function EnrollmentRow({ enrollment: e, title, removeText }: { enrollment: Enrollment; title: ReactNode; removeText: string }) {
  const [editing, setEditing] = useState(false)
  const [fee, setFee] = useState(String(e.monthly_fee))
  const [month, setMonth] = useState(toMonthInput(e.start_month))
  const [confirmRemove, setConfirmRemove] = useState(false)

  const update = useUpdateEnrollment()
  const remove = useDeleteEnrollment()

  const save = (ev: FormEvent) => {
    ev.preventDefault()
    update.mutate(
      { id: e.id, monthly_fee: Number(fee), start_month: fromMonthInput(month) },
      { onSuccess: () => setEditing(false) },
    )
  }

  const startEdit = () => {
    setFee(String(e.monthly_fee))
    setMonth(toMonthInput(e.start_month))
    update.reset()
    setEditing(true)
  }

  return (
    <div className="space-y-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <p className="text-sm text-slate-600">
            {formatTaka(e.monthly_fee)} / month · from {formatMonth(e.start_month)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!e.active && <Badge>Paused</Badge>}
          {!editing && (
            <Button variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => update.mutate({ id: e.id, active: !e.active })}
            disabled={update.isPending}
          >
            {e.active ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>
            Remove
          </Button>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field
            label="Monthly fee (৳)"
            name={`fee-${e.id}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={fee}
            onChange={(ev) => setFee(ev.target.value)}
            required
          />
          <Field
            label="Start month"
            name={`month-${e.id}`}
            type="month"
            value={month}
            onChange={(ev) => setMonth(ev.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" loading={update.isPending}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {update.error && <Alert tone="error">{friendlyError(update.error)}</Alert>}
      {remove.error && <Alert tone="error">{friendlyError(remove.error)}</Alert>}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove from batch?"
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate(e.id, { onSettled: () => setConfirmRemove(false) })}
      >
        {removeText} To keep the history, use Pause instead.
      </ConfirmDialog>
    </div>
  )
}
