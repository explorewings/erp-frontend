import { useId } from 'react'
import { LuCalendarClock, LuCircleSlash, LuFlag, LuHourglass, LuMessageSquareText, LuPause, LuUndo2, LuUserPen, LuUserRound } from 'react-icons/lu'
import {
  AssigneeSelect,
  DateTimeInput,
  Field,
  TextArea,
  TextInput,
  fieldClass,
  fieldStyle,
  personName,
} from '../../../components/form-controls.jsx'
import { defaultDeadlineFor, formatDateTime, fromLocalInput, toLocalInput } from '../../../lib/dates.js'

/*
 * Task: delegated work with a deadline, a priority and one assignee (plan §1).
 * Staff can only assign to themselves; the picker hides when there is no choice.
 */

export const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
]
const priorityLabel = (id) => PRIORITIES.find((item) => item.id === id)?.label ?? 'Medium'

export function initialTaskForm(day, viewer) {
  return {
    title: '',
    description: '',
    deadline: toLocalInput(defaultDeadlineFor(day)),
    assigneeId: viewer?.id ?? '',
    priority: 'medium',
  }
}

export function taskFormFromEvent(event) {
  return {
    title: event.title,
    description: event.description,
    deadline: toLocalInput(event.deadline),
    assigneeId: event.assignee?.id ?? '',
    priority: event.priority ?? 'medium',
  }
}

const sameMinute = (a, b) => toLocalInput(a) === toLocalInput(b)

export function validateTask(form, { event } = {}) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Give the task a title.'
  if (!form.assigneeId) errors.assigneeId = 'Choose who will do it.'
  const deadline = fromLocalInput(form.deadline)
  if (!deadline) errors.deadline = 'Set a deadline.'
  else if ((!event || !sameMinute(deadline, event.deadline)) && new Date(deadline) <= new Date()) {
    errors.deadline = 'The deadline must be in the future.'
  }
  return errors
}

/** Create: the full task. Edit: only what changed (the server handles status effects). */
export function taskPayload(form, { event } = {}) {
  const values = {
    title: form.title.trim(),
    description: form.description.trim(),
    deadline: fromLocalInput(form.deadline),
    assigneeId: form.assigneeId,
    priority: form.priority,
  }
  if (!event) return { type: 'task', ...values, description: values.description || undefined }
  const changes = {}
  if (values.title !== event.title) changes.title = values.title
  if (values.description !== (event.description ?? '')) changes.description = values.description || null
  if (!sameMinute(values.deadline, event.deadline)) changes.deadline = values.deadline
  if (values.assigneeId !== event.assignee?.id) changes.assigneeId = values.assigneeId
  if (values.priority !== event.priority) changes.priority = values.priority
  return changes
}

