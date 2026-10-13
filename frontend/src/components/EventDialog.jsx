import { addDays, addHours, startOfDay } from 'date-fns'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { errorMessage, fieldErrors } from '../api/client'
import { useConflictPreview, useDeleteEvent, useEvent, useSaveEvent } from '../api/hooks'
import { CATEGORIES } from '../lib/categories'
import { formatSpan, toDateInput, toLocalInput } from '../lib/dates'
import { fromRRule, NO_REPEAT, toRRule, WEEKDAYS, weekdayOf } from '../lib/recurrence'
import { useDebounced } from '../lib/useDebounced'
import { Alert, Button, CategoryDot, Dialog, Field, Spinner } from './ui'
import { cx } from '../lib/cx'

/**
 * Create or edit an event. While the form is filled in, the API's conflict
 * preview runs (debounced) and lists what the event would overlap.
 *
 * Props: `eventId` to edit, or `initial` = { start, end, allDay } to create.
 */
export default function EventDialog({ open, onClose, eventId = null, initial = null }) {
  const existing = useEvent(open ? eventId : null)

  return (
    <Dialog open={open} onClose={onClose} title={eventId ? 'Edit event' : 'New event'}>
      {!open ? null : eventId && existing.isPending ? (
        <Spinner />
      ) : eventId && existing.isError ? (
        <Alert>{errorMessage(existing.error)}</Alert>
      ) : (
        <EventForm
          key={eventId ?? 'new'}
          event={eventId ? existing.data : null}
          initial={initial}
          onDone={onClose}
        />
      )}
    </Dialog>
  )
}

function initialForm(event, initial) {
  if (event) {
    const start = new Date(event.starts_at)
    const end = new Date(event.ends_at)
    return {
      title: event.title,
      category: event.category,
      allDay: event.all_day,
      start: event.all_day ? toDateInput(start) : toLocalInput(start),
      // All-day events end at midnight after the last day; the form shows the last day.
      end: event.all_day ? toDateInput(addDays(end, -1)) : toLocalInput(end),
      location: event.location ?? '',
      notes: event.notes ?? '',
      repeat: fromRRule(event.rrule),
    }
  }

  const start = initial?.start ?? addHours(startOfDay(new Date()), 15)
  const end = initial?.end ?? addHours(start, 1)
  const allDay = initial?.allDay ?? false
  return {
    title: '',
    category: 'practice',
    allDay,
    start: allDay ? toDateInput(start) : toLocalInput(start),
    end: allDay ? toDateInput(addDays(end, -1)) : toLocalInput(end),
    location: '',
    notes: '',
    repeat: { ...NO_REPEAT },
  }
}

/** Form state to API payload, or null while the dates are incomplete/invalid. */
function toPayload(form) {
  if (!form.start || !form.end) return null
  const startsAt = form.allDay ? new Date(`${form.start}T00:00`) : new Date(form.start)
  const endsAt = form.allDay ? addDays(new Date(`${form.end}T00:00`), 1) : new Date(form.end)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return null

  return {
    title: form.title.trim(),
    category: form.category,
    all_day: form.allDay,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    location: form.location.trim() || null,
    notes: form.notes.trim() || null,
    rrule: toRRule(form.repeat),
  }
}

