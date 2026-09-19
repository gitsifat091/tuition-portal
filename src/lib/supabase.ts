import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

// A placeholder client keeps the app from crashing when env vars are missing;
// main.tsx shows a setup message instead of the app in that case.
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  key ?? 'missing-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Implicit flow lets an email link work even if it opens in a
      // different browser (for example inside the Gmail app on a phone).
      flowType: 'implicit',
    },
  },
)

/** Where Supabase sends people back after Google or an email link. */
export const authRedirectUrl = () => `${window.location.origin}/`
