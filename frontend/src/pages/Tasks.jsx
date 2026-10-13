import { CheckSquare, Plus } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { useSaveTask, useTasks } from '../api/hooks'
import TaskDialog from '../components/TaskDialog'
import { TaskRow } from '../components/TaskList'
import { groupOpenTasks } from '../lib/tasks'
import { Alert, Button, Card, EmptyState, PageHeader, Spinner } from '../components/ui'
import { cx } from '../lib/cx'

export default function Tasks() {
  const [tab, setTab] = useState('open')
  const [dialog, setDialog] = useState({ open: false, task: null })
  const tasks = useTasks(tab)
  const openDialog = (task = null) => setDialog({ open: true, task })

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Assignments, readings and anything else with a deadline."
        action={
          <Button onClick={() => openDialog()}>
            <Plus className="size-4" aria-hidden /> New task
          </Button>
        }
      />

      <QuickAdd />

      <div role="tablist" aria-label="Task status" className="mb-4 inline-flex rounded-lg border border-line bg-surface p-1">
        {[
          ['open', 'To do'],
          ['completed', 'Done'],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cx(
              'rounded-md px-3 py-1.5 text-sm',
              tab === value ? 'bg-accent-soft font-medium text-text' : 'text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tasks.isPending ? (
        <Spinner label="Loading tasks" />
      ) : tasks.isError ? (
        <Alert>{errorMessage(tasks.error)}</Alert>
      ) : !tasks.data.length ? (
        <Card>
          <EmptyState icon={CheckSquare} title={tab === 'open' ? 'Nothing to do' : 'No finished tasks yet'}>
            {tab === 'open' ? 'Add assignments and deadlines above to keep track of them.' : 'Tick a task off and it shows up here.'}
          </EmptyState>
        </Card>
      ) : tab === 'open' ? (
        <div className="space-y-4">
          {groupOpenTasks(tasks.data).map((group) => (
            <Card key={group.key} title={`${group.title} · ${group.tasks.length}`} className={group.key === 'overdue' ? 'border-danger/40' : undefined}>
              <ul className="divide-y divide-line">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onOpen={openDialog} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Card title="Recently finished">
          <ul className="divide-y divide-line">
            {tasks.data.map((task) => (
              <TaskRow key={task.id} task={task} onOpen={openDialog} />
            ))}
          </ul>
        </Card>
      )}

      <TaskDialog open={dialog.open} task={dialog.task} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </>
  )
}

/** Title-only add: type and press Enter. Details can be added later. */
function QuickAdd() {
  const [title, setTitle] = useState('')
  const save = useSaveTask()

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    save.mutate({ title: title.trim() }, { onSuccess: () => setTitle('') })
  }

  return (
    <form onSubmit={submit} className="mb-5 flex gap-2">
      <label htmlFor="quick-add" className="sr-only">
        Quick add a task
      </label>
      <input
        id="quick-add"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quick add: type a task and press Enter"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted/70"
      />
      <Button type="submit" variant="secondary" loading={save.isPending} disabled={!title.trim()}>
        Add
      </Button>
    </form>
  )
}
