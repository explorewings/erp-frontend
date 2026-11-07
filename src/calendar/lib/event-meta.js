/*
 * Labels and colour tones for event types and statuses. Type colours identify the
 * kind of event on the grid; status tones follow the design system's semantic rules
 * (green = done, red = failed/overdue, orange = waiting on someone, muted = inactive).
 */

export const EVENT_TYPES = {
  task: { label: 'Task', plural: 'Tasks', color: '#cc785c' },
  meeting: { label: 'Meeting', plural: 'Meetings', color: '#47637d' },
  announcement: { label: 'Announcement', plural: 'Announcements', color: '#8a6d1f' },
  followup: { label: 'Follow-up', plural: 'Follow-ups', color: '#5f5b55' },
}

const TONES = {
  neutral: { text: '#5f5b55', bg: '#f4f3f1', border: '#e7e5e1' },
  active: { text: '#26241f', bg: '#ffffff', border: '#9d978e' },
  waiting: { text: '#9a3412', bg: '#fff7ed', border: '#fed7aa' },
  success: { text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  danger: { text: '#b91c1c', bg: '#fef2f1', border: '#fecaca' },
  live: { text: '#ffffff', bg: '#cc785c', border: '#cc785c' },
}

const STATUS = {
  assigned: { label: 'Assigned', tone: 'neutral' },
  progress: { label: 'In progress', tone: 'active' },
  on_review: { label: 'In review', tone: 'waiting' },
  on_hold: { label: 'On hold', tone: 'waiting' },
  request_cancelation: { label: 'Cancel requested', tone: 'waiting' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  overdue: { label: 'Overdue', tone: 'danger' },
  failed: { label: 'Failed', tone: 'danger' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  live: { label: 'Live now', tone: 'live' },
  ended: { label: 'Ended', tone: 'neutral' },
}

export function statusMeta(status) {
  const meta = STATUS[status] ?? { label: status ?? 'Unknown', tone: 'neutral' }
  return { ...meta, colors: TONES[meta.tone] }
}

/** Statuses after which nothing more happens to the event. */
export const DONE_STATUSES = new Set(['completed', 'cancelled', 'ended'])
