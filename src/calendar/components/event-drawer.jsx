import { useState } from 'react'
import { LuAlignLeft, LuCircleArrowRight, LuHourglass, LuPencil, LuTrash2 } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { deleteCalendarEvent, updateCalendarEvent } from '../api.js'
import { definitionFor } from '../events/events.jsx'
import { EVENT_TYPES } from '../lib/event-meta.js'
import { formatDateTime, formatRelative, fromLocalInput, toLocalInput } from '../lib/dates.js'
import { eventActions } from '../lib/policy.js'
import DrawerShell, { BUTTON, ErrorLine, FieldTile, Panel } from './drawer-shell.jsx'
import { DateTimeInput, Field, TextArea } from './form-controls.jsx'
import { StatusBadge, TypeLabel } from './status-badge.jsx'

const inFuture = (iso) => iso && new Date(iso) > new Date()

function initialValues(action, event) {
  const values = {}
  for (const field of action.fields) {
    if (field.name === 'holdUntil') values.holdUntil = toLocalInput(event.deadline)
    else if (field.name === 'deadline' && action.action === 'approve_extension') {
      values.deadline = toLocalInput(event.extensionUntil)
    } else if (field.name === 'extensionUntil') {
      const base = inFuture(event.deadline) ? new Date(event.deadline) : new Date()
      values.extensionUntil = toLocalInput(new Date(base.getTime() + 86400000))
    } else if (field.kind === 'datetime') {
      values[field.name] = toLocalInput(inFuture(event.deadline) ? event.deadline : new Date(Date.now() + 86400000))
    } else values[field.name] = ''
  }
  return values
}

/** Inline step for an action that needs input or a confirmation. */
function ActionStep({ action, event, busy, onConfirm, onBack }) {
  const [values, setValues] = useState(() => initialValues(action, event))
  const [errors, setErrors] = useState({})

  const submit = (formEvent) => {
    formEvent.preventDefault()
    const nextErrors = {}
    const body = { action: action.action }
    for (const field of action.fields) {
      const raw = values[field.name] ?? ''
      if (field.kind === 'datetime') {
        if (!raw && !field.required) continue
        const iso = fromLocalInput(raw)
        if (!iso) nextErrors[field.name] = 'Set a date and time.'
        else if (!inFuture(iso)) nextErrors[field.name] = 'Choose a time in the future.'
        else if (field.name === 'holdUntil' && new Date(iso) > new Date(event.deadline)) {
          nextErrors[field.name] = 'A hold must end on or before the deadline.'
        } else if (field.name === 'extensionUntil' && new Date(iso) <= new Date(event.deadline)) {
          nextErrors[field.name] = 'Propose a deadline later than the current one.'
        } else body[field.name] = iso
      } else {
        const text = raw.trim()
        if (field.required && !text) nextErrors[field.name] = 'This is required.'
        else if (text) body[field.name] = text
      }
    }
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) onConfirm(body)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {action.confirmText ? <p className="text-body-sm text-ink">{action.confirmText}</p> : null}
      {action.fields.map((field) => (
        <Field
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.hint}
          htmlFor={`action-${field.name}`}
          error={errors[field.name]}
        >
          {field.kind === 'datetime' ? (
            <DateTimeInput
              id={`action-${field.name}`}
              value={values[field.name]}
              onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
              disabled={busy}
            />
          ) : (
            <TextArea
              id={`action-${field.name}`}
              value={values[field.name]}
              onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
              rows={3}
              maxLength={5000}
              autoFocus
              disabled={busy}
            />
          )}
        </Field>
      ))}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onBack} disabled={busy} className={BUTTON.neutral}>
          Back
        </button>
        <button type="submit" disabled={busy} className={action.tone === 'danger' ? BUTTON.dangerSolid : BUTTON.primary}>
          {busy ? <Loader size={1} /> : null}
          {action.label}
        </button>
      </div>
    </form>
  )
}