export default function TaskForm({ form, onChange, errors = {}, assignees, viewer, disabled }) {
  const id = useId()
  const set = (name) => (value) => onChange((current) => ({ ...current, [name]: value }))
  const onlySelf = assignees.length <= 1

  return (
    <>
      <Field label="Title" required htmlFor={`${id}-title`} error={errors.title}>
        <TextInput
          id={`${id}-title`}
          value={form.title}
          onChange={set('title')}
          maxLength={200}
          autoFocus
          disabled={disabled}
          placeholder="What needs doing?"
        />
      </Field>
      <Field
        label="Assign to"
        required
        htmlFor={`${id}-assignee`}
        error={errors.assigneeId}
        hint={onlySelf ? 'You can assign tasks to yourself.' : null}
      >
        {onlySelf ? (
          <p className="mt-1.5 flex h-11 items-center rounded-xs border border-line bg-ground px-3.5 text-body-sm text-ink">
            {personName(assignees[0], viewer?.id)}
          </p>
        ) : (
          <AssigneeSelect
            id={`${id}-assignee`}
            value={form.assigneeId}
            onChange={set('assigneeId')}
            options={assignees}
            viewerId={viewer?.id}
            disabled={disabled}
          />
        )}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label="Deadline" required htmlFor={`${id}-deadline`} error={errors.deadline}>
          <DateTimeInput id={`${id}-deadline`} value={form.deadline} onChange={set('deadline')} disabled={disabled} />
        </Field>
        <Field label="Priority" required htmlFor={`${id}-priority`}>
          <select
            id={`${id}-priority`}
            className={fieldClass}
            style={fieldStyle}
            value={form.priority}
            disabled={disabled}
            onChange={(event) => set('priority')(event.target.value)}
          >
            {PRIORITIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Details" htmlFor={`${id}-description`}>
        <TextArea
          id={`${id}-description`}
          value={form.description}
          onChange={set('description')}
          maxLength={5000}
          rows={5}
          disabled={disabled}
          placeholder="Context, links, what done looks like"
        />
      </Field>
    </>
  )
}

/** Icon rows on the schedule card. */
export function taskCardRows(event, viewerId) {
  const rows = [
    // The assignee already knows it's theirs; show them who handed it over instead.
    event.assignee?.id === viewerId && event.createdBy?.id !== viewerId
      ? { icon: LuUserPen, text: `From ${personName(event.createdBy, viewerId)}` }
      : { icon: LuUserRound, text: personName(event.assignee, viewerId) },
  ]
  if (event.priority === 'high' || event.priority === 'urgent') {
    rows.push({ icon: LuFlag, text: `${priorityLabel(event.priority)} priority`, tone: event.priority === 'urgent' ? 'danger' : 'accent' })
  }
  if (event.extensionUntil) rows.push({ icon: LuHourglass, text: `More time asked until ${formatDateTime(event.extensionUntil)}`, tone: 'accent' })
  return rows
}

/** One line under the title in the schedule list. */
export function taskSummary(event, viewerId) {
  const urgent = event.priority === 'high' || event.priority === 'urgent' ? `${priorityLabel(event.priority)} · ` : ''
  const asking = event.extensionUntil ? ' · more time requested' : ''
  return `${urgent}Due ${formatDateTime(event.deadline)} · ${personName(event.assignee, viewerId)}${asking}`
}

/** Field tiles for the details drawer. */
export function taskDetails(event, viewerId) {
  const failed = event.effectiveStatus === 'failed'
  const rows = [
    { label: 'Deadline', icon: LuCalendarClock, value: formatDateTime(event.deadline), tone: failed ? 'danger' : undefined },
    {
      label: 'Priority',
      icon: LuFlag,
      value: priorityLabel(event.priority),
      tone: event.priority === 'urgent' ? 'danger' : event.priority === 'high' ? 'accent' : undefined,
    },
    { label: 'Assigned to', icon: LuUserRound, value: personName(event.assignee, viewerId) },
    { label: 'Created by', icon: LuUserPen, value: personName(event.createdBy, viewerId) },
  ]
  if (event.status === 'on_hold') {
    rows.push({ label: 'On hold until', icon: LuPause, value: formatDateTime(event.holdUntil) })
    if (event.holdReason) rows.push({ label: 'Hold reason', icon: LuMessageSquareText, value: event.holdReason, wide: true })
  }
  if (event.extensionUntil) {
    rows.push({ label: 'Reason for more time', icon: LuMessageSquareText, value: event.extensionReason, wide: true })
  }
  if (event.cancelReason) rows.push({ label: 'Cancellation reason', icon: LuCircleSlash, value: event.cancelReason, wide: true })
  if (event.completionRemarks) rows.push({ label: 'Completion notes', icon: LuMessageSquareText, value: event.completionRemarks, wide: true })
  if (event.rejectCount > 0) {
    rows.push({ label: 'Sent back', icon: LuUndo2, value: `${event.rejectCount} ${event.rejectCount === 1 ? 'time' : 'times'}` })
  }
  // Short values pair up two per row; an odd one out spans the row. Wide notes go last.
  const narrow = rows.filter((row) => !row.wide)
  if (narrow.length % 2 === 1) narrow[narrow.length - 1].wide = true
  return [...narrow, ...rows.filter((row) => row.wide && !narrow.includes(row))]
}
