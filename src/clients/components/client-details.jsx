import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuPlus, LuPencil, LuTrash2, LuX } from 'react-icons/lu'
import { updateClient } from '../api.js'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ClientDetails({
  client,
  token,
  onClose,
  onDelete,
  onUpdated,
  onNotify,
  canDelete = false,
}) {
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '' })
  const [customFields, setCustomFields] = useState([])
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  onCloseRef.current = onClose

  useEffect(() => {
    setEditing(false)
    setEditError('')
  }, [client?.id])

  useEffect(() => {
    if (!client) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDetails()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [client?.id])

  useEffect(() => {
    if (!client) return undefined
    const handlePopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }

    window.history.pushState({ ...window.history.state, clientDetailsOverlay: true }, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [client?.id])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  if (!client) return null

  const fields = Object.entries(client.customFields || {})
  const fieldClass = 'h-10 w-full rounded-xs border px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
  const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }
  const closeDetails = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.clientDetailsOverlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  const startEditing = () => {
    setForm({
      name: client.name || '',
      email: client.email || '',
      phoneNumber: client.phoneNumber || '',
    })
    setCustomFields(
      Object.entries(client.customFields || {}).map(([key, value]) => ({ key, value: String(value) })),
    )
    setEditError('')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditError('')
  }

  const saveChanges = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    const phoneNumber = form.phoneNumber.trim()
    if (!name) {
      setEditError('Enter a client name.')
      return
    }
    if (!email && !phoneNumber) {
      setEditError('Enter an email address or phone number.')
      return
    }

    const normalizedFields = {}
    for (const field of customFields) {
      const key = field.key.trim()
      const value = field.value.trim()
      if (!key && !value) continue
      if (!key || !value) {
        setEditError('Enter both a name and value for each additional field.')
        return
      }
      if (Object.keys(normalizedFields).some((existing) => existing.toLowerCase() === key.toLowerCase())) {
        setEditError(`The additional field "${key}" is duplicated.`)
        return
      }
      normalizedFields[key] = value
    }

    setSaving(true)
    setEditError('')
    try {
      const updated = await updateClient(token, client.id, {
        name,
        email: email || null,
        phoneNumber: phoneNumber || null,
        customFields: normalizedFields,
      })
      onUpdated?.(updated)
      setEditing(false)
      onNotify?.('Client updated')
    } catch (error) {
      setEditError(error?.message || 'Unable to update client.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close client details"
        onClick={closeDetails}
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-details-title"
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l shadow-panel sm:w-[32rem]"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-5" style={{ borderColor: 'var(--ew-line)' }}>
          <h2 id="client-details-title" className="text-title text-[var(--ew-ink)]">Client details</h2>
          <button type="button" onClick={closeDetails} aria-label="Close client details" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-ink)]" style={{ borderColor: 'var(--ew-line)' }}>
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveChanges}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ew-muted)]">Contact</h3>
            <dl className="divide-y rounded-lg border px-4" style={{ borderColor: 'var(--ew-line)' }}>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                <dt className="text-[var(--ew-muted)]">Name</dt>
                <dd className="break-words font-medium text-[var(--ew-ink)]">
                  {editing ? <input aria-label="Client name" required maxLength={200} disabled={saving} className={fieldClass} style={fieldStyle} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /> : client.name}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                <dt className="text-[var(--ew-muted)]">Email</dt>
                <dd className="break-all font-medium text-[var(--ew-ink)]">
                  {editing ? <input aria-label="Client email" type="email" maxLength={320} disabled={saving} className={fieldClass} style={fieldStyle} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /> : client.email || '-'}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                <dt className="text-[var(--ew-muted)]">Phone</dt>
                <dd className="break-all font-medium text-[var(--ew-ink)]">
                  {editing ? <input aria-label="Client phone" type="tel" maxLength={40} disabled={saving} className={fieldClass} style={fieldStyle} value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} /> : client.phoneNumber || '-'}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                <dt className="text-[var(--ew-muted)]">Added</dt>
                <dd className="font-medium text-[var(--ew-ink)]">{formatDate(client.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ew-muted)]">Additional fields</h3>
            {editing ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCustomFields((current) => [...current, { key: '', value: '' }])}
                    disabled={saving || customFields.length >= 50}
                    className="inline-flex items-center gap-1.5 rounded-xs border px-3 py-2 text-xs font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50"
                    style={{ borderColor: 'var(--ew-line)' }}
                  >
                    <LuPlus className="h-3.5 w-3.5" />
                    Add field
                  </button>
                </div>
                {customFields.map((field, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <input
                      aria-label={`Additional field ${index + 1} name`}
                      placeholder="Field name"
                      maxLength={100}
                      disabled={saving}
                      className={fieldClass}
                      style={fieldStyle}
                      value={field.key}
                      onChange={(event) => setCustomFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))}
                    />
                    <input
                      aria-label={`Additional field ${index + 1} value`}
                      placeholder="Value"
                      maxLength={1000}
                      disabled={saving}
                      className={fieldClass}
                      style={fieldStyle}
                      value={field.value}
                      onChange={(event) => setCustomFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}
                    />
                    <button
                      type="button"
                      aria-label={`Remove additional field ${index + 1}`}
                      disabled={saving}
                      onClick={() => setCustomFields((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="flex h-9 w-9 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-accent-strong)] disabled:opacity-50"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : fields.length ? (
              <dl className="divide-y rounded-lg border px-4" style={{ borderColor: 'var(--ew-line)' }}>
                {fields.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                    <dt className="break-words text-[var(--ew-muted)]">{key}</dt>
                    <dd className="break-words font-medium text-[var(--ew-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="rounded-lg border px-4 py-4 text-sm text-[var(--ew-muted)]" style={{ borderColor: 'var(--ew-line)' }}>No additional fields.</p>
            )}
          </section>
          {editError && (
            <p role="alert" className="rounded-xs border px-3 py-2 text-sm text-[var(--ew-accent-strong)]" style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)' }}>
              {editError}
            </p>
          )}
        </div>
        {(canDelete || editing) && (
          <footer className="flex shrink-0 justify-end gap-3 border-t p-5" style={{ borderColor: 'var(--ew-line)' }}>
            {editing ? (
              <>
                <button type="button" onClick={cancelEditing} disabled={saving} className="inline-flex h-10 items-center justify-center rounded-xs border px-4 text-sm font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50" style={{ borderColor: 'var(--ew-line)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </>
            ) : canDelete && (
              <button
                type="button"
                aria-label={`Edit ${client.name}`}
                title="Edit client"
                onClick={startEditing}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
              >
                <LuPencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && !editing && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onDelete?.(client)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xs bg-danger px-4 text-sm font-medium text-white transition-colors hover:bg-danger-strong"
              >
                <LuTrash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </footer>
        )}
        </form>
      </aside>
    </div>,
    document.body,
  )
}
