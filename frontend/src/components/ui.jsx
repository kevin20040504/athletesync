import { Loader2, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { cx } from '../lib/cx'

/*
 * Small UI kit. Styling uses the semantic tokens from index.css only, so
 * every component works in light and dark mode.
 */

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'border border-line bg-surface text-text hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'border border-line bg-surface text-danger hover:bg-surface-2',
}

export function Button({ variant = 'primary', loading = false, className, children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 disabled:opacity-60 aria-[invalid=true]:border-danger'

/**
 * A labelled form control with an error message wired up for screen readers.
 * `children` receives the props to spread on the control: render-prop style
 * for selects/textareas, or omit it to get a plain <input>.
 */
export function Field({ label, error, hint, className, children, ...inputProps }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const controlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: inputClass,
  }

  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children ? children(controlProps) : <input {...controlProps} {...inputProps} />}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Alert({ tone = 'danger', children }) {
  if (!children) return null
  const tones = {
    danger: 'border-danger/40 text-danger',
    warning: 'border-warning/40 text-warning',
    success: 'border-success/40 text-success',
  }
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-lg border bg-surface px-3 py-2 text-sm', tones[tone])}>
      {children}
    </div>
  )
}

export function Card({ title, action, className, children }) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface p-4 sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Icon && <Icon className="size-8 text-muted" aria-hidden />}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function CategoryDot({ category, className }) {
  return (
    <span
      className={cx('inline-block size-2.5 shrink-0 rounded-full', className)}
      style={{ background: `var(--cat-${category})` }}
      aria-hidden
    />
  )
}

export function PageHeader({ title, description, action }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}

/**
 * Accessible modal built on <dialog>: focus trapping, Escape to close and
 * the backdrop come from the browser.
 */
export function Dialog({ open, onClose, title, children, footer }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(100vw-2rem,40rem)] rounded-xl border border-line bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50"
    >
      {open && (
        <div className="flex max-h-[min(90vh,52rem)] flex-col">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:text-text" aria-label="Close">
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
