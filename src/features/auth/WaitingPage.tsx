import { useState } from 'react'
import { Navigate } from 'react-router'
import { homeFor } from '../../app/RequireRole'
import { Alert, Button, Card } from '../../components/ui'
import { useAuth } from './AuthProvider'

/** Shown to signed-in accounts that are not linked to a student or guardian yet. */
export function WaitingPage() {
  const { session, profile, refetchProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const [stillWaiting, setStillWaiting] = useState(false)

  if (profile && profile.role !== 'pending') return <Navigate to={homeFor(profile.role)} replace />

  const email = profile?.email ?? session?.user.email ?? ''

  const checkAgain = async () => {
    setChecking(true)
    setStillWaiting(false)
    await refetchProfile()
    setChecking(false)
    setStillWaiting(true)
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          <span aria-hidden>&#8987;</span>
        </div>
        <h1 className="text-xl font-semibold">Waiting for your teacher</h1>
        <p className="text-slate-600">
          You are signed in as <span className="font-medium text-slate-900">{email}</span>, but this email is not
          linked to a student or guardian yet.
        </p>
        <p className="text-slate-600">
          Please send this exact email address to your teacher. Once it is added, tap the button below.
        </p>
        {stillWaiting && <Alert tone="info">Not linked yet. Please check again a little later.</Alert>}
        <Button onClick={checkAgain} loading={checking} className="w-full">
          Check again
        </Button>
      </Card>
    </div>
  )
}
