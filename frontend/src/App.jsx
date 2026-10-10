import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Database, Moon, RefreshCw, Server, Sun, XCircle } from 'lucide-react'
import { useState } from 'react'
import { api } from './api/client'

/**
 * Phase 2 setup check: confirms the frontend can reach the Laravel API
 * and that the API can reach MySQL. Replaced by the router in Phase 4.
 */
export default function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health').then((res) => res.data.data),
    retry: false,
  })

  // A 503 still carries a body telling us the database is unreachable.
  const data = health.data ?? health.error?.response?.data?.data
  const apiReachable = Boolean(data)
  const dbConnected = data?.database === 'connected'

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Setup check</p>
          <h1 className="mt-1 text-2xl font-semibold">AthleteSync</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="rounded-xl border border-line bg-surface p-5" aria-live="polite">
        <ul className="space-y-3">
          <StatusRow icon={Server} label="React + Vite + Tailwind" ok detail="Frontend is running" />
          <StatusRow
            icon={Server}
            label="Laravel API"
            loading={health.isLoading}
            ok={apiReachable}
            detail={apiReachable ? 'GET /api/v1/health responded' : 'Not reachable. Is `php artisan serve` running?'}
          />
          <StatusRow
            icon={Database}
            label="MySQL"
            loading={health.isLoading}
            ok={dbConnected}
            detail={
              dbConnected
                ? 'Connected'
                : apiReachable
                  ? 'API is up but cannot reach the database. Check backend/.env'
                  : 'Unknown until the API responds'
            }
          />
        </ul>
        <button
          type="button"
          onClick={() => health.refetch()}
          disabled={health.isFetching}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${health.isFetching ? 'animate-spin' : ''}`} aria-hidden />
          Re-check
        </button>
      </section>

      <div className="flex flex-wrap gap-2" aria-label="Event category colors">
        {['class', 'exam', 'practice', 'game', 'gym', 'personal', 'study', 'recovery'].map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs capitalize"
          >
            <span className="size-2 rounded-full" style={{ background: `var(--cat-${cat})` }} />
            {cat}
          </span>
        ))}
      </div>
    </main>
  )
}

function StatusRow({ icon: Icon, label, ok, loading, detail }) {
  const StateIcon = ok ? CheckCircle2 : XCircle
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 text-muted" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{loading ? 'Checking…' : detail}</p>
      </div>
      {!loading && (
        <StateIcon className={`size-5 ${ok ? 'text-success' : 'text-danger'}`} aria-label={ok ? 'OK' : 'Failed'} />
      )}
    </li>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('athletesync-theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg border border-line bg-surface p-2 text-muted hover:text-text"
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  )
}
