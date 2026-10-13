import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

/*
 * The theme lives in one place: the `dark` class on <html> (set before first
 * paint in index.html). Every toggle subscribes to that class, so the sidebar
 * and phone-header toggles never disagree.
 */
function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const isDark = () => document.documentElement.classList.contains('dark')

export default function ThemeToggle({ className = '' }) {
  const dark = useSyncExternalStore(subscribe, isDark)

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('athletesync-theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`rounded-lg border border-line bg-surface p-2 text-muted hover:text-text ${className}`}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  )
}
