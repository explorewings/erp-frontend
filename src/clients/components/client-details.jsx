import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuPlus, LuPencil, LuTrash2, LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { fetchClientHistory, updateClient } from '../api.js'

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'history', label: 'History' },
]

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/* ---- History tab: thread from client_activity_log (mirrors calendar event History) ---- */

const ACTION_LABELS = { created: 'Added client', updated: 'Edited client', added_to_pipeline: 'Added to pipeline' }

function labelFor(entry) {
  return ACTION_LABELS[entry.action] ?? entry.action
}

function sourceLine(entry) {
  const meta = entry.meta || {}
  if (entry.action === 'added_to_pipeline') {
    return meta.pipelineName ? `Added to pipeline "${meta.pipelineName}"` : 'Added to a pipeline'
  }
  if (entry.action === 'created') {
    if (meta.source === 'imported') {
      return meta.importName ? `Imported via "${meta.importName}"` : 'Imported'
    }
    if (meta.via === 'crm') {
      return meta.pipelineName ? `Added manually via CRM to "${meta.pipelineName}"` : 'Added manually via CRM'
    }
    return 'Added manually'
  }
  if (Array.isArray(meta.changedFields) && meta.changedFields.length) {
    const pretty = meta.changedFields.map((f) => (f === 'customFields' ? 'additional fields' : f))
    return `Changed: ${pretty.join(', ')}`
  }
  return null
}

function HistoryEntry({ entry, last }) {
  const detail = sourceLine(entry)
  return (
    <li className="relative ml-5 rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
      {/* Timeline: dot on the connector line; the line runs down to the next card. */}
      <span aria-hidden className="absolute -left-[18px] top-4 h-2.5 w-2.5 rounded-full bg-[#cc785c]" />
      {!last ? <span aria-hidden className="absolute -bottom-[31px] -left-[13px] top-[21px] z-10 w-px bg-[#cc785c]/45" /> : null}
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-sm text-[var(--ew-ink)]">
          <span className="font-semibold">{entry.actor?.username ?? 'System'}</span>
          <span className="text-[var(--ew-muted)]"> · {labelFor(entry)}</span>
        </p>
        <time className="shrink-0 text-[11px] tabular-nums text-[var(--ew-muted)]">{formatDateTime(entry.createdAt)}</time>
      </div>
      {detail ? <p className="mt-1 text-xs text-[var(--ew-muted)]">{detail}</p> : null}
    </li>
  )
}

/** Thread of client activity, latest first, 20 per page (same as calendar HistoryPanel). */
function HistoryPanel({ token, clientId, revision }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let alive = true
    setStatus('loading')
    setError('')
    setItems([])
    setHasMore(false)
    fetchClientHistory(token, clientId, 1)
      .then((data) => {
        if (!alive) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        setHasMore(Boolean(data?.hasMore))
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message || 'Unable to load history.')
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [token, clientId, revision])

  const loadMore = () => {
    setLoadingMore(true)
    fetchClientHistory(token, clientId, items.length / 20 + 1)
      .then((data) => {
        setItems((current) => [...current, ...(Array.isArray(data?.items) ? data.items : [])])
        setHasMore(Boolean(data?.hasMore))
      })
      .catch((err) => setError(err?.message || 'Unable to load history.'))
      .finally(() => setLoadingMore(false))
  }

  if (status === 'loading') {
    return (
      <div className="flex h-40 items-center justify-center" role="status" aria-label="Loading history">
        <Loader size={2} />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="rounded-xs border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger-strong" role="alert">
        {error}
      </div>
    )
  }
  return (
    <ul className="relative space-y-2">
      {items.map((entry, index) => (
        <HistoryEntry key={entry.id} entry={entry} last={index === items.length - 1} />
      ))}
      {hasMore ? (
        <li>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed text-xs font-medium transition-colors disabled:cursor-wait"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            {loadingMore ? <Loader size={1.1} /> : 'Load more'}
          </button>
        </li>
      ) : null}
      {!items.length ? (
        <li className="rounded-[10px] border border-dashed px-3 py-6 text-center text-sm text-[var(--ew-muted)]" style={{ borderColor: 'var(--ew-line)' }}>
          No activity recorded yet.
        </li>
      ) : null}
    </ul>
  )
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
  const [tab, setTab] = useState('details')
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '' })
  const [customFields, setCustomFields] = useState([])
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  onCloseRef.current = onClose

  useEffect(() => {
    setEditing(false)
    setEditError('')
    setTab('details')
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

  // Sliding highlight for the Details/History tabs (same UI as Clients/Imports).
  // `client?.id` is a dependency because this component stays mounted while
  // `client` is null (rendering nothing); the effect must re-run when the
  // drawer first opens, otherwise the slider stays at width 0 and the active
  // tab's white text is invisible on the light background.
  useEffect(() => {
    const update = () => {
      const index = TABS.findIndex((item) => item.id === tab)
      const node = tabRefs.current[index]
      if (!node) return
      setSliderStyle({ left: node.offsetLeft, width: node.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [tab, client?.id])

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
    setTab('details')
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
          <div
            className="relative inline-flex rounded-lg border p-1"
            role="tablist"
            aria-label="Client views"
            style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
          >
            <div
              className="absolute inset-y-1 rounded-[3px] bg-[#cc785c] transition-all duration-300 ease-out"
              style={{ left: sliderStyle.left, width: sliderStyle.width }}
            />
            {TABS.map((item, index) => {
              const isActive = tab === item.id
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  id={`client-details-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`client-details-panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`relative z-10 whitespace-nowrap rounded-xs px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-white' : 'text-[var(--ew-muted)]'}`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <button type="button" onClick={closeDetails} aria-label="Close client details" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-ink)]" style={{ borderColor: 'var(--ew-line)' }}>
            <LuX className="h-4 w-4" />
          </button>
        </header>

        {tab === 'history' ? (
          <div id="client-details-panel-history" role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-5">
            <h2 id="client-details-title" className="sr-only">History</h2>
            <HistoryPanel token={token} clientId={client.id} revision={client.updatedAt || client.createdAt} />
          </div>
        ) : (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveChanges}>
        <div id="client-details-panel-details" role="tabpanel" className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <h2 id="client-details-title" className="sr-only">Client details</h2>
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
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                <dt className="text-[var(--ew-muted)]">Added by</dt>
                <dd className="font-medium text-[var(--ew-ink)]">{client.createdByUsername || '—'}</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
                <dt className="text-[var(--ew-muted)]">Source</dt>
                <dd className="font-medium capitalize text-[var(--ew-ink)]">{client.source === 'imported' ? `Imported${client.importName ? ` via "${client.importName}"` : ''}` : 'Manual'}</dd>
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
        )}
      </aside>
    </div>,
    document.body,
  )
}
