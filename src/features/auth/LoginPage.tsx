import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { Logo } from '../../components/layout/AppShell'
import { Alert, Button, Card, Field } from '../../components/ui'
import { authRedirectUrl, supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

type Mode = 'signin' | 'signup' | 'link'

const titles: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create an account',
  link: 'Get a sign-in link',
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/" replace />

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const signInWithGoogle = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    })
    if (error) setError(error.message)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const cleanEmail = email.trim().toLowerCase()

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: authRedirectUrl() },
        })
        if (error) throw error
        if (!data.session) {
          setNotice(`We sent a confirmation link to ${cleanEmail}. Open it to finish creating your account.`)
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
        })
        if (error) throw error
        setNotice(`Check ${cleanEmail} for a sign-in link. It works once and expires in one hour.`)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        <Card className="space-y-5">
          <h1 className="text-xl font-semibold">{titles[mode]}</h1>

          <Button variant="secondary" className="w-full" onClick={signInWithGoogle} type="button">
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or with email
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Field
                label="Full name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              hint={mode === 'signup' ? 'Use the email you gave your teacher.' : undefined}
            />
            {mode !== 'link' && (
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}

            {error && <Alert tone="error">{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}

            <Button type="submit" className="w-full" loading={busy}>
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email me a link'}
            </Button>
          </form>

          <div className="space-y-2 text-center text-sm text-slate-600">
            {mode !== 'signin' && (
              <p>
                Already have an account?{' '}
                <button className="font-medium text-brand-700 hover:underline" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </p>
            )}
            {mode !== 'signup' && (
              <p>
                New here?{' '}
                <button className="font-medium text-brand-700 hover:underline" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </p>
            )}
            {mode !== 'link' && (
              <p>
                Forgot your password?{' '}
                <button className="font-medium text-brand-700 hover:underline" onClick={() => switchMode('link')}>
                  Email me a sign-in link
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(message)) return 'Please open the confirmation link we emailed you first.'
  if (/already registered/i.test(message)) return 'This email already has an account. Try signing in instead.'
  if (/rate limit/i.test(message)) return 'Too many emails sent. Please wait a few minutes and try again.'
  return message
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  )
}
