import { addDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { errorMessage } from '../api/client'
import { useConflicts } from '../api/hooks'
import EventDialog from '../components/EventDialog'
import { Alert, Button, Card, CategoryDot, EmptyState, PageHeader, Spinner } from '../components/ui'
import { categoryLabel } from '../lib/categories'
import { formatTime, weekRange } from '../lib/dates'

const WINDOW_DAYS = 28

export default function Conflicts() {
  const [from, setFrom] = useState(() => weekRange().from)
  const range = useMemo(() => ({ from, to: addDays(from, WINDOW_DAYS) }), [from])
  const conflicts = useConflicts(range)
  const [editing, setEditing] = useState(null)

  // Group by the day the overlap starts.
  const days = useMemo(() => {
    const map = new Map()
    for (const c of conflicts.data ?? []) {
      const day = format(new Date(c.overlap.starts_at), 'yyyy-MM-dd')
      if (!map.has(day)) map.set(day, [])
      map.get(day).push(c)
    }
    return [...map.entries()]
  }, [conflicts.data])

  const shift = (days) => setFrom((f) => addDays(f, days))

  return (
    <>
      <PageHeader
        title="Conflicts"
        description="Times when two things on your schedule overlap. All-day events are not counted."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => shift(-WINDOW_DAYS)} aria-label="Previous 4 weeks">
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium">
              {format(range.from, 'd MMM')} – {format(addDays(range.to, -1), 'd MMM yyyy')}
            </span>
            <Button variant="secondary" onClick={() => shift(WINDOW_DAYS)} aria-label="Next 4 weeks">
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        }
      />

      {conflicts.isPending ? (
        <Spinner label="Checking your schedule" />
      ) : conflicts.isError ? (
        <Alert>{errorMessage(conflicts.error)}</Alert>
      ) : !days.length ? (
        <Card>
          <EmptyState icon={ShieldCheck} title="No conflicts in these 4 weeks">
            Nothing on your schedule overlaps. Nice planning.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted" role="status">
            {conflicts.data.length === 1 ? '1 conflict' : `${conflicts.data.length} conflicts`} on {days.length}{' '}
            {days.length === 1 ? 'day' : 'days'}
          </p>
          {days.map(([day, items]) => (
            <Card key={day} title={format(new Date(`${day}T00:00`), 'EEEE d MMMM')}>
              <ul className="divide-y divide-line">
                {items.map((c) => (
                  <ConflictRow key={`${c.events[0].event_id}-${c.events[1].event_id}-${c.overlap.starts_at}`} conflict={c} onEdit={setEditing} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <EventDialog open={editing !== null} eventId={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function ConflictRow({ conflict, onEdit }) {
  const { events, overlap } = conflict
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="grid flex-1 gap-1.5 sm:grid-cols-2">
        {events.map((e) => (
          <button
            key={e.event_id}
            type="button"
            onClick={() => onEdit(e.event_id)}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-line px-3 py-2 text-left hover:bg-surface-2"
          >
            <CategoryDot category={e.category} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{e.title}</span>
              <span className="block text-xs text-muted">
                {categoryLabel(e.category)} · {formatTime(e.starts_at)}–{formatTime(e.ends_at)}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="shrink-0 text-sm text-warning sm:w-36 sm:text-right">
        {overlap.minutes} min overlap
        <span className="block text-xs text-muted">
          {formatTime(overlap.starts_at)}–{formatTime(overlap.ends_at)}
        </span>
      </p>
    </li>
  )
}
