import { useState } from 'react'
import { errorMessage, fieldErrors } from '../api/client'
import { useDeleteTask, useLinkableEvents, useSaveTask } from '../api/hooks'
import { PRIORITIES, categoryLabel } from '../lib/categories'
import { toLocalInput } from '../lib/dates'
import { Alert, Button, Dialog, Field } from './ui'

/** Create (task = null) or edit a task. */
export default function TaskDialog({ open, onClose, task = null }) {
  return (
    <Dialog open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      {open && <TaskForm key={task?.id ?? 'new'} task={task} onDone={onClose} />}
    </Dialog>
  )
}

function TaskForm({ task, onDone }) {
  const [form, setForm] = useState(() => ({
    title: task?.title ?? '',
    due: task?.due_at ? toLocalInput(task.due_at) : '',
    priority: task?.priority ?? 'normal',
    estimate: task?.estimated_minutes ?? '',
    eventId: task?.event?.id ?? '',
    notes: task?.notes ?? '',
  }))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = useSaveTask()
  const remove = useDeleteTask()
  const events = useLinkableEvents()

  // The linked event may be outside the next four months; keep it selectable.
  const options = task?.event && !events.some((e) => e.id === task.event.id) ? [task.event, ...events] : events

  const errors = fieldErrors(save.error)
  const generalError = save.isError && save.error?.response?.status !== 422 ? errorMessage(save.error) : null
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    save.mutate(
      {
        id: task?.id,
        title: form.title.trim(),
        due_at: form.due ? new Date(form.due).toISOString() : null,
        priority: form.priority,
        estimated_minutes: form.estimate === '' ? null : Number(form.estimate),
        event_id: form.eventId === '' ? null : Number(form.eventId),
        notes: form.notes.trim() || null,
      },
      { onSuccess: onDone },
    )
  }

  function handleDelete() {
    if (!confirmDelete) return setConfirmDelete(true)
    remove.mutate(task.id, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Alert>{generalError}</Alert>
      <Field label="Task" required autoFocus value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Chemistry lab report" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due" type="datetime-local" value={form.due} onChange={set('due')} error={errors.due_at} hint="Optional" />
        <Field label="Priority" error={errors.priority}>
          {(props) => (
            <select {...props} value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="For" error={errors.event_id} hint="Link it to a class or other event">
          {(props) => (
            <select {...props} value={form.eventId} onChange={set('eventId')}>
              <option value="">Nothing</option>
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({categoryLabel(e.category)})
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="Time needed (minutes)"
          type="number"
          min={1}
          max={1440}
          value={form.estimate}
          onChange={set('estimate')}
          error={errors.estimated_minutes}
          hint="Optional"
        />
      </div>

      <Field label="Notes" error={errors.notes}>
        {(props) => <textarea {...props} rows={3} value={form.notes} onChange={set('notes')} placeholder="Optional" />}
      </Field>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {task && (
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>
            {confirmDelete ? 'Really delete?' : 'Delete'}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!form.title.trim()}>
            {task ? 'Save changes' : 'Add task'}
          </Button>
        </div>
      </div>
    </form>
  )
}
