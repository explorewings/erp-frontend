import { useState } from 'react'
import Loader from '../../appcomponents/loader.jsx'
import { createCalendarEvent } from '../api.js'
import { definitionFor } from '../events/events.jsx'
import DrawerShell, { BUTTON, ErrorLine, Panel } from './drawer-shell.jsx'
import { TypeLabel } from './status-badge.jsx'

/**
 * Create any event type in the right-side drawer. The form, defaults, checks and
 * payload come from the type registry (events/events.jsx); the server re-checks all of it.
 */
export default function AddEventDrawer({ type, day, token, viewer, users, assignees, onCreated, onClose }) {
  const definition = definitionFor(type)
  const { Form } = definition
  const [form, setForm] = useState(() => definition.initialForm(day, viewer))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const titleId = `add-${type}-title`

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = definition.validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    setError('')
    try {
      onCreated(await createCalendarEvent(token, definition.toPayload(form)))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <DrawerShell
      labelledBy={titleId}
      header={<TypeLabel type={type} />}
      closeLabel={`Close ${definition.createTitle.toLowerCase()}`}
      busy={busy}
      closeOnBack
      onClose={onClose}
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} aria-busy={busy} noValidate>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          <h2 id={titleId} className="px-1 text-title font-semibold tracking-[-0.01em] text-ink">
            {definition.createTitle}
          </h2>
          <Panel>
            <div className="space-y-4">
              <Form form={form} onChange={setForm} errors={errors} users={users} assignees={assignees} viewer={viewer} disabled={busy} />
            </div>
          </Panel>
          {error ? <ErrorLine message={error} /> : null}
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-line bg-surface px-5 py-4">
          <button type="button" onClick={onClose} disabled={busy} className={BUTTON.neutral}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={BUTTON.primary}>
            {busy ? <Loader size={1} /> : null}
            {busy ? 'Creating…' : definition.createLabel}
          </button>
        </footer>
      </form>
    </DrawerShell>
  )
}
