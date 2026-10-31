import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuPlus, LuTrash2, LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { createClient } from '../api.js'

const EMPTY_FORM = { name: '', email: '', phoneNumber: '' }

export default function AddClient({ open, token, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [customFields, setCustomFields] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [horizontalOffset, setHorizontalOffset] = useState(0)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setCustomFields([])
    setError(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const main = document.querySelector('main')
    if (!main) return undefined

    const updateOffset = () => {
      const bounds = main.getBoundingClientRect()
      setHorizontalOffset(bounds.left + bounds.width / 2 - window.innerWidth / 2)
    }

    updateOffset()
    const observer = new ResizeObserver(updateOffset)
    observer.observe(main)
    window.addEventListener('resize', updateOffset)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateOffset)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const email = form.email.trim()
    const phoneNumber = form.phoneNumber.trim()
    if (!email && !phoneNumber) {
      setError('Enter an email address or phone number.')
      return
    }

    const additionalFields = {}
    for (const field of customFields) {
      const key = field.key.trim()
      const value = field.value.trim()
      if (!key && !value) continue
      if (!key || !value) {
        setError('Enter both a name and value for each additional field.')
        return
      }
      if (Object.keys(additionalFields).some((existing) => existing.toLowerCase() === key.toLowerCase())) {
        setError(`The additional field "${key}" is duplicated.`)
        return
      }
      additionalFields[key] = value
    }

    setBusy(true)
    setError(null)
    try {
      const created = await createClient(token, {
        name: form.name.trim(),
        email: email || null,
        phoneNumber: phoneNumber || null,
        customFields: additionalFields,
      })
      onCreated?.(created)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Unable to create client.')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'mt-1.5 h-11 w-full rounded-xs border px-3.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
  const fieldStyle = {
    borderColor: 'var(--ew-field-line)',
    background: 'var(--ew-surface)',
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.()
      }}
    >
      <section
        className="my-auto flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-control border shadow-2xl"
        style={{
          borderColor: 'var(--ew-line)',
          background: 'var(--ew-surface)',
          transform: `translateX(${horizontalOffset}px)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--ew-line)' }}>
          <div>
            <h2 id="add-client-title" className="text-title text-[var(--ew-ink)]">Add client</h2>
            <p className="mt-1 text-xs text-[var(--ew-muted)]">Enter a name and at least one contact method.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close add client dialog"
            className="flex h-8 w-8 items-center justify-center rounded-xs border text-muted hover:bg-ground hover:text-ink disabled:opacity-50"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <label htmlFor="client-name" className="block text-label font-medium uppercase tracking-[0.08em] text-[var(--ew-muted)]">
              Name <span className="text-[var(--ew-accent-strong)]">*</span>
              <input
                id="client-name"
                required
                maxLength={200}
                autoFocus
                className={`${fieldClass} normal-case tracking-normal`}
                style={fieldStyle}
                value={form.name}
                disabled={busy}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label htmlFor="client-phone" className="block text-label font-medium uppercase tracking-[0.08em] text-[var(--ew-muted)]">
                Phone {form.email.trim() && <span className="font-normal tracking-normal">(optional)</span>}
                <input
                  id="client-phone"
                  type="tel"
                  maxLength={40}
                  className={`${fieldClass} normal-case tracking-normal`}
                  style={fieldStyle}
                  value={form.phoneNumber}
                  disabled={busy}
                  onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                />
              </label>
              <label htmlFor="client-email" className="block text-label font-medium uppercase tracking-[0.08em] text-[var(--ew-muted)]">
                Email {form.phoneNumber.trim() && <span className="font-normal tracking-normal">(optional)</span>}
                <input
                  id="client-email"
                  type="email"
                  maxLength={320}
                  className={`${fieldClass} normal-case tracking-normal`}
                  style={fieldStyle}
                  value={form.email}
                  disabled={busy}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-label font-medium text-[var(--ew-ink)]">Additional fields</h3>
                  <p className="mt-0.5 text-xs text-[var(--ew-muted)]">Add details such as age, city, or remarks.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomFields((fields) => [...fields, { key: '', value: '' }])}
                  disabled={busy || customFields.length >= 50}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border px-3 py-2 text-xs font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50"
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
                    className="h-10 min-w-0 rounded-xs border px-3 text-body-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                    style={fieldStyle}
                    value={field.key}
                    disabled={busy}
                    onChange={(event) =>
                      setCustomFields((fields) =>
                        fields.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, key: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Additional field ${index + 1} value`}
                    placeholder="Value"
                    maxLength={1000}
                    className="h-10 min-w-0 rounded-xs border px-3 text-body-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                    style={fieldStyle}
                    value={field.value}
                    disabled={busy}
                    onChange={(event) =>
                      setCustomFields((fields) =>
                        fields.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Remove additional field ${index + 1}`}
                    disabled={busy}
                    onClick={() => setCustomFields((fields) => fields.filter((_, itemIndex) => itemIndex !== index))}
                    className="flex h-9 w-9 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-accent-strong)] disabled:opacity-50"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="mx-6 mb-3 rounded-xs border px-3 py-2 text-sm text-[var(--ew-accent-strong)]" style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)' }}>
              {error}
            </p>
          )}

          <footer className="flex shrink-0 justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--ew-line)' }}>
            <button type="button" onClick={onClose} disabled={busy} className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50" style={{ borderColor: 'var(--ew-line)' }}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60">
              {busy && <Loader size={1} className="h-4 w-4" />}
              {busy ? 'Adding...' : 'Add client'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}
