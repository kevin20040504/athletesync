import { AlertTriangle, CalendarDays, CheckSquare, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useLogout, useUser } from '../api/hooks'
import ThemeToggle from './ThemeToggle'
import { cx } from '../lib/cx'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/conflicts', label: 'Conflicts', icon: AlertTriangle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/**
 * Signed-in shell: sidebar on wide screens, bottom tab bar on phones.
 */
export default function AppLayout() {
  const { data: user } = useUser()
  const logout = useLogout()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout.mutateAsync().catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">Student-athlete</p>
          <p className="text-lg font-semibold">AthleteSync</p>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <p className="truncate text-sm">
            <span className="block font-medium">{user?.name}</span>
            <span className="block truncate text-xs text-muted">{user?.email}</span>
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-text"
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <p className="font-semibold">AthleteSync</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={handleLogout} className="rounded-lg border border-line p-2 text-muted" aria-label="Log out">
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-6 md:pb-10">
          <Outlet />
        </main>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface md:hidden"
        >
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-accent' : 'text-muted')
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function SideLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
          isActive ? 'bg-accent-soft font-medium text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </NavLink>
  )
}
