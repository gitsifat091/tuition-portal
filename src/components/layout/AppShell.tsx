import { Link, Outlet } from 'react-router'
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

/** Header shared by every signed-in page. Navigation arrives with F3 onwards. */
export function AppShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
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
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
