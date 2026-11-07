import { useId } from 'react'
import { LuClock, LuEye, LuLock, LuMapPin, LuUserRound, LuUsers } from 'react-icons/lu'
import {
  DateTimeInput,
  DurationInput,
  Field,
  MemberPicker,
  TextArea,
  TextInput,
  personName,
} from '../../../components/form-controls.jsx'
import { defaultStartFor, formatSpan, fromLocalInput, minutesBetween, toLocalInput } from '../../../lib/dates.js'

/*
 * Meeting: one time slot, a place or link, invited members of any role, and
 * open/private visibility. Private meetings are visible to the creator and
 * members only, superadmins included (plan D3).
 */

export function initialMeetingForm(day) {
  return {
    title: '',
    description: '',
    startsAt: toLocalInput(defaultStartFor(day)),
    durationMinutes: 30,
    location: '',
    visibility: 'open',
    memberIds: [],
  }
}

export function meetingFormFromEvent(event) {
  return {
    title: event.title,
    description: event.description,
    startsAt: toLocalInput(event.startsAt),
    durationMinutes: minutesBetween(event.startsAt, event.endsAt),
    location: event.location,
    visibility: event.visibility ?? 'open',
    memberIds: event.members.map((member) => member.id),
  }
}

export function validateMeeting(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Give the meeting a title.'
  if (!fromLocalInput(form.startsAt)) errors.startsAt = 'Choose when it starts.'
  if (!form.durationMinutes || form.durationMinutes < 1) errors.durationMinutes = 'Set how long it lasts.'
  if (!form.location.trim()) errors.location = 'Add a room, address, or meeting link.'
  return errors
}

export function meetingPayload(form, { event } = {}) {
  const values = {
    title: form.title.trim(),
    description: form.description.trim(),
    startsAt: fromLocalInput(form.startsAt),
    durationMinutes: form.durationMinutes,
    location: form.location.trim(),
    visibility: form.visibility,
    // Members only matter for a private meeting; an open one is visible to everyone.
    memberIds: form.visibility === 'private' ? form.memberIds : [],
  }
  if (!event) return { type: 'meeting', ...values, description: values.description || undefined }
  const changes = {}
  if (values.title !== event.title) changes.title = values.title
  if (values.description !== event.description) changes.description = values.description || null
  if (toLocalInput(values.startsAt) !== toLocalInput(event.startsAt)) changes.startsAt = values.startsAt
  if (values.durationMinutes !== minutesBetween(event.startsAt, event.endsAt)) changes.durationMinutes = values.durationMinutes
  if (values.location !== event.location) changes.location = values.location
  if (values.visibility !== event.visibility) changes.visibility = values.visibility
  const before = event.members.map((member) => member.id).sort().join()
  if ([...values.memberIds].sort().join() !== before) changes.memberIds = values.memberIds
  return changes
}

const VISIBILITY = [
  { id: 'open', label: 'Open', hint: 'Everyone in the console can see it.' },
  { id: 'private', label: 'Private', hint: 'Only you and invited people can see it.' },
]

export default function MeetingForm({ form, onChange, errors = {}, users, viewer, disabled }) {
  const id = useId()
  const set = (name) => (value) => onChange((current) => ({ ...current, [name]: value }))

  return (
    <>
      <Field label="Title" required htmlFor={`${id}-title`} error={errors.title}>
        <TextInput id={`${id}-title`} value={form.title} onChange={set('title')} maxLength={200} autoFocus disabled={disabled} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Starts" required htmlFor={`${id}-start`} error={errors.startsAt}>
          <DateTimeInput id={`${id}-start`} value={form.startsAt} onChange={set('startsAt')} disabled={disabled} />
        </Field>
        <Field label="Duration" required htmlFor={`${id}-duration`} error={errors.durationMinutes}>
          <DurationInput id={`${id}-duration`} minutes={form.durationMinutes} onChange={set('durationMinutes')} disabled={disabled} />
        </Field>
      </div>
      <Field label="Where" required htmlFor={`${id}-location`} error={errors.location}>
        <TextInput
          id={`${id}-location`}
          value={form.location}
          onChange={set('location')}
          maxLength={200}
          disabled={disabled}
          placeholder="Room, address, or meeting link"
        />
      </Field>
      <Field label="Who can see it" required hint={VISIBILITY.find((item) => item.id === form.visibility)?.hint}>
        <div role="radiogroup" aria-label="Who can see it" className="mt-1.5 inline-flex rounded-lg border border-line bg-surface p-1">
          {VISIBILITY.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={form.visibility === item.id}
              disabled={disabled}
              onClick={() => set('visibility')(item.id)}
              className={`rounded-xs px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${
                form.visibility === item.id ? 'bg-[#cc785c] text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Field>
      {form.visibility === 'private' ? (
        <Field label="Invite" hint="You are always included.">
          <MemberPicker
            users={users}
            value={form.memberIds}
            onChange={set('memberIds')}
            viewerId={viewer?.id}
            disabled={disabled}
          />
        </Field>
      ) : null}
      <Field label="Agenda" htmlFor={`${id}-description`}>
        <TextArea id={`${id}-description`} value={form.description} onChange={set('description')} maxLength={5000} rows={3} disabled={disabled} />
      </Field>
    </>
  )
}

export function meetingCardRows(event) {
  const rows = [{ icon: LuClock, text: formatSpan(event.startsAt, event.endsAt) }]
  if (event.location) rows.push({ icon: LuMapPin, text: event.location })
  if (event.visibility === 'private') {
    rows.push({ icon: LuLock, text: `Private · ${event.members.length + 1} ${event.members.length ? 'people' : 'person'}` })
  }
  return rows
}

export function meetingSummary(event) {
  const count = event.visibility === 'private' ? event.members.length : 0
  return `${formatSpan(event.startsAt, event.endsAt)}${count ? ` · ${count + 1} people` : ''}`
}

const isLink = (value) => /^https?:\/\//i.test(value ?? '')

export function meetingDetails(event, viewerId) {
  const host = event.createdBy
  const rows = [
    { label: 'When', icon: LuClock, value: formatSpan(event.startsAt, event.endsAt), wide: true },
    {
      label: 'Where',
      icon: LuMapPin,
      wide: true,
      value: isLink(event.location) ? (
        <a href={event.location} target="_blank" rel="noreferrer" className="break-all text-accent-strong underline underline-offset-2 hover:text-ink">
          {event.location}
        </a>
      ) : (
        event.location || '—'
      ),
    },
    { label: 'Host', icon: LuUserRound, value: personName(host, viewerId) },
    { label: 'Visibility', icon: LuEye, value: event.visibility === 'private' ? 'Private' : 'Open to everyone' },
  ]
  if (event.visibility === 'private') {
    rows.push({
      label: 'Invited',
      icon: LuUsers,
      wide: true,
      value: event.members.length ? event.members.map((member) => personName(member, viewerId)).join(', ') : 'No one else yet',
    })
  }
  return rows
}
