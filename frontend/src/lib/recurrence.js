import { format } from 'date-fns'

/*
 * Converts between the event form's "Repeat" controls and an RFC 5545
 * RRULE string, the format the API stores. Rules the form can't represent
 * (e.g. INTERVAL=2) round-trip untouched as { freq: 'custom', raw }.
 */

export const WEEKDAYS = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' },
]

/** JS getDay() (0 = Sunday) to RRULE weekday. */
export const weekdayOf = (date) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][new Date(date).getDay()]

export const NO_REPEAT = { freq: 'none', days: [], ends: 'never', until: '', count: 10 }

export function toRRule(repeat) {
  if (repeat.freq === 'none') return null
  if (repeat.freq === 'custom') return repeat.raw

  const parts = [`FREQ=${repeat.freq}`]
  if (repeat.freq === 'WEEKLY' && repeat.days.length) {
    const order = WEEKDAYS.map((d) => d.value)
    parts.push(`BYDAY=${[...repeat.days].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(',')}`)
  }
  if (repeat.ends === 'until' && repeat.until) {
    // Through the end of that day in the browser's timezone, as UTC.
    const end = new Date(`${repeat.until}T23:59:59`)
    parts.push(`UNTIL=${end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)
  }
  if (repeat.ends === 'count') parts.push(`COUNT=${Math.max(1, Number(repeat.count) || 1)}`)
  return parts.join(';')
}

export function fromRRule(rrule) {
  if (!rrule) return { ...NO_REPEAT }

  const parts = Object.fromEntries(rrule.split(';').map((p) => p.split('=')))
  const known = new Set(['FREQ', 'BYDAY', 'UNTIL', 'COUNT'])
  const simpleDays = !parts.BYDAY || /^(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*$/.test(parts.BYDAY)
  const representable =
    Object.keys(parts).every((k) => known.has(k)) &&
    ['DAILY', 'WEEKLY', 'MONTHLY'].includes(parts.FREQ) &&
    simpleDays &&
    (parts.FREQ === 'WEEKLY' || !parts.BYDAY)

  if (!representable) return { ...NO_REPEAT, freq: 'custom', raw: rrule }

  const repeat = { ...NO_REPEAT, freq: parts.FREQ, days: parts.BYDAY ? parts.BYDAY.split(',') : [] }
  if (parts.UNTIL) {
    const m = parts.UNTIL.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/)
    if (m) {
      const until = m[4] ? new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6])) : new Date(m[1], m[2] - 1, m[3])
      Object.assign(repeat, { ends: 'until', until: format(until, 'yyyy-MM-dd') })
    }
  } else if (parts.COUNT) {
    Object.assign(repeat, { ends: 'count', count: Number(parts.COUNT) })
  }
  return repeat
}

/** "Every week on Mon, Wed until 12 Dec" — for lists and summaries. */
export function describeRRule(rrule) {
  const repeat = fromRRule(rrule)
  if (repeat.freq === 'none') return 'Does not repeat'
  if (repeat.freq === 'custom') return `Custom: ${repeat.raw}`

  let text = { DAILY: 'Every day', WEEKLY: 'Every week', MONTHLY: 'Every month' }[repeat.freq]
  if (repeat.freq === 'WEEKLY' && repeat.days.length) {
    text += ` on ${repeat.days.map((d) => WEEKDAYS.find((w) => w.value === d).label).join(', ')}`
  }
  if (repeat.ends === 'until') text += ` until ${format(new Date(`${repeat.until}T00:00`), 'd MMM yyyy')}`
  if (repeat.ends === 'count') text += `, ${repeat.count} times`
  return text
}
