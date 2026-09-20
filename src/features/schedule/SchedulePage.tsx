import { useSearchParams } from 'react-router'
import { Alert, Card, Spinner } from '../../components/ui'
import { addDays, formatClock, relativeDay, startOfWeek, todayKey, WEEKDAY_ORDER, WEEKDAY_SHORT } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { ChildSwitcher } from '../dashboard/ChildSwitcher'
import { useMyStudents, visibleBatchIds } from '../dashboard/useMyStudents'
import { useRoutine, useSessions, useUpcomingSessions } from './api'
import { SessionItem, StatusLegend, WeekGrid, WeekNav } from './SessionItem'
import { groupByDay } from './status'

type View = 'upcoming' | 'week'

/** Student and guardian schedule: upcoming list, week view, weekly routine. */
export function SchedulePage() {
  const { students, active, setActive, isPending, error } = useMyStudents()
  const [params, setParams] = useSearchParams()

  const view: View = params.get('view') === 'week' ? 'week' : 'upcoming'
  const weekParam = params.get('week')
  const weekStart = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? startOfWeek(weekParam) : startOfWeek(todayKey())

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const batchIds = visibleBatchIds(active)
  const showBatch = batchIds.length > 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-slate-600">All times are Bangladesh time.</p>
      </div>

      {isPending && <Spinner />}
      {error && <Alert tone="error">{error.message}</Alert>}
      {!isPending && !error && students.length === 0 && (
        <Alert tone="info">No student is linked to this account yet. Please contact your teacher.</Alert>
      )}

      {students.length > 1 && <ChildSwitcher students={students} activeId={active?.id} onSelect={setActive} />}

      {active && batchIds.length === 0 && (
        <Alert tone="info">
          <span className="font-bangla">{active.full_name}</span> is not in a batch yet, so there is no schedule.
        </Alert>
      )}

      {active && batchIds.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Schedule view" className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['upcoming', 'week'] as View[]).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setParam('view', v === 'upcoming' ? null : v)}
                  className={[
                    'rounded-lg px-4 py-2 text-sm font-medium transition',
                    view === v ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  ].join(' ')}
                >
                  {v === 'upcoming' ? 'Upcoming' : 'Week'}
                </button>
              ))}
            </div>
            <StatusLegend />
          </div>

          {view === 'upcoming' ? (
            <UpcomingList batchIds={batchIds} showBatch={showBatch} />
          ) : (
            <WeekView
              batchIds={batchIds}
              showBatch={showBatch}
              weekStart={weekStart}
              onWeekChange={(w) => setParam('week', w === startOfWeek(todayKey()) ? null : w)}
            />
          )}

          <RoutineCard batchIds={batchIds} />
        </>
      )}
    </div>
  )
}

function UpcomingList({ batchIds, showBatch }: { batchIds: string[]; showBatch: boolean }) {
  const today = todayKey()
  const sessions = useUpcomingSessions(batchIds, today, 14)
  const now = useNow()

  if (sessions.isPending) return <Spinner />
  if (sessions.error) return <Alert tone="error">{sessions.error.message}</Alert>

  const upcoming = sessions.data.filter((s) => new Date(s.ends_at).getTime() > now)
  if (upcoming.length === 0) {
    return <Card className="text-slate-600">No classes in the next 2 weeks. Use the Week view to look further ahead.</Card>
  }

  const byDay = groupByDay(upcoming)
  return (
    <div className="space-y-5">
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="space-y-2">
          <h2 className={['text-sm font-semibold', day === today ? 'text-brand-800' : 'text-slate-600'].join(' ')}>
            {relativeDay(day)}
          </h2>
          {list.map((s) => (
            <SessionItem key={s.id} session={s} showBatch={showBatch} />
          ))}
        </section>
      ))}
    </div>
  )
}

function WeekView({
  batchIds,
  showBatch,
  weekStart,
  onWeekChange,
}: {
  batchIds: string[]
  showBatch: boolean
  weekStart: string
  onWeekChange: (weekStart: string) => void
}) {
  const sessions = useSessions({ fromKey: weekStart, toKey: addDays(weekStart, 7), batchIds })

  return (
    <div className="space-y-4">
      <WeekNav weekStart={weekStart} onChange={onWeekChange} />
      {sessions.isPending ? (
        <Spinner />
      ) : sessions.error ? (
        <Alert tone="error">{sessions.error.message}</Alert>
      ) : (
        <WeekGrid weekStart={weekStart} sessions={sessions.data} showBatch={showBatch} />
      )}
    </div>
  )
}

function RoutineCard({ batchIds }: { batchIds: string[] }) {
  const routine = useRoutine(batchIds)
  if (routine.isPending || routine.error || routine.data.length === 0) return null

  const order = (d: number) => WEEKDAY_ORDER.indexOf(d)
  const slots = [...routine.data].sort(
    (a, b) => order(a.weekday) - order(b.weekday) || a.start_time.localeCompare(b.start_time),
  )

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Weekly routine</h2>
      <ul className="divide-y divide-slate-100">
        {slots.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 first:pt-0 last:pb-0">
            <span className="font-medium">
              <span className="inline-block w-10 text-slate-500">{WEEKDAY_SHORT[s.weekday]}</span>
              {formatClock(s.start_time)} to {formatClock(s.end_time)}
            </span>
            <span className="text-sm text-slate-600">{s.batches?.name}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">The usual week. Changes to single classes show in the schedule above.</p>
    </Card>
  )
}
