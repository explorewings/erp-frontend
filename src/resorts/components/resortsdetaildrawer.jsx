import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuChevronLeft, LuChevronRight, LuPen, LuTrash2, LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import Alert from '../../appcomponents/alert.jsx'
import {
  deleteResort,
  deleteResortImage,
  fetchResort,
  updateResort,
  uploadResortImage,
} from '../api.js'

export default function ResortsDetailDrawer({
  open,
  resort,
  token,
  onClose,
  onUpdate,
  onNotify,
  onDeleted,
}) {
  const [details, setDetails] = useState(resort)
  const [form, setForm] = useState({ location: '', description: '', price: '', ratings: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const [removingSlot, setRemovingSlot] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    setDetails(resort)
    setActiveIndex(0)
    setIsEditing(false)
    if (!open || !resort?.id) return undefined
    let cancelled = false
    setIsLoading(true)
    fetchResort(token, resort.id)
      .then((data) => {
        if (!cancelled) setDetails(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load resort details.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, resort?.id, token])

  useEffect(() => {
    const source = details || resort
    if (!open || !source) return
    setForm({
      location: source.location ?? '',
      description: source.description ?? '',
      price: source.price ?? '',
      ratings: source.ratings ?? '',
    })
    setError(null)
  }, [open, details, resort])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return undefined
    }
    setVisible(false)
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    if (showDeleteAlert) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }
    const closeOnPop = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }
    document.addEventListener('keydown', closeOnEscape)
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', closeOnPop)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('popstate', closeOnPop)
    }
  }, [open, showDeleteAlert])

  const closeDrawer = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) window.history.back()
    else ignorePopRef.current = false
  }

  if (!open || !resort) return null

  const images = [details?.image1, details?.image2, details?.image3].filter(Boolean)

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateResort(token, resort.id, {
        location: form.location.trim(),
        description: form.description.trim() || null,
        price: form.price === '' ? undefined : Number(form.price),
        ratings: form.ratings === '' ? undefined : Number(form.ratings),
      })
      setDetails(updated)
      onUpdate?.(updated)
      onNotify?.('Resort updated')
      setIsEditing(false)
    } catch (err) {
      setError(err?.message || 'Unable to update resort.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpload = async (slot, file) => {
    setUploadingSlot(slot)
    setError(null)
    try {
      const updated = await uploadResortImage(token, resort.id, slot, file)
      setDetails(updated)
      onUpdate?.(updated)
      onNotify?.(`Image ${slot} updated`)
    } catch (err) {
      setError(err?.message || 'Unable to upload resort image.')
    } finally {
      setUploadingSlot(null)
    }
  }

  const handleRemoveImage = async (slot) => {
    setRemovingSlot(slot)
    setError(null)
    try {
      const updated = await deleteResortImage(token, resort.id, slot)
      setDetails(updated)
      onUpdate?.(updated)
      onNotify?.(`Image ${slot} removed`)
    } catch (err) {
      setError(err?.message || 'Unable to remove resort image.')
    } finally {
      setRemovingSlot(null)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      const result = await deleteResort(token, resort.id)
      onDeleted?.(resort.id, result?.cleanupWarnings || [])
      closeDrawer()
    } catch (err) {
      setError(err?.message || 'Unable to delete resort.')
    } finally {
      setIsDeleting(false)
      setShowDeleteAlert(false)
    }
  }

  const inputClass = 'w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15'
  const inputStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }

  return createPortal(
    <div className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[32rem] ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
      <aside className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel" role="dialog" aria-modal="true" aria-labelledby="resort-details-title">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--ew-line)] px-4">
          <h2 id="resort-details-title" className="text-title text-[var(--ew-ink)]">{isEditing ? 'Edit resort' : 'Resort details'}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button type="button" onClick={() => setShowDeleteAlert(true)} aria-label="Delete resort" disabled={isLoading || isDeleting} className="flex h-8 w-8 items-center justify-center rounded-xs bg-danger text-white hover:bg-danger-strong disabled:opacity-60"><LuTrash2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setIsEditing(true)} aria-label="Edit resort" className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white hover:bg-[#b36a4e]"><LuPen className="h-4 w-4" /></button>
              </>
            )}
            <button type="button" onClick={closeDrawer} aria-label="Close resort drawer" className="flex h-8 w-8 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted hover:text-ink"><LuX className="h-4 w-4" /></button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center"><Loader /></div>
        ) : !isEditing ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-control border" style={{ borderColor: 'var(--ew-line)' }}>
                  <img src={images[activeIndex]} alt={details?.location || 'Resort image'} className="h-56 w-full object-cover" />
                </div>
                {images.length > 1 && <div className="flex items-center justify-between text-xs text-[var(--ew-muted)]">
                  <span>{activeIndex + 1} / {images.length}</span>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Previous resort image" onClick={() => setActiveIndex((index) => (index - 1 + images.length) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#cc785c] text-white"><LuChevronLeft /></button>
                    <button type="button" aria-label="Next resort image" onClick={() => setActiveIndex((index) => (index + 1) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#cc785c] text-white"><LuChevronRight /></button>
                  </div>
                </div>}
              </div>
            )}
            <div><p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Location</p><p className="mt-1 text-body text-[var(--ew-ink)]">{details?.location || '-'}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Rating</p><p className="mt-1 text-body-sm text-[var(--ew-ink)]">{details?.ratings ?? '-'}</p></div>
              <div><p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Price</p><p className="mt-1 text-body-sm font-medium text-success">{details?.price != null ? `INR ${details.price}` : '-'}</p></div>
            </div>
            {details?.description && <div><p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Description</p><p className="mt-1 whitespace-pre-line text-body-sm text-[var(--ew-ink)]">{details.description}</p></div>}
          </div>
        ) : (
          <form id="edit-resort-form" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" onSubmit={handleSave}>
            <section>
              <p className="text-label font-medium text-[var(--ew-muted)]">Images</p>
              <div className="mt-2 space-y-3">
                {[1, 2, 3].map((slot) => {
                  const url = details?.[`image${slot}`]
                  return <div key={slot} className="rounded-xs border p-3" style={{ borderColor: 'var(--ew-line)' }}>
                    <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-xs border bg-ground" style={{ borderColor: 'var(--ew-line)' }}>
                      {url ? <img src={url} alt={`Resort image ${slot}`} className="h-full w-full object-cover" /> : <span className="text-xs text-[var(--ew-muted)]">No image</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="cursor-pointer rounded-xs border px-3 py-1.5 text-xs font-medium hover:bg-ground" style={{ borderColor: 'var(--ew-line)' }}>
                        {url ? 'Replace image' : 'Upload image'}
                        <input type="file" accept="image/*" hidden disabled={uploadingSlot === slot || removingSlot === slot} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(slot, file); event.target.value = '' }} />
                      </label>
                      {url && <button type="button" onClick={() => handleRemoveImage(slot)} disabled={uploadingSlot === slot || removingSlot === slot} className="rounded-xs bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-strong disabled:opacity-60">{removingSlot === slot ? 'Removing...' : 'Remove'}</button>}
                    </div>
                    {uploadingSlot === slot && <p className="mt-2 text-xs text-[var(--ew-muted)]">Uploading image...</p>}
                  </div>
                })}
              </div>
            </section>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="edit-resort-location">Location<input id="edit-resort-location" required className={`${inputClass} mt-1.5`} style={inputStyle} value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} /></label>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="edit-resort-description">Description<textarea id="edit-resort-description" rows={3} className={`${inputClass} mt-1.5`} style={inputStyle} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="edit-resort-price">Price (INR)<input id="edit-resort-price" type="number" min="0" step="0.01" required className={`${inputClass} mt-1.5`} style={inputStyle} value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} /></label>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="edit-resort-rating">Rating<input id="edit-resort-rating" type="number" min="0" max="5" step="0.1" className={`${inputClass} mt-1.5`} style={inputStyle} value={form.ratings} onChange={(event) => setForm((prev) => ({ ...prev, ratings: event.target.value }))} /></label>
            </div>
            {error && <div className="rounded-xs border px-3 py-2 text-body-sm" style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)', color: 'var(--ew-accent-strong)' }}>{error}</div>}
          </form>
        )}

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--ew-line)] px-4 py-2">
          {isEditing ? (
            <>
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-xs bg-gray-200 px-4 py-2 text-body-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
              <button type="submit" form="edit-resort-form" disabled={isSaving} className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white hover:bg-[#b36a4e] disabled:opacity-60">{isSaving ? 'Saving...' : 'Save changes'}</button>
            </>
          ) : <p className="text-body-sm font-semibold text-success">PRICE : INR {details?.price ?? '—'}</p>}
        </footer>
        {error && !isEditing && <div role="alert" className="border-t px-4 py-2 text-sm text-[var(--ew-accent-strong)]">{error}</div>}
        <Alert open={showDeleteAlert} title="Delete resort?" description={`"${details?.location || resort?.location || 'This resort'}" will be permanently deleted along with its unshared images. This action cannot be undone.`} confirmLabel="Delete resort" cancelLabel="Cancel" variant="destructive" isConfirming={isDeleting} onConfirm={handleDelete} onCancel={() => setShowDeleteAlert(false)} />
      </aside>
    </div>,
    document.body,
  )
}
