import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { createResort, uploadResortImage } from '../api.js'

const EMPTY_FORM = { location: '', description: '', price: '', ratings: '4.5' }

export default function AddResorts({ open, token, onClose, onCreated, onUpdated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [files, setFiles] = useState([null, null, null])
  const [created, setCreated] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)
  const [previews, setPreviews] = useState([null, null, null])
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    const urls = files.map((file) => file ? URL.createObjectURL(file) : null)
    setPreviews(urls)
    return () => urls.forEach((url) => url && URL.revokeObjectURL(url))
  }, [files])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return undefined
    }
    setForm(EMPTY_FORM)
    setFiles([null, null, null])
    setCreated(null)
    setError(null)
    setVisible(false)
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }
    const handlePopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }
    document.addEventListener('keydown', handleKey)
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open])

  const closeDrawer = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) window.history.back()
    else ignorePopRef.current = false
  }

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    let resort = created
    let resortWasCreated = Boolean(created)
    let failedSlot = null
    try {
      if (!resort) {
        resort = await createResort(token, {
          location: form.location.trim(),
          description: form.description.trim() || null,
          price: Number(form.price),
          ratings: form.ratings === '' ? 4.5 : Number(form.ratings),
        })
        setCreated(resort)
        resortWasCreated = true
        onCreated?.(resort)
      }
      for (const [index, file] of files.entries()) {
        if (!file) continue
        failedSlot = index + 1
        resort = await uploadResortImage(token, resort.id, index + 1, file)
        setCreated(resort)
        onUpdated?.(resort)
        setFiles((previous) => previous.map((current, fileIndex) => fileIndex === index ? null : current))
        failedSlot = null
      }
      closeDrawer()
    } catch (err) {
      setError(
        resortWasCreated
          ? `Resort created, but image ${failedSlot} could not be uploaded: ${err?.message || 'Upload failed.'} Retry to continue without creating a duplicate resort.`
          : err?.message || 'Unable to create resort.',
      )
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = 'h-11 w-full rounded-xs border px-3.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60'
  const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }

  return createPortal(
    <aside
      className={`fixed bottom-0 right-0 top-16 z-50 flex w-full flex-col border-l border-[var(--ew-line)] shadow-panel transition-transform duration-300 ease-out sm:w-[32rem] ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ background: 'var(--ew-surface)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-resort-title"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <div>
          <h2 id="create-resort-title" className="text-title text-[var(--ew-ink)]">Create resort</h2>
          <p className="text-xs text-[var(--ew-muted)]">Add resort details and up to three photos.</p>
        </div>
        <button type="button" onClick={closeDrawer} aria-label="Close create resort drawer" className="flex h-8 w-8 items-center justify-center rounded-xs border border-line text-muted hover:bg-ground hover:text-ink">
          <LuX className="h-4 w-4" />
        </button>
      </header>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} aria-busy={busy}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block text-label font-medium text-[var(--ew-ink)]" htmlFor="resort-location">
            Location
            <input id="resort-location" required className={`${fieldClass} mt-1.5`} style={fieldStyle} value={form.location} disabled={!!created} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
          </label>
          <label className="block text-label font-medium text-[var(--ew-ink)]" htmlFor="resort-description">
            Description
            <textarea id="resort-description" rows={4} className="mt-1.5 w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60" style={fieldStyle} value={form.description} disabled={!!created} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-label font-medium text-[var(--ew-ink)]" htmlFor="resort-price">
              Price (INR)
              <input id="resort-price" type="number" min="0" step="0.01" required className={`${fieldClass} mt-1.5`} style={fieldStyle} value={form.price} disabled={!!created} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
            </label>
            <label className="block text-label font-medium text-[var(--ew-ink)]" htmlFor="resort-rating">
              Rating (out of 5)
              <input id="resort-rating" type="number" min="0" max="5" step="0.1" className={`${fieldClass} mt-1.5`} style={fieldStyle} value={form.ratings} disabled={!!created} onChange={(event) => setForm((prev) => ({ ...prev, ratings: event.target.value }))} />
            </label>
          </div>
          <div className="space-y-4">
            <h3 className="text-label font-medium text-[var(--ew-ink)]">Photos</h3>
            {files.map((file, index) => (
              <div key={index} className="rounded-xs border p-3" style={{ borderColor: 'var(--ew-line)' }}>
                <p className="mb-2 text-xs font-medium text-[var(--ew-muted)]">Photo {index + 1}</p>
                {previews[index] || created?.[`image${index + 1}`] ? (
                  <img src={previews[index] || created?.[`image${index + 1}`]} alt={`Resort preview ${index + 1}`} className="mb-3 h-40 w-full rounded-xs object-cover" />
                ) : (
                  <div className="mb-3 flex h-32 items-center justify-center rounded-xs bg-ground text-xs text-[var(--ew-muted)]">No image selected</div>
                )}
                <div className="flex justify-between">
                  <label className="cursor-pointer rounded-xs border px-3 py-1.5 text-xs font-medium hover:bg-ground" style={{ borderColor: 'var(--ew-line)' }}>
                    {created?.[`image${index + 1}`] && !file ? 'Uploaded' : file ? 'Change image' : 'Choose image'}
                    <input type="file" accept="image/*" hidden disabled={!!created || busy} onChange={(event) => {
                      const nextFile = event.target.files?.[0]
                      if (nextFile) setFiles((previous) => previous.map((current, fileIndex) => fileIndex === index ? nextFile : current))
                      event.target.value = ''
                    }} />
                  </label>
                  {file && !created && (
                    <button type="button" onClick={() => setFiles((previous) => previous.map((current, fileIndex) => fileIndex === index ? null : current))} className="rounded-xs bg-danger px-3 py-1.5 text-xs font-medium text-white">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {error && <div className="rounded-xs border px-3 py-2 text-body-sm" style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)', color: 'var(--ew-accent-strong)' }}>{error}</div>}
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-[var(--ew-line)] px-5 py-3">
          <button type="button" onClick={closeDrawer} disabled={busy} className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] hover:bg-ground disabled:opacity-60" style={{ borderColor: 'var(--ew-line)' }}>Cancel</button>
          <button type="submit" disabled={busy} className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white hover:bg-[#b36a4e] disabled:opacity-60">
            {busy ? <span className="inline-flex items-center gap-2"><Loader size={1} className="h-4 w-4" />{created ? 'Retrying uploads...' : 'Creating...'}</span> : created ? 'Retry image uploads' : 'Create resort'}
          </button>
        </footer>
      </form>
    </aside>,
    document.body,
  )
}
