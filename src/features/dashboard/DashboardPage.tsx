import { Alert, Badge, Card, Spinner } from '../../components/ui'
import { formatDate, formatMonth, formatTaka } from '../../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { useMyStudents, type MyStudent } from './useMyStudents'

/** Student and guardian home. Schedule, dues and the rest are added from F3 onwards. */
export function DashboardPage() {
  const { profile } = useAuth()
  const { students, active, setActive, isPending, error } = useMyStudents()

  const firstName = (profile?.full_name ?? '').split(' ')[0]
  const isGuardianView = students.length > 1 || (profile?.role === 'guardian' && students.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-slate-600">Class schedule, dues and notes will appear here soon.</p>
      </div>

      {isPending && <Spinner />}
      {error && <Alert tone="error">{error.message}</Alert>}

      {!isPending && !error && students.length === 0 && (
        <Alert tone="info">No student is linked to this account yet. Please contact your teacher.</Alert>
      )}

      {students.length > 1 && (
        <ChildSwitcher students={students} activeId={active?.id} onSelect={setActive} />
      )}

      {active && <StudentOverview student={active} showLabel={isGuardianView} />}
    </div>
  )
}

function ChildSwitcher({
  students,
  activeId,
  onSelect,
}: {
  students: MyStudent[]
  activeId: string | undefined
  onSelect: (id: string) => void
}) {
  return (
    <div role="tablist" aria-label="Choose a child" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {students.map((s) => {
        const selected = s.id === activeId
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(s.id)}
            className={[
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition font-bangla',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
              selected ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            {s.full_name}
          </button>
        )
      })}
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
