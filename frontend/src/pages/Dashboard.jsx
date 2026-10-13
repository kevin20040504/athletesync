import { format } from 'date-fns'
import { AlertTriangle, CalendarDays, CalendarPlus, CheckSquare, Clock, ListTodo } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCalendar, useStats, useTasks, useUser } from '../api/hooks'
import EventDialog from '../components/EventDialog'
import TaskDialog from '../components/TaskDialog'
import { TaskRow } from '../components/TaskList'
import { Alert, Button, Card, CategoryDot, EmptyState, Spinner } from '../components/ui'
import { cx } from '../lib/cx'
import { CATEGORIES, categoryLabel } from '../lib/categories'
import { dayRange, formatTime, minutesToHours, weekRange } from '../lib/dates'

export default function Dashboard() {
  const { data: user } = useUser()
  // "Now" is fixed when the page opens; the dashboard isn't a live clock.
  const [now] = useState(() => new Date())
  const week = useMemo(() => weekRange(now), [now])
  const today = useMemo(() => dayRange(now), [now])
  const stats = useStats(week)
  const [eventDialog, setEventDialog] = useState({ open: false, eventId: null })
  const [taskDialog, setTaskDialog] = useState({ open: false, task: null })

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{format(now, 'EEEE d MMMM')}</p>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {greeting}, {user.name.split(' ')[0]}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTaskDialog({ open: true, task: null })}>
            <ListTodo className="size-4" aria-hidden /> Add task
          </Button>
          <Button onClick={() => setEventDialog({ open: true, eventId: null })}>
            <CalendarPlus className="size-4" aria-hidden /> Add event
          </Button>
        </div>
      </header>

      {stats.isError && <Alert>Couldn't load this week's numbers.</Alert>}
      <StatTiles stats={stats.data} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TodayAgenda range={today} now={now} onOpen={(eventId) => setEventDialog({ open: true, eventId })} />
        <UpcomingTasks onOpen={(task) => setTaskDialog({ open: true, task })} />
      </div>

      <div className="mt-4">
        <TimeByCategory stats={stats.data} loading={stats.isPending} />
      </div>

      <EventDialog
        open={eventDialog.open}
        eventId={eventDialog.eventId}
        onClose={() => setEventDialog((d) => ({ ...d, open: false }))}
      />
      <TaskDialog open={taskDialog.open} task={taskDialog.task} onClose={() => setTaskDialog((d) => ({ ...d, open: false }))} />
    </>
  )
}

