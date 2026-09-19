import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FullPageSpinner } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import type { Role } from '../lib/types'

/** Where each role belongs after signing in. */
export function homeFor(role: Role | undefined): string {
  if (role === 'admin') return '/admin'
  if (role === 'student' || role === 'guardian') return '/dashboard'
  return '/waiting'
}

/**
 * Lets the page render only for the listed roles.
 * Signed-out visitors go to /login; everyone else goes to their own home.
 * This is only for navigation. The real protection is Row Level Security.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, loading, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  const role = profile?.role ?? 'pending'
  if (!roles.includes(role)) return <Navigate to={homeFor(role)} replace />

  return <>{children}</>
}

/** The "/" route: send people to the right place. */
export function HomeRedirect() {
  const { session, loading, profile, profileLoading } = useAuth()
  if (loading || profileLoading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(profile?.role)} replace />
}
