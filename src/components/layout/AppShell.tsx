import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../features/auth/AuthProvider'
import { Badge, Button } from '../ui'

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold text-brand-800">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      Tuition Portal
    </span>
  )
}

type NavItem = { to: string; label: string; icon: ReactNode }

// Student and guardian pages. Later features (dues, notes, attendance,
// results) add their entries here.
const memberNav: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: <HomeIcon /> },
  { to: '/schedule', label: 'Schedule', icon: <CalendarIcon /> },
]

/**
 * Header shared by every signed-in page. Students and guardians also get
 * navigation: a sidebar on wide screens and a bottom bar on phones.
 * The admin area has its own tab bar (AdminLayout).
 */
export function AppShell() {
  const { profile, signOut } = useAuth()
  const { pathname, search } = useLocation()
  const showNav = profile?.role === 'student' || profile?.role === 'guardian'

  // Keep the selected child when moving between pages.
  const child = new URLSearchParams(search).get('child')
  const hrefFor = (to: string) => (child ? `${to}?child=${encodeURIComponent(child)}` : to)
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {profile && (
              <span className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
                {profile.full_name || profile.email}
                <Badge tone={profile.role === 'admin' ? 'brand' : 'slate'}>{profile.role}</Badge>
              </span>
            )}
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className={['mx-auto max-w-5xl px-4 py-6', showNav ? 'pb-24 md:flex md:gap-8 md:pb-6' : ''].join(' ')}>
        {showNav && (
          <nav aria-label="Main" className="hidden md:block md:w-44 md:shrink-0">
            <ul className="sticky top-20 space-y-1">
              {memberNav.map((item) => {
                const active = isActive(item.to)
                return (
                  <li key={item.to}>
                    <Link
                      to={hrefFor(item.to)}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                        active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      ].join(' ')}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {showNav && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto flex max-w-md">
            {memberNav.map((item) => {
              const active = isActive(item.to)
              return (
                <li key={item.to} className="flex-1">
                  <Link
                    to={hrefFor(item.to)}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex flex-col items-center gap-0.5 py-2 text-xs font-medium',
                      active ? 'text-brand-700' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}

function HomeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}
