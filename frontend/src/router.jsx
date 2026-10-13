import { createBrowserRouter } from 'react-router'
import AppLayout from './components/AppLayout'
import { GuestOnly, RequireAuth } from './components/AuthGate'
import { Spinner } from './components/ui'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import NotFound from './pages/NotFound'

/**
 * Signed-in pages load on demand: FullCalendar and Recharts are large and
 * only needed on the pages that use them.
 */
const page = (load) => () => load().then((module) => ({ Component: module.default }))

export const router = createBrowserRouter([
  { path: '/setup', lazy: page(() => import('./pages/SetupCheck')) },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        HydrateFallback: Spinner,
        children: [
          { index: true, lazy: page(() => import('./pages/Dashboard')) },
          { path: 'calendar', lazy: page(() => import('./pages/CalendarPage')) },
          { path: 'tasks', lazy: page(() => import('./pages/Tasks')) },
          { path: 'conflicts', lazy: page(() => import('./pages/Conflicts')) },
          { path: 'settings', lazy: page(() => import('./pages/SettingsPage')) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])
