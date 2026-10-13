import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

export default function ThemeToggle({ className = '' }) {
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
      className={`rounded-lg border border-line bg-surface p-2 text-muted hover:text-text ${className}`}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  )
}
