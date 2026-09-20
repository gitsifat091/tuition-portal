import type { MyStudent } from './useMyStudents'

/** Pill tabs to choose which child a guardian is looking at. */
export function ChildSwitcher({
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

