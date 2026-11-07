/*
 * Presentation for server permissions. The backend decides what each viewer may
 * do (`event.permissions`); this file only attaches labels, tones and input
 * hints to the actions it sends. It never decides who may do what.
 */

export const isSuperRole = (role) => role === 'superadmin' || role === 'superuser'
export const isAdminRole = (role) => role === 'admin'
export const isStaffRole = (role) => !isSuperRole(role) && !isAdminRole(role)

const ACTIONS = {
  start: { label: 'Start work', tone: 'primary' },
  submit: { label: 'Submit', heading: 'Submit for review', tone: 'primary' },
  complete: { label: 'Complete', heading: 'Mark complete', tone: 'primary' },
  approve: { label: 'Approve', tone: 'primary' },
  reject: { label: 'Send back', tone: 'neutral' },
  hold: { label: 'Hold', heading: 'Put on hold', tone: 'neutral' },
  resume: { label: 'Lift hold', tone: 'primary' },
  request_cancel: { label: 'Ask to cancel', heading: 'Ask to cancel the task', tone: 'neutral' },
  approve_cancel: { label: 'Allow cancel', heading: 'Approve the cancellation', tone: 'danger' },
  decline_cancel: { label: 'Decline', tone: 'neutral' },
  withdraw_cancel: { label: 'Withdraw', heading: 'Withdraw the cancel request', tone: 'neutral' },
  cancel: {
    label: 'Cancel task',
    heading: 'Cancel the task',
    tone: 'danger',
    confirm: true,
    confirmText: 'Cancel this task? Only a superadmin can reopen it.',
  },
  extend: { label: 'Extend', heading: 'Extend the deadline', tone: 'primary' },
  reopen: { label: 'Reopen', tone: 'neutral' },
  request_extension: { label: 'More time', heading: 'Ask for more time', tone: 'neutral' },
  approve_extension: { label: 'Approve', heading: 'Approve the new deadline', tone: 'primary' },
  decline_extension: { label: 'Decline', tone: 'neutral' },
  withdraw_extension: { label: 'Withdraw', heading: 'Withdraw the request for more time', tone: 'neutral' },
  cancel_event: {
    label: 'Cancel event',
    tone: 'danger',
    confirm: true,
    confirmText: 'Cancel this event? It stays on the calendar, marked as cancelled.',
  },
}

const FIELDS = {
  holdReason: { label: 'Why is it on hold?', kind: 'text' },
  holdUntil: { label: 'Hold until', kind: 'datetime', hint: 'On or before the deadline.' },
  cancelReason: { label: 'Reason', kind: 'text' },
  completionRemarks: { label: 'Completion notes', kind: 'text' },
  note: { label: 'Note', kind: 'text' },
  deadline: { label: 'New deadline', kind: 'datetime' },
  extensionUntil: { label: 'Proposed deadline', kind: 'datetime', hint: 'Later than the current deadline.' },
  extensionReason: { label: 'Why do you need more time?', kind: 'text' },
}

/**
 * Server actions enriched for display: [{ action, to, label, heading, tone, fields }].
 * `label` is the short button text (must fit a third of the drawer); `heading` titles the step once opened.
 */
export function eventActions(event) {
  const deadlinePassed = event.deadline && new Date(event.deadline) <= new Date()
  const failed = event.effectiveStatus === 'failed'
  // Destructive steps (cancel) always sit last in the row.
  const ordered = [...(event.permissions?.actions ?? [])].sort(
    (a, b) => (ACTIONS[a.action]?.tone === 'danger') - (ACTIONS[b.action]?.tone === 'danger'),
  )
  return ordered.map((item) => ({
    ...item,
    ...(ACTIONS[item.action] ?? { label: item.action, tone: 'neutral' }),
    ...(failed && item.action === 'request_extension' ? { tone: 'primary' } : {}),
    fields: Object.entries(item.fields ?? {}).map(([name, rule]) => ({
      name,
      // Reopening needs a new deadline only when the old one has passed (server enforces it too).
      required: rule === 'required' || (item.action === 'reopen' && name === 'deadline' && deadlinePassed),
      ...(FIELDS[name] ?? { label: name, kind: 'text' }),
    })),
  }))
}

/** Which event types the "Add event" menu offers. The server enforces the same rule. */
export function creatableTypes(viewer) {
  const role = viewer?.role
  return {
    task: true,
    meeting: true,
    announcement: isSuperRole(role) || isAdminRole(role),
    followup: false,
  }
}

/**
 * Who a task can be assigned to (plan §0): superadmin → any non-superadmin or
 * self; admin → staff or self; staff → self only. The server re-checks.
 */
export function assignableUsers(viewer, users) {
  const role = viewer?.role
  const others = users.filter((user) => user.id !== viewer?.id)
  let allowed = []
  if (isSuperRole(role)) allowed = others.filter((user) => !isSuperRole(user.role))
  else if (isAdminRole(role)) allowed = others.filter((user) => isStaffRole(user.role))
  const self = users.find((user) => user.id === viewer?.id) ?? {
    id: viewer?.id,
    username: viewer?.username,
    email: viewer?.email,
    role,
  }
  return [self, ...allowed].filter((user) => user?.id)
}
