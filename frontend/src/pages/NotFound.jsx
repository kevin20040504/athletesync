import { Link } from 'react-router'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted">That page doesn't exist.</p>
      <Link to="/" className="text-sm font-medium text-accent hover:underline">
        Back to your dashboard
      </Link>
    </main>
  )
}
