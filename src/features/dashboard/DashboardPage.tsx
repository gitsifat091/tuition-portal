import { Link, useSearchParams } from 'react-router'
import { Alert, Badge, Card, Spinner } from '../../components/ui'
import { formatDate, formatMonth, formatTaka } from '../../lib/format'
import { todayKey } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { useAuth } from '../auth/AuthProvider'
import { useUpcomingSessions } from '../schedule/api'
import { SessionItem } from '../schedule/SessionItem'
import { ChildSwitcher } from './ChildSwitcher'
import { useMyStudents, visibleBatchIds, type MyStudent } from './useMyStudents'

/** Student and guardian home: who, next classes, batches. Dues and the rest arrive from F5 onwards. */
export function DashboardPage() {
  const { profile } = useAuth()
  const { students, active, setActive, isPending, error } = useMyStudents()

  const firstName = (profile?.full_name ?? '').split(' ')[0]
  const isGuardianView = students.length > 1 || (profile?.role === 'guardian' && students.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-slate-600">Your next classes and batches. Dues and notes will appear here soon.</p>
      </div>

      {isPending && <Spinner />}
      {error && <Alert tone="error">{error.message}</Alert>}

      {!isPending && !error && students.length === 0 && (
        <Alert tone="info">No student is linked to this account yet. Please contact your teacher.</Alert>
      )}

      {students.length > 1 && (
        <ChildSwitcher students={students} activeId={active?.id} onSelect={setActive} />
      )}

      {active && <NextClasses student={active} />}
      {active && <StudentOverview student={active} showLabel={isGuardianView} />}
    </div>
  )
}

function StudentOverview({ student: s, showLabel }: { student: MyStudent; showLabel: boolean }) {
  // Only batches this account can see come back embedded (active batch, active enrollment).
  const batches = s.enrollments
    .filter((e) => e.active && e.batches)
    .sort((a, b) => a.batches!.name.localeCompare(b.batches!.name))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="space-y-1">
        <p className="text-sm text-slate-500">{showLabel ? 'Viewing' : 'Student'}</p>
        <p className="font-bangla text-lg font-semibold">{s.full_name}</p>
        {s.class_level && <p className="text-slate-600">Class {s.class_level}</p>}
        <p className="text-sm text-slate-500">Joined {formatDate(s.joined_on)}</p>
        {!s.active && <Badge>Inactive</Badge>}
      </Card>

      <Card className="space-y-3">
        <p className="text-sm text-slate-500">Batches</p>
        {batches.length === 0 ? (
          <p className="text-slate-600">Not in a batch yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {batches.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{e.batches!.name}</p>
                  <p className="text-sm text-slate-500">
                    {[e.batches!.subject, `since ${formatMonth(e.start_month)}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-slate-700">{formatTaka(e.monthly_fee)}/mo</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/** The next two classes (or a cancellation among them), with a link to the full schedule. */
function NextClasses({ student }: { student: MyStudent }) {
  const [params] = useSearchParams()
  const batchIds = visibleBatchIds(student)
  const sessions = useUpcomingSessions(batchIds, todayKey(), 14)
  const now = useNow()

  if (batchIds.length === 0) return null

  const next = (sessions.data ?? []).filter((s) => new Date(s.ends_at).getTime() > now).slice(0, 2)
  const child = params.get('child')
  const scheduleLink = child ? `/schedule?child=${child}` : '/schedule'

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-slate-500">Next classes</p>
        <Link to={scheduleLink} className="text-sm font-medium text-brand-700 hover:underline">
          Full schedule &rsaquo;
        </Link>
      </div>
      {sessions.isPending ? (
        <Spinner />
      ) : sessions.error ? (
        <Alert tone="error">{sessions.error.message}</Alert>
      ) : next.length === 0 ? (
        <p className="text-slate-600">No classes in the next 2 weeks.</p>
      ) : (
        <div className="space-y-2">
          {next.map((s) => (
            <SessionItem key={s.id} session={s} showDate showBatch={batchIds.length > 1} />
          ))}
        </div>
      )}
    </Card>
  )
}
