/**
 * Report dates are plain `YYYY-MM-DD` values with no time or zone: a report is
 * filed "for" a calendar day, so every conversion stays in local time on purpose.
 * Formatting must go through `new Date(\`${value}T00:00:00\`)` (local midnight),
 * never `new Date(value)`, which parses as UTC and can render the previous day.
 */

/** Local `YYYY-MM-DD` for a date (defaults to now). */
export function toIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayIso() {
  return toIsoDate()
}

/** Parse a `YYYY-MM-DD` value as local midnight. */
export function parseIsoDate(value) {
  return new Date(`${value}T00:00:00`)
}

/** Short form, e.g. "11 Nov 2026" — table rows and headings. */
export function formatDateShort(value) {
  if (!value) return ''
  return parseIsoDate(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Long form, e.g. "11 November 2026" — detail panels. */
export function formatDateLong(value) {
  if (!value) return ''
  return parseIsoDate(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
