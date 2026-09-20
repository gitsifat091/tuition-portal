import { Link, Outlet, useLocation } from 'react-router'

const tabs = [
  { to: '/admin', label: 'Students', isActive: (p: string) => p === '/admin' || p.startsWith('/admin/students') },
  { to: '/admin/batches', label: 'Batches', isActive: (p: string) => p.startsWith('/admin/batches') },
  { to: '/admin/schedule', label: 'Schedule', isActive: (p: string) => p.startsWith('/admin/schedule') },
]

/** Admin area: a tab bar on top, the current admin page below. */
export function AdminLayout() {
  const { pathname } = useLocation()

  return (
    <div className="space-y-6">
      <nav aria-label="Admin sections" className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {tabs.map((t) => {
          const active = t.isActive(pathname)
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition sm:flex-none',
                active ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}
