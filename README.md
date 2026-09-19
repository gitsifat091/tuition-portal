# Tuition Portal

A private portal where my tuition students and their guardians see class schedules, dues, attendance, exam results, and batch notes.

- Frontend: React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 8, TanStack Query 5
- Backend: Supabase (Auth, Postgres with Row Level Security)
- Hosting: Cloudflare Pages (frontend), Supabase free tier (backend)

## Run locally

```powershell
copy .env.example .env   # then fill in the two values
npm install
npm run dev
```

First-time setup (Supabase project, Google sign-in, admin account, deploy, keep-alive) is in [docs/F1_SETUP.md](docs/F1_SETUP.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server on http://localhost:5173 |
| `npm run build` | Type check and production build into `dist/` |
| `npm run typecheck` | Type check only |
| `npm run lint` | Lint with oxlint |
| `npm run preview` | Serve the production build locally |

## Structure

```
src/
  app/            router, providers, role guard
  components/     shared UI and layout
  features/       one folder per feature (auth, dashboard, admin, ...)
  lib/            Supabase client, database types, formatting
  styles/         Tailwind entry and theme
supabase/
  migrations/     one SQL file per feature, schema plus RLS
.github/workflows/
  keepalive.yml   pings Supabase twice a week
```

## Security model

The browser talks to Supabase directly. Row Level Security decides what each account can read or change:
- admin: everything
- student: their own student record
- guardian: their linked children (from F2)
- pending: only their own profile

Route guards in the app are for navigation only. The database is the real gate.
