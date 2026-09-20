import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert, Button, Card, Select, Spinner } from '../../components/ui'
import { addDays, startOfWeek, todayKey } from '../../lib/time'
import { useBatchesList } from '../admin/api'
import { scheduleError, useGenerateSessions, useSessions } from './api'
import { ExtraClassDialog, SessionActions } from './SessionDialogs'
import { StatusLegend, WeekGrid, WeekNav } from './SessionItem'

/** Admin: every batch's classes by week, with generate, extra class, move and cancel. */
export function AdminSchedulePage() {
  const [params, setParams] = useSearchParams()
  const batches = useBatchesList()
  const generate = useGenerateSessions()
  const [weeks, setWeeks] = useState('4')
  const [extraOpen, setExtraOpen] = useState(false)

  const batchFilter = params.get('batch') ?? ''
  const weekParam = params.get('week')
  const thisWeek = startOfWeek(todayKey())
  const weekStart = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? startOfWeek(weekParam) : thisWeek

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const sessions = useSessions({ fromKey: weekStart, toKey: addDays(weekStart, 7) })
  const shown = (sessions.data ?? []).filter((s) => !batchFilter || s.batch_id === batchFilter)
  const batchList = batches.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="text-slate-600">Bangladesh time. Set each batch's weekly routine on its batch page.</p>
        </div>
        <Button variant="secondary" onClick={() => setExtraOpen(true)} disabled={batchList.length === 0}>
          Add extra class
        </Button>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Create classes from the routine for" name="weeks" value={weeks} onChange={(e) => setWeeks(e.target.value)} className="w-full sm:w-72">
            {[1, 2, 4, 6, 8].map((n) => (
              <option key={n} value={n}>
                the next {n} week{n === 1 ? '' : 's'}
              </option>
            ))}
          </Select>
          <Button loading={generate.isPending} onClick={() => generate.mutate({ weeks: Number(weeks) })}>
            Generate
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Safe to press again: classes that already exist (including cancelled or moved ones) are never duplicated. Archived
          batches are skipped.
        </p>
        {generate.isSuccess && (
          <Alert tone={generate.data > 0 ? 'success' : 'info'}>
            {generate.data > 0
              ? `Added ${generate.data} class${generate.data === 1 ? '' : 'es'}.`
              : 'Nothing new to add. Either every class already exists, or no batch has a weekly routine yet.'}
          </Alert>
        )}
        {generate.error && <Alert tone="error">{scheduleError(generate.error)}</Alert>}
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Select
            label="Batch"
            name="batch-filter"
            value={batchFilter}
            onChange={(e) => setParam('batch', e.target.value || null)}
            className="w-full sm:w-64"
          >
            <option value="">All batches</option>
            {batchList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.active ? '' : ' (archived)'}
              </option>
            ))}
          </Select>
          <StatusLegend />
        </div>

        <WeekNav weekStart={weekStart} onChange={(w) => setParam('week', w === thisWeek ? null : w)} />

        {sessions.isPending ? (
          <Spinner />
        ) : sessions.error ? (
          <Alert tone="error">{sessions.error.message}</Alert>
        ) : (
          <>
            {shown.length === 0 && (
              <Alert tone="info">
                No classes this week.{' '}
                {batchFilter ? (
                  <Link to={`/admin/batches/${batchFilter}`} className="font-medium underline">
                    Check this batch's weekly routine
                  </Link>
                ) : (
                  'Add a weekly routine on a batch page, then press Generate.'
                )}
              </Alert>
            )}
            <WeekGrid
              weekStart={weekStart}
              sessions={shown}
              showBatch={!batchFilter}
              renderActions={(s) => <SessionActions session={s} />}
            />
          </>
        )}
      </div>

      {extraOpen && (
        <ExtraClassDialog
          open
          onClose={() => setExtraOpen(false)}
          batches={batchList}
          defaultBatchId={batchFilter || undefined}
        />
      )}
    </div>
  )
}
