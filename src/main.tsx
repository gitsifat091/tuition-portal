import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Providers } from './app/providers'
import { router } from './app/router'
import { supabaseConfigured } from './lib/supabase'
import './styles/index.css'

function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Supabase is not configured</h1>
      <p className="mt-2 text-slate-600">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in a <code>.env</code> file (local)
        or in the Cloudflare Pages environment variables (live site), then rebuild.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
)
