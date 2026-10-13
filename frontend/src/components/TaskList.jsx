import { isPast } from 'date-fns'
import { Clock, Link2 } from 'lucide-react'
import { useToggleTask } from '../api/hooks'
import { dueLabel } from '../lib/tasks'
import { CategoryDot } from './ui'
import { cx } from '../lib/cx'

export function TaskRow({ task, onOpen, compact = false }) {
  const toggle = useToggleTask()
  const overdue = !task.completed && task.due_at && isPast(new Date(task.due_at))

  return (
    <li className="flex items-start gap-3 py-2.5">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(e) => toggle.mutate({ id: task.id, completed: e.target.checked })}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'not done' : 'done'}`}
        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen?.(task)}
          className={cx('block max-w-full truncate text-left text-sm hover:underline', task.completed && 'text-muted line-through')}
        >
          {task.title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {task.due_at && <span className={cx(overdue && 'font-medium text-danger')}>{dueLabel(task.due_at)}</span>}
          {task.priority === 'high' && <span className="font-medium text-warning">High priority</span>}
          {!compact && task.event && (
            <span className="inline-flex items-center gap-1">
              <Link2 className="size-3" aria-hidden />
              <CategoryDot category={task.event.category} className="size-2" />
              {task.event.title}
            </span>
          )}
          {!compact && task.estimated_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {task.estimated_minutes} min
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
