/*
 * Date helpers for the calendar. Everything is bucketed by the viewer's local day
 * (the plan's APP_TIMEZONE; the browser zone stands in until that env exists).
 * Weeks start on Sunday.
 */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Local-day key, e.g. "2026-11-07". */
export function dayKey(date) {
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function fromDayKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isSameDay(a, b) {
  return dayKey(a) === dayKey(b)
}

/** The weeks (5 or 6, Sunday first) that contain the month. */
export function monthGrid(month) {
  const first = startOfMonth(month)
  const offset = first.getDay()
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const weeks = Math.ceil((offset + daysInMonth) / 7)
  const start = addDays(first, -offset)
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index))
}

/** The same day-of-month in another month, clamped to that month's length. */
export function shiftMonthKeepDay(day, delta) {
  const target = new Date(day.getFullYear(), day.getMonth() + delta, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day.getDate(), last))
  return target
}

export function gridRange(month) {
  const days = monthGrid(month)
  const from = startOfDay(days[0])
  const to = addDays(startOfDay(days[days.length - 1]), 1)
  to.setMilliseconds(-1)
  return { from, to }
}

/**
 * Every local day an event touches. An event ending exactly at 00:00 does not
 * spill into that next day.
 */
export function eventDayKeys(event) {
  // Tasks sit on their deadline day only (plan A2); starts_at is just when they were created.
  if (event.type === 'task' || event.type === 'followup') return event.deadline ? [dayKey(event.deadline)] : []
  const start = new Date(event.startsAt)
  let end = new Date(event.endsAt ?? event.startsAt)
  if (Number.isNaN(start.getTime())) return []
  if (Number.isNaN(end.getTime()) || end < start) end = start
  if (end > start && end.getTime() === startOfDay(end).getTime()) end = new Date(end.getTime() - 1)
  const keys = []
  let cursor = startOfDay(start)
  const last = startOfDay(end)
  while (cursor <= last && keys.length < 400) {
    keys.push(dayKey(cursor))
    cursor = addDays(cursor, 1)
  }
  return keys
}

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const fullDateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
const dayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const shortDateTime = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export const formatMonth = (date) => monthFormat.format(date)
export const formatFullDate = (date) => fullDateFormat.format(date)
export const formatDayLong = (date) => dayLongFormat.format(date)
export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '—')
export const formatTime = (value) => (value ? timeFormat.format(new Date(value)) : '')
export const formatDateTime = (value) => (value ? shortDateTime.format(new Date(value)) : '—')

/** "9:00 – 10:30", or a date span when the event crosses days. */
export function formatSpan(startsAt, endsAt) {
  if (!startsAt) return ''
  if (!endsAt || startsAt === endsAt) return formatDateTime(startsAt)
  if (isSameDay(startsAt, endsAt)) return `${formatTime(startsAt)} – ${formatTime(endsAt)}`
  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatRelative(value, now = new Date()) {
  if (!value) return ''
  const diff = new Date(value).getTime() - now.getTime()
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 7) return relative.format(days, 'day')
  return formatDate(value)
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** A sensible default start for a new event on `day`: the next full hour today, 10:00 otherwise. */
export function defaultStartFor(day) {
  const now = new Date()
  if (isSameDay(day, now)) {
    const next = new Date(now)
    next.setMinutes(0, 0, 0)
    next.setHours(next.getHours() + 1)
    return next
  }
  const start = startOfDay(day)
  start.setHours(10)
  return start
}

/** End-of-working-day deadline (18:00) on `day`, or the next hour if that has passed. */
export function defaultDeadlineFor(day) {
  const deadline = startOfDay(day)
  deadline.setHours(18)
  return deadline > new Date() ? deadline : defaultStartFor(new Date())
}

export function minutesBetween(startsAt, endsAt) {
  if (!startsAt || !endsAt) return 60
  return Math.max(0, Math.round((new Date(endsAt) - new Date(startsAt)) / 60000))
}
