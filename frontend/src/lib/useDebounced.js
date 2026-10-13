import { useEffect, useState } from 'react'

/**
 * `value`, updated only after it has stopped changing for `delay` ms.
 * Objects are compared by their JSON so a re-created but equal object
 * doesn't restart the timer.
 */
export function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value)
  const serialized = JSON.stringify(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(JSON.parse(serialized)), delay)
    return () => clearTimeout(timer)
  }, [serialized, delay])

  return debounced
}
