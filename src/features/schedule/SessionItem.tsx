import type { ReactNode } from 'react'
import { Badge, Button } from '../../components/ui'
import { addDays, dateKeyOf, formatDayKey, formatTimeOf, formatWeekRange, formatWhen, relativeDay, startOfWeek, todayKey } from '../../lib/time'
import type { SessionStatus } from '../../lib/types'
import { useNow } from '../../lib/useNow'
import type { SessionWithBatch } from './api'
import { groupByDay, STATUS_META } from './status'

/**
 * One class: time, batch, status and note, with a coloured bar on the left.
 * `actions` (admin only) goes on the right.
 */
export function SessionItem({
  session: s,
  showBatch = true,
  showDate = false,
  actions,
}: {
  session: SessionWithBatch
  showBatch?: boolean
  showDate?: boolean
  actions?: ReactNode
}) {
  const meta = STATUS_META[s.status]
  const cancelled = s.status === 'cancelled'
  const now = useNow()
  const past = new Date(s.ends_at).getTime() < now
  const live = !cancelled && !past && new Date(s.starts_at).getTime() <= now

  return (
    <div className={['relative flex gap-3 overflow-hidden rounded-xl bg-white py-3 pr-3 pl-4 ring-1 ring-slate-200', past ? 'opacity-60' : ''].join(' ')}>
      <span aria-hidden className={['absolute inset-y-0 left-0 w-1.5', meta.bar].join(' ')} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={['font-semibold tabular-nums', cancelled ? 'text-slate-500 line-through' : ''].join(' ')}>
            {showDate && <span>{relativeDay(dateKeyOf(s.starts_at))}, </span>}
            {formatTimeOf(s.starts_at)} to {formatTimeOf(s.ends_at)}
          </p>
          {s.status !== 'scheduled' && <Badge tone={meta.tone}>{meta.label}</Badge>}
          {live && <Badge tone="paid">Now</Badge>}
        </div>
        {showBatch && s.batches && (
          <p className="text-sm text-slate-700">
            {s.batches.name}
            {s.batches.subject && <span className="text-slate-500"> · {s.batches.subject}</span>}
          </p>
        )}
        {s.status === 'rescheduled' && s.original_starts_at && (
          <p className="text-sm text-amber-800">Moved from {formatWhen(s.original_starts_at)}</p>
        )}
        {s.note && <p className="font-bangla text-sm whitespace-pre-line text-slate-600">{s.note}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">{actions}</div>}
    </div>
  )
}

/** Colour key for the four statuses. */
export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Colour key">
      {(Object.keys(STATUS_META) as SessionStatus[]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span aria-hidden className={['h-2.5 w-2.5 rounded-full', STATUS_META[k].bar].join(' ')} />
          {STATUS_META[k].label}
        </li>
      ))}
    </ul>
  )
}

/** Previous / This week / Next buttons with the date range. */
export function WeekNav({ weekStart, onChange }: { weekStart: string; onChange: (weekStart: string) => void }) {
  const thisWeek = startOfWeek(todayKey())
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-medium">{formatWeekRange(weekStart)}</p>
      <div className="flex gap-1">
        <Button variant="secondary" onClick={() => onChange(addDays(weekStart, -7))} aria-label="Previous week">
          &lsaquo;
        </Button>
        <Button variant="secondary" onClick={() => onChange(thisWeek)} disabled={weekStart === thisWeek}>
          This week
        </Button>
        <Button variant="secondary" onClick={() => onChange(addDays(weekStart, 7))} aria-label="Next week">
          &rsaquo;
        </Button>
      </div>
    </div>
  )
}

/**
 * A week, one block per day from Saturday. Phones get a list of days;
 * wider screens get two columns (students and guardians only; the admin
 * view keeps one column so the action buttons have room).
 */
export function WeekGrid({
  weekStart,
  sessions,
  showBatch = true,
  renderActions,
}: {
  weekStart: string
  sessions: SessionWithBatch[]
  showBatch?: boolean
  renderActions?: (s: SessionWithBatch) => ReactNode
}) {
  const byDay = groupByDay(sessions)
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className={['grid gap-3', renderActions ? '' : 'sm:grid-cols-2'].join(' ')}>
      {days.map((day) => {
        const list = byDay.get(day) ?? []
        const isToday = day === today
        return (
          <section key={day} aria-label={formatDayKey(day, true)} className="space-y-2">
            <h3
              className={[
                'flex items-center gap-2 text-sm font-semibold',
                isToday ? 'text-brand-800' : 'text-slate-600',
              ].join(' ')}
            >
              {formatDayKey(day)}
              {isToday && <Badge tone="brand">Today</Badge>}
            </h3>
            {list.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">No class</p>
            ) : (
              list.map((s) => (
                <SessionItem key={s.id} session={s} showBatch={showBatch} actions={renderActions?.(s)} />
              ))
            )}
          </section>
        )
      })}
    </div>
  )
}