function StatTiles({ stats }) {
  const scheduled = stats ? Object.values(stats.minutes_by_category).reduce((a, b) => a + b, 0) : null
  const tiles = [
    { label: 'Scheduled this week', value: scheduled === null ? '–' : minutesToHours(scheduled), icon: Clock, to: '/calendar' },
    {
      label: 'Conflicts this week',
      value: stats?.conflicts ?? '–',
      icon: AlertTriangle,
      to: '/conflicts',
      tone: stats?.conflicts ? 'warning' : null,
      note: stats?.conflicts ? 'Needs a look' : stats ? 'All clear' : null,
    },
    {
      label: 'Overdue tasks',
      value: stats?.tasks.overdue ?? '–',
      icon: CheckSquare,
      to: '/tasks',
      tone: stats?.tasks.overdue ? 'danger' : null,
      note: stats?.tasks.overdue ? 'Past due' : null,
    },
    { label: 'Due this week', value: stats?.tasks.due_in_range ?? '–', icon: ListTodo, to: '/tasks' },
  ]

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ label, value, icon: Icon, to, tone, note }) => (
        <li key={label}>
          <Link
            to={to}
            className={cx(
              'block rounded-xl border bg-surface p-4 hover:bg-surface-2',
              tone === 'warning' ? 'border-warning/50' : tone === 'danger' ? 'border-danger/50' : 'border-line',
            )}
          >
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Icon className="size-3.5" aria-hidden />
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            {note && (
              <p className={cx('text-xs font-medium', tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-success')}>
                {note}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function TodayAgenda({ range, now, onOpen }) {
  const calendar = useCalendar(range)

  return (
    <Card
      title="Today"
      action={
        <Link to="/calendar" className="text-xs font-medium text-accent hover:underline">
          Open calendar
        </Link>
      }
    >
      {calendar.isPending ? (
        <Spinner />
      ) : calendar.isError ? (
        <Alert>Couldn't load today's schedule.</Alert>
      ) : !calendar.data.length ? (
        <EmptyState icon={CalendarDays} title="Nothing scheduled today">
          A free day. Add a study block or some recovery?
        </EmptyState>
      ) : (
        <ol className="space-y-1">
          {calendar.data.map((o) => {
            const past = new Date(o.ends_at) < now
            return (
              <li key={`${o.event_id}@${o.starts_at}`}>
                <button
                  type="button"
                  onClick={() => onOpen(o.event_id)}
                  className={cx('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2', past && 'opacity-60')}
                >
                  <span className="w-32 shrink-0 text-xs tabular-nums text-muted">
                    {o.all_day ? 'All day' : `${formatTime(o.starts_at)}–${formatTime(o.ends_at)}`}
                  </span>
                  <CategoryDot category={o.category} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{o.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {categoryLabel(o.category)}
                      {o.location ? ` · ${o.location}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

function UpcomingTasks({ onOpen }) {
  const tasks = useTasks('open')

  return (
    <Card
      title="Up next"
      action={
        <Link to="/tasks" className="text-xs font-medium text-accent hover:underline">
          All tasks
        </Link>
      }
    >
      {tasks.isPending ? (
        <Spinner />
      ) : tasks.isError ? (
        <Alert>Couldn't load your tasks.</Alert>
      ) : !tasks.data.length ? (
        <EmptyState icon={CheckSquare} title="No open tasks">
          Add assignments and deadlines to see them here.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.data.slice(0, 6).map((task) => (
            <TaskRow key={task.id} task={task} onOpen={onOpen} compact />
          ))}
        </ul>
      )}
    </Card>
  )
}

/**
 * Hours per category this week. One measure across categories: horizontal
 * bars sorted by size, each directly labelled (name on the axis, value at
 * the bar end), so identity never relies on color alone.
 */
function TimeByCategory({ stats, loading }) {
  const rows = useMemo(() => {
    if (!stats) return []
    return CATEGORIES.map((c) => ({ ...c, minutes: stats.minutes_by_category[c.value] ?? 0 }))
      .filter((r) => r.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .map((r) => ({ ...r, hours: r.minutes / 60 }))
  }, [stats])

  const totals = useMemo(() => {
    const sum = (group) => rows.filter((r) => r.group === group).reduce((a, r) => a + r.minutes, 0)
    return { academic: sum('academic'), athletic: sum('athletic'), personal: sum('personal') }
  }, [rows])

  return (
    <Card title="Time by category this week">
      {loading ? (
        <Spinner />
      ) : !rows.length ? (
        <EmptyState icon={Clock} title="No scheduled time this week">
          Add classes, practices and study blocks to see where your week goes.
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">
            Academic <span className="font-medium text-text">{minutesToHours(totals.academic)}</span> · Athletic{' '}
            <span className="font-medium text-text">{minutesToHours(totals.athletic)}</span> · Personal{' '}
            <span className="font-medium text-text">{minutesToHours(totals.personal)}</span>
          </p>
          <div style={{ height: rows.length * 40 + 24 }} role="img" aria-label={rows.map((r) => `${r.label} ${minutesToHours(r.minutes)}`).join(', ')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="2 4" />
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip />} />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.value} fill={`var(--cat-${r.value})`} />
                  ))}
                  <LabelList
                    dataKey="minutes"
                    position="right"
                    formatter={(m) => minutesToHours(m)}
                    style={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="flex items-center gap-1.5 font-medium">
        <CategoryDot category={row.value} className="size-2" />
        {row.label}
      </p>
      <p className="mt-0.5 text-muted">{minutesToHours(row.minutes)} scheduled</p>
    </div>
  )
}
