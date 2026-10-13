import ThemeToggle from '../../components/ThemeToggle'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">AthleteSync</p>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <ThemeToggle />
      </header>
      <section className="rounded-xl border border-line bg-surface p-5">{children}</section>
      {footer && <p className="text-center text-sm text-muted">{footer}</p>}
    </main>
  )
}
