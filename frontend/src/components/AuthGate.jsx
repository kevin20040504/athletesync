import { Navigate, Outlet, useLocation } from 'react-router'
import { useUser } from '../api/hooks'
import { Alert, Button, Spinner } from './ui'

/** Renders child routes for signed-in users; sends guests to /login. */
export function RequireAuth() {
  const location = useLocation()
  const user = useUser()

  if (user.isPending) return <Spinner label="Loading your schedule" />
  if (user.isError) return <ConnectionError onRetry={user.refetch} />
  if (!user.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}

/** Renders child routes for guests; signed-in users go to the dashboard. */
export function GuestOnly() {
  const user = useUser()

  if (user.isPending) return <Spinner />
  if (user.data) return <Navigate to="/" replace />

  return <Outlet />
}

function ConnectionError({ onRetry }) {
  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-20">
      <Alert>Cannot reach the AthleteSync server. Make sure the API is running, then try again.</Alert>
      <Button variant="secondary" onClick={() => onRetry()}>
        Try again
      </Button>
    </div>
  )
}
