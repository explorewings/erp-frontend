import { useId } from 'react'
import { LuClock, LuMegaphone, LuUserRound } from 'react-icons/lu'
import { DateTimeInput, DurationInput, Field, TextArea, TextInput, personName } from '../../../components/form-controls.jsx'
import { defaultStartFor, formatSpan, fromLocalInput, minutesBetween, toLocalInput } from '../../../lib/dates.js'

/*
 * Announcement: a notice to everyone, shown on every day it runs.
 * Duration can span days; only the end time is stored.
 */

export function initialAnnouncementForm(day) {
  return {
    title: '',
    description: '',
    startsAt: toLocalInput(defaultStartFor(day)),
    durationMinutes: 1440,
  }
}

export function announcementFormFromEvent(event) {
  return {
    title: event.title,
    description: event.description,
    startsAt: toLocalInput(event.startsAt),
    durationMinutes: minutesBetween(event.startsAt, event.endsAt),
  }
}

export function validateAnnouncement(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Give the announcement a title.'
  if (!form.description.trim()) errors.description = 'Write the announcement itself.'
  if (!fromLocalInput(form.startsAt)) errors.startsAt = 'Choose when it starts.'
  if (!form.durationMinutes || form.durationMinutes < 1) errors.durationMinutes = 'Set how long it runs.'
  return errors
}

export function announcementPayload(form, { event } = {}) {
  const values = {
    title: form.title.trim(),
    description: form.description.trim(),
    startsAt: fromLocalInput(form.startsAt),
    durationMinutes: form.durationMinutes,
  }
  if (!event) return { type: 'announcement', ...values }
  const changes = {}
  if (values.title !== event.title) changes.title = values.title
  if (values.description !== event.description) changes.description = values.description
  if (toLocalInput(values.startsAt) !== toLocalInput(event.startsAt)) changes.startsAt = values.startsAt
  if (values.durationMinutes !== minutesBetween(event.startsAt, event.endsAt)) changes.durationMinutes = values.durationMinutes
  return changes
}

export default function AnnouncementForm({ form, onChange, errors = {}, disabled }) {
  const id = useId()
  const set = (name) => (value) => onChange((current) => ({ ...current, [name]: value }))

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
        />
      </Field>
      <Field label="Announcement" required htmlFor={`${id}-description`} error={errors.description}>
        <TextArea
          id={`${id}-description`}
          value={form.description}
          onChange={set('description')}
          maxLength={5000}
          rows={5}
          disabled={disabled}
          placeholder="What everyone needs to know"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Starts" required htmlFor={`${id}-start`} error={errors.startsAt}>
          <DateTimeInput id={`${id}-start`} value={form.startsAt} onChange={set('startsAt')} disabled={disabled} />
        </Field>
        <Field label="Runs for" required htmlFor={`${id}-duration`} error={errors.durationMinutes}>
          <DurationInput
            id={`${id}-duration`}
            minutes={form.durationMinutes}
            onChange={set('durationMinutes')}
            disabled={disabled}
          />
        </Field>
      </div>
      <p className="text-meta text-muted">Everyone in the console will see this on each day it runs.</p>
    </>
  )
}

export function announcementCardRows(event, viewerId) {
  return [
    { icon: LuClock, text: formatSpan(event.startsAt, event.endsAt) },
    { icon: LuMegaphone, text: `Everyone · from ${personName(event.createdBy, viewerId)}` },
  ]
}

export function announcementSummary(event) {
  return formatSpan(event.startsAt, event.endsAt)
}

export function announcementDetails(event, viewerId) {
  return [
    { label: 'Runs', icon: LuClock, value: formatSpan(event.startsAt, event.endsAt), wide: true },
    { label: 'Audience', icon: LuMegaphone, value: 'Everyone' },
    { label: 'Posted by', icon: LuUserRound, value: personName(event.createdBy, viewerId) },
  ]
}