export default function EventDrawer({ event, viewer, token, users, assignees, onSaved, onDeleted, onClose, notify }) {
  const [mode, setMode] = useState('view')
  const [form, setForm] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [pending, setPending] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const definition = definitionFor(event.type)
  const { Form } = definition
  const permissions = event.permissions
  const actions = eventActions(event)
  const typeLabel = EVENT_TYPES[event.type]?.label ?? 'Event'

  const run = async (work, success) => {
    setBusy(true)
    setError('')
    try {
      await work()
      notify(success)
    } catch (err) {
      if (err.code === 'VERSION_CONFLICT' && err.current) {
        onSaved(err.current)
        setPending(null)
        setMode('view')
      }
      setError(err.status === 404 ? 'This event no longer exists or is no longer visible to you.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const applyAction = (body) =>
    run(async () => {
      const updated = await updateCalendarEvent(token, event.id, { version: event.version, ...body })
      setPending(null)
      onSaved(updated)
    }, `${typeLabel} updated.`)

  const startEdit = () => {
    setForm(definition.formFromEvent(event))
    setFormErrors({})
    setPending(null)
    setError('')
    setMode('edit')
  }

  const saveEdit = (submitEvent) => {
    submitEvent.preventDefault()
    const nextErrors = definition.validate(form, { event })
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const changes = definition.toPayload(form, { event })
    if (!Object.keys(changes).length) {
      setMode('view')
      return
    }
    run(async () => {
      const updated = await updateCalendarEvent(token, event.id, { version: event.version, ...changes })
      onSaved(updated)
      setMode('view')
    }, 'Changes saved.')
  }

  const remove = () =>
    run(async () => {
      await deleteCalendarEvent(token, event.id)
      onDeleted(event.id)
    }, 'Deleted.')

  const firstPrimary = actions.findIndex((item) => item.tone === 'primary')

  return (
    <DrawerShell labelledBy="calendar-event-title" header={<TypeLabel type={event.type} />} closeLabel="Close details" busy={busy} closeOnBack onClose={onClose}>
      {mode === 'edit' ? (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveEdit} aria-busy={busy} noValidate>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            <h2 id="calendar-event-title" className="px-1 text-title font-semibold tracking-[-0.01em] text-ink">
              Edit {typeLabel.toLowerCase()}
            </h2>
            <Panel>
              <div className="space-y-4">
                <Form form={form} onChange={setForm} errors={formErrors} users={users} assignees={assignees} viewer={viewer} disabled={busy} editing />
              </div>
            </Panel>
            {event.type === 'task' && form.assigneeId !== event.assignee?.id ? (
              <p className="px-1 text-meta text-accent-strong">Reassigning sends the task back to Assigned for the new person.</p>
            ) : null}
            {error ? <ErrorLine message={error} /> : null}
          </div>
          <footer className="flex shrink-0 justify-end gap-2 border-t border-line bg-surface px-5 py-4">
            <button type="button" onClick={() => setMode('view')} disabled={busy} className={BUTTON.neutral}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={BUTTON.primary}>
              {busy ? <Loader size={1} /> : null}
              Save changes
            </button>
          </footer>
        </form>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-busy={busy}>
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <p className="text-meta tabular-nums text-muted">
                  {typeLabel} #{event.id} · updated {formatRelative(event.updatedAt)}
                </p>
                <StatusBadge status={event.effectiveStatus} count={event.rejectCount} />
              </div>
              <h2 id="calendar-event-title" className="mt-2 break-words text-title font-semibold leading-snug tracking-[-0.01em] text-ink">
                {event.title}
              </h2>
              {event.extensionUntil ? (
                <p className="mt-3 flex items-start gap-2 rounded-xs border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-meta text-[#9a3412]">
                  <LuHourglass className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    More time requested until <strong className="font-semibold">{formatDateTime(event.extensionUntil)}</strong>
                  </span>
                </p>
              ) : null}
            </Panel>

            <dl className="grid grid-cols-2 gap-3">
              {definition.details(event, viewer?.id).map((row) => (
                <FieldTile key={row.label} label={row.label} icon={row.icon} wide={row.wide} tone={row.tone}>
                  {row.value}
                </FieldTile>
              ))}
            </dl>

            {event.description ? (
              <Panel title="Description" icon={LuAlignLeft}>
                <p className="whitespace-pre-line break-words text-body-sm leading-relaxed text-ink/85">{event.description}</p>
              </Panel>
            ) : null}

            {actions.length ? (
              <Panel title={pending ? pending.heading ?? pending.label : 'Next step'} icon={LuCircleArrowRight}>
                {pending ? (
                  <ActionStep key={pending.action} action={pending} event={event} busy={busy} onBack={() => setPending(null)} onConfirm={applyAction} />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {actions.map((action, index) => (
                      <button
                        key={action.action}
                        type="button"
                        disabled={busy}
                        className={`${BUTTON[action.tone === 'primary' && index !== firstPrimary ? 'neutral' : action.tone]} !h-9 min-w-0 !px-2 !text-label`}
                        title={action.heading ?? action.label}
                        onClick={() => (action.fields.length || action.confirm ? setPending(action) : applyAction({ action: action.action }))}
                      >
                        <span className="truncate">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Panel>
            ) : null}

            {error ? <ErrorLine message={error} /> : null}
          </div>

          {permissions.canEdit || permissions.canDelete ? (
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-5 py-4">
              {confirmDelete ? (
                <>
                  <p className="mr-auto text-body-sm text-ink">Delete for everyone?</p>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className={BUTTON.neutral}>
                    Keep
                  </button>
                  <button type="button" onClick={remove} disabled={busy} className={BUTTON.dangerSolid}>
                    {busy ? <Loader size={1} /> : null}
                    Delete
                  </button>
                </>
              ) : (
                <>
                  {permissions.canEdit ? (
                    <button type="button" onClick={startEdit} disabled={busy} className={BUTTON.neutral}>
                      <LuPencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                  ) : null}
                  {permissions.canDelete ? (
                    <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className={BUTTON.danger}>
                      <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  ) : null}
                </>
              )}
            </footer>
          ) : null}
        </>
      )}
    </DrawerShell>
  )
}
