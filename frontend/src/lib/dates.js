import { addDays, format, isSameDay, startOfDay, startOfWeek } from 'date-fns'

/** Weeks start on Monday, matching a typical class timetable. */
export const WEEK_STARTS_ON = 1

/** 12-hour clock, matching the calendar's own labels. */
const TIME = 'h:mm a'

export function weekRange(date = new Date()) {
  const from = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })
  return { from, to: addDays(from, 7) }
}

export function dayRange(date = new Date()) {
  const from = startOfDay(date)
  return { from, to: addDays(from, 1) }
}

/** Query-string params for the API's [from, to) range endpoints. */
export const rangeParams = ({ from, to }) => ({ from: from.toISOString(), to: to.toISOString() })

/** "Mon 2 Nov, 9:00 AM – 10:30 AM" (or "Mon 2 Nov, all day"). */
export function formatSpan(startsAt, endsAt, allDay = false) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (allDay) return `${format(start, 'EEE d MMM')}, all day`
  const endFormat = isSameDay(start, end) ? TIME : `EEE d MMM, ${TIME}`
  return `${format(start, `EEE d MMM, ${TIME}`)} – ${format(end, endFormat)}`
}

export function formatTime(date) {
  return format(new Date(date), TIME)
}

/** Value for <input type="datetime-local"> in the browser's timezone. */
export const toLocalInput = (date) => format(new Date(date), "yyyy-MM-dd'T'HH:mm")

/** Value for <input type="date">. */
export const toDateInput = (date) => format(new Date(date), 'yyyy-MM-dd')

/** The browser's IANA timezone, e.g. "Asia/Manila". */
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function minutesToHours(minutes) {
  const h = minutes / 60
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}
