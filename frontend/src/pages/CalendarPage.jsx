import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import listPlugin from '@fullcalendar/react/list'
import '@fullcalendar/react/skeleton.css'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import '@fullcalendar/react/themes/classic/theme.css'
import { AlertTriangle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCalendar, useConflicts } from '../api/hooks'
import EventDialog from '../components/EventDialog'
import { Alert, Button, PageHeader } from '../components/ui'
import { CATEGORIES } from '../lib/categories'
import { WEEK_STARTS_ON, weekRange } from '../lib/dates'

/** Identifies one occurrence of a (possibly recurring) event. */
const occurrenceKey = (o) => `${o.event_id}@${o.starts_at}`

export default function CalendarPage() {
  const [range, setRange] = useState(() => weekRange())
  const [dialog, setDialog] = useState({ open: false, eventId: null, initial: null })

  const calendar = useCalendar(range)
  const conflicts = useConflicts(range)

  // Occurrences involved in any conflict get a warning outline.
  const conflicted = useMemo(
    () => new Set((conflicts.data ?? []).flatMap((c) => c.events.map(occurrenceKey))),
    [conflicts.data],
  )

  const events = useMemo(
    () =>
      (calendar.data ?? []).map((o) => ({
        id: occurrenceKey(o),
        title: o.title,
        start: o.starts_at,
        end: o.ends_at,
        allDay: o.all_day,
        // Full color for dots and edges; .as-event tints the body (index.css).
        color: `var(--cat-${o.category})`,
        contrastColor: 'var(--text)',
        className: `as-event as-cat-${o.category}${conflicted.has(occurrenceKey(o)) ? ' as-conflict' : ''}`,
        extendedProps: { eventId: o.event_id, location: o.location },
      })),
    [calendar.data, conflicted],
  )

  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  const conflictCount = conflicts.data?.length ?? 0

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Click or drag on the calendar to add an event. Outlined events overlap something."
        action={
          <Button onClick={() => setDialog({ open: true, eventId: null, initial: null })}>
            <Plus className="size-4" aria-hidden /> New event
          </Button>
        }
      />

      {calendar.isError && <Alert>Couldn't load your calendar. Refresh to try again.</Alert>}
      {conflictCount > 0 && (
        <p className="mb-3 flex items-center gap-2 text-sm text-warning" role="status">
          <AlertTriangle className="size-4" aria-hidden />
          {conflictCount === 1 ? '1 conflict' : `${conflictCount} conflicts`} in this view
        </p>
      )}

      <div className="athletesync-calendar rounded-xl border border-line bg-surface p-2 sm:p-4">
        <FullCalendar
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={narrow ? 'listWeek' : 'timeGridWeek'}
          headerToolbar={{
            start: 'prev,next today',
            center: 'title',
            end: narrow ? 'listWeek,dayGridMonth' : 'timeGridWeek,dayGridMonth,listWeek',
          }}
          firstDay={WEEK_STARTS_ON}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          nowIndicator
          dayMaxEvents
          selectable
          selectMirror
          events={events}
          datesSet={({ start, end }) => setRange({ from: start, to: end })}
          select={({ start, end, allDay, view }) => {
            view.calendar.unselect()
            setDialog({ open: true, eventId: null, initial: { start, end, allDay } })
          }}
          eventClick={({ event }) => setDialog({ open: true, eventId: event.extendedProps.eventId, initial: null })}
        />
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Category colors">
        {CATEGORIES.map((c) => (
          <li key={c.value} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: `var(--cat-${c.value})` }} aria-hidden />
            {c.label}
          </li>
        ))}
      </ul>

      <EventDialog
        open={dialog.open}
        eventId={dialog.eventId}
        initial={dialog.initial}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
