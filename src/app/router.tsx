import { createBrowserRouter, Link } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/ui'
import { AdminBatchesPage } from '../features/admin/AdminBatchesPage'
import { AdminLayout } from '../features/admin/AdminLayout'
import { AdminStudentsPage } from '../features/admin/AdminStudentsPage'
import { BatchDetailPage } from '../features/admin/BatchDetailPage'
import { StudentDetailPage } from '../features/admin/StudentDetailPage'
import { LoginPage } from '../features/auth/LoginPage'
import { WaitingPage } from '../features/auth/WaitingPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { AdminSchedulePage } from '../features/schedule/AdminSchedulePage'
import { SchedulePage } from '../features/schedule/SchedulePage'
import { HomeRedirect, RequireRole } from './RequireRole'

export const router = createBrowserRouter([
  { path: '/', element: <HomeRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      {
        path: '/waiting',
        element: (
          <RequireRole roles={['pending']}>
            <WaitingPage />
          </RequireRole>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <RequireRole roles={['student', 'guardian']}>
            <DashboardPage />
          </RequireRole>
        ),
      },
      {
        path: '/schedule',
        element: (
          <RequireRole roles={['student', 'guardian']}>
            <SchedulePage />
          </RequireRole>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequireRole roles={['admin']}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <AdminStudentsPage /> },
          { path: 'students/:id', element: <StudentDetailPage /> },
          { path: 'batches', element: <AdminBatchesPage /> },
          { path: 'batches/:id', element: <BatchDetailPage /> },
          { path: 'schedule', element: <AdminSchedulePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-sm space-y-3 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <Link to="/" className="font-medium text-brand-700 hover:underline">
          Go to your home page
        </Link>
      </Card>
    </div>
  )
}
