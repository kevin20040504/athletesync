import { endOfDay, endOfWeek, format, formatDistanceToNowStrict, isPast, isToday } from 'date-fns'
import { WEEK_STARTS_ON } from './dates'

/** Buckets open tasks by due date. Input is already sorted by the API. */
export function groupOpenTasks(tasks, now = new Date()) {
  const todayEnd = endOfDay(now)
  const weekEnd = endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
  const groups = [
    { key: 'overdue', title: 'Overdue', tasks: [] },
    { key: 'today', title: 'Today', tasks: [] },
    { key: 'week', title: 'This week', tasks: [] },
    { key: 'later', title: 'Later', tasks: [] },
    { key: 'undated', title: 'No due date', tasks: [] },
  ]
  const byKey = Object.fromEntries(groups.map((g) => [g.key, g]))

  for (const task of tasks) {
    const due = task.due_at ? new Date(task.due_at) : null
    const key = !due ? 'undated' : due < now ? 'overdue' : due <= todayEnd ? 'today' : due <= weekEnd ? 'week' : 'later'
    byKey[key].tasks.push(task)
  }
  return groups.filter((g) => g.tasks.length)
}

export function dueLabel(dueAt) {
  const due = new Date(dueAt)
  if (isToday(due)) return `Today ${format(due, 'h:mm a')}`
  if (isPast(due)) return `${formatDistanceToNowStrict(due)} overdue`
  return format(due, 'EEE d MMM, h:mm a')
}