function EventForm({ event, initial, onDone }) {
  const [form, setForm] = useState(() => initialForm(event, initial))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = useSaveEvent()
  const remove = useDeleteEvent()

  const payload = useMemo(() => toPayload(form), [form])
  const errors = fieldErrors(save.error)
  const datesInvalid = form.start && form.end && !payload
  const generalError = save.isError && save.error?.response?.status !== 422 ? errorMessage(save.error) : null

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setRepeat = (changes) => setForm((f) => ({ ...f, repeat: { ...f.repeat, ...changes } }))

  // Moving the start keeps the event's length, like most calendar apps.
  function changeStart(e) {
    const start = e.target.value
    setForm((f) => {
      if (!start || !f.start || !f.end) return { ...f, start }
      const parse = (v) => (f.allDay ? new Date(`${v}T00:00`) : new Date(v))
      const length = parse(f.end) - parse(f.start)
      if (Number.isNaN(length) || length < 0) return { ...f, start }
      const end = new Date(parse(start).getTime() + length)
      return { ...f, start, end: f.allDay ? toDateInput(end) : toLocalInput(end) }
    })
  }

  function toggleAllDay(e) {
    const allDay = e.target.checked
    setForm((f) => {
      const start = allDay ? new Date(f.start) : new Date(`${f.start}T00:00`)
      const end = allDay ? new Date(f.end) : new Date(`${f.end}T00:00`)
      return {
        ...f,
        allDay,
        start: allDay ? toDateInput(start) : toLocalInput(addHours(start, 15)),
        end: allDay ? toDateInput(end) : toLocalInput(addHours(end, 16)),
      }
    })
  }

  function toggleDay(day) {
    const days = form.repeat.days.includes(day) ? form.repeat.days.filter((d) => d !== day) : [...form.repeat.days, day]
    setRepeat({ days })
  }

  function changeFreq(e) {
    const freq = e.target.value
    // Weekly defaults to the start date's weekday, which is what people expect.
    const days = freq === 'WEEKLY' && !form.repeat.days.length && form.start ? [weekdayOf(form.start)] : form.repeat.days
    setRepeat({ freq, days })
  }

  function submit(e) {
    e.preventDefault()
    if (!payload) return
    save.mutate({ id: event?.id, ...payload }, { onSuccess: onDone })
  }

  function handleDelete() {
    if (!confirmDelete) return setConfirmDelete(true)
    remove.mutate(event.id, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Alert>{generalError}</Alert>

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field label="Title" required autoFocus value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Team practice" />
        <Field label="Category" error={errors.category}>
          {(props) => (
            <select {...props} value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.allDay} onChange={toggleAllDay} className="size-4 accent-[var(--accent)]" />
        All day
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={form.allDay ? 'First day' : 'Starts'}
          type={form.allDay ? 'date' : 'datetime-local'}
          required
          value={form.start}
          onChange={changeStart}
          error={errors.starts_at}
        />
        <Field
          label={form.allDay ? 'Last day' : 'Ends'}
          type={form.allDay ? 'date' : 'datetime-local'}
          required
          value={form.end}
          onChange={set('end')}
          error={errors.ends_at ?? (datesInvalid ? 'The end must be after the start.' : null)}
        />
      </div>

      <RepeatControls repeat={form.repeat} onFreq={changeFreq} onDay={toggleDay} onChange={setRepeat} error={errors.rrule} />

      <Field label="Location" value={form.location} onChange={set('location')} error={errors.location} placeholder="Optional" />
      <Field label="Notes" error={errors.notes}>
        {(props) => <textarea {...props} rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional" />}
      </Field>

      <ConflictWarning payload={payload} allDay={form.allDay} eventId={event?.id} />

      {event?.rrule && <p className="text-xs text-muted">Changes apply to every occurrence in this series.</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {event && (
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>
            {confirmDelete ? (event.rrule ? 'Delete whole series?' : 'Really delete?') : 'Delete'}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!payload}>
            {event ? 'Save changes' : 'Add event'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function RepeatControls({ repeat, onFreq, onDay, onChange, error }) {
  if (repeat.freq === 'custom') {
    return (
      <div className="space-y-1.5 text-sm">
        <p className="font-medium">Repeat</p>
        <p className="text-muted">
          Custom rule <code className="font-mono text-xs">{repeat.raw}</code>{' '}
          <button type="button" className="text-accent hover:underline" onClick={() => onChange({ ...NO_REPEAT })}>
            Replace
          </button>
        </p>
      </div>
    )
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">Repeat</legend>
      <select value={repeat.freq} onChange={onFreq} aria-label="Repeat frequency" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm">
        <option value="none">Does not repeat</option>
        <option value="DAILY">Every day</option>
        <option value="WEEKLY">Every week</option>
        <option value="MONTHLY">Every month</option>
      </select>

      {repeat.freq === 'WEEKLY' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Repeat on">
          {WEEKDAYS.map((d) => {
            const on = repeat.days.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                onClick={() => onDay(d.value)}
                className={cx(
                  'rounded-md border px-2.5 py-1 text-xs font-medium',
                  on ? 'border-accent bg-accent text-on-accent' : 'border-line text-muted hover:text-text',
                )}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      )}

      {repeat.freq !== 'none' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="repeat-ends" className="text-muted">
            Ends
          </label>
          <select
            id="repeat-ends"
            value={repeat.ends}
            onChange={(e) => onChange({ ends: e.target.value })}
            className="rounded-lg border border-line bg-surface px-2 py-1.5"
          >
            <option value="never">Never</option>
            <option value="until">On date</option>
            <option value="count">After</option>
          </select>
          {repeat.ends === 'until' && (
            <input
              type="date"
              aria-label="Repeat until"
              value={repeat.until}
              onChange={(e) => onChange({ until: e.target.value })}
              className="rounded-lg border border-line bg-surface px-2 py-1.5"
            />
          )}
          {repeat.ends === 'count' && (
            <>
              <input
                type="number"
                min={1}
                max={1000}
                aria-label="Number of times"
                value={repeat.count}
                onChange={(e) => onChange({ count: e.target.value })}
                className="w-20 rounded-lg border border-line bg-surface px-2 py-1.5"
              />
              <span className="text-muted">times</span>
            </>
          )}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  )
}

/** Live "this overlaps …" summary from POST /conflicts/preview. */
function ConflictWarning({ payload, allDay, eventId }) {
  const proposal = useDebounced(
    payload && !allDay ? { ...payload, title: payload.title || 'Untitled', event_id: eventId ?? null } : null,
    400,
  )
  const preview = useConflictPreview(proposal)

  if (!proposal || allDay) return null
  if (preview.isError) return null // Validation problems show on the fields when saving.
  if (preview.isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking for conflicts…
      </p>
    )
  }

  const conflicts = preview.data.data
  if (!conflicts.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-success" role="status">
        <CheckCircle2 className="size-4" aria-hidden /> No conflicts with your schedule.
      </p>
    )
  }

  // Group by the event it clashes with: "Calculus · 26 times · first Mon 12 Oct".
  const groups = Object.values(
    conflicts.reduce((acc, c) => {
      const key = c.conflicts_with.event_id
      acc[key] ??= { other: c.conflicts_with, count: 0, first: c }
      acc[key].count += 1
      return acc
    }, {}),
  )

  return (
    <div className="space-y-2 rounded-lg border border-warning/40 p-3" role="status">
      <p className="flex items-center gap-2 text-sm font-medium text-warning">
        <AlertTriangle className="size-4" aria-hidden />
        {groups.length === 1 && conflicts.length === 1
          ? 'Overlaps 1 event'
          : `${conflicts.length} overlaps with ${groups.length === 1 ? '1 event' : `${groups.length} events`}`}
        {proposal.rrule ? ' in the next 6 months' : ''}
      </p>
      <ul className="space-y-1.5 text-sm">
        {groups.slice(0, 5).map(({ other, count, first }) => (
          <li key={other.event_id} className="flex items-start gap-2">
            <CategoryDot category={other.category} className="mt-1.5" />
            <span>
              <span className="font-medium">{other.title}</span>
              <span className="text-muted">
                {' '}
                · {count > 1 ? `${count} times, first ` : ''}
                {formatSpan(first.conflicts_with.starts_at, first.conflicts_with.ends_at)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">You can still save it.</p>
    </div>
  )
}
