import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuChevronLeft, LuChevronRight, LuPen, LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { deletePackageImage, fetchPackage, updatePackage, uploadPackageImage } from '../api.js'

export default function PackageDrawer({ open, pkg, token, onClose, onUpdate, onNotify }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  onCloseRef.current = onClose
  const [details, setDetails] = useState(pkg)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    location: '',
    description: '',
    category: '',
    totalDays: '',
    price: '',
    ratings: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const [removingSlot, setRemovingSlot] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setActiveIndex(0)
    setDetails(pkg)
    setIsLoading(false)
    setIsEditing(false)
    if (!open || !pkg?.id) return undefined
    let cancelled = false
    setIsLoading(true)
    fetchPackage(token, pkg.id)
      .then((data) => {
        if (cancelled) return
        setDetails(data)
      })
      .catch(() => {
        if (!cancelled) setDetails((current) => current || pkg)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, pkg?.id, token])

  useEffect(() => {
    if (!open) return
    const source = details || pkg
    if (!source) return
    setForm({
      location: source.location ?? '',
      description: source.description ?? '',
      category: source.category ?? '',
      totalDays: source.totalDays ?? '',
      price: source.price ?? '',
      ratings: source.ratings ?? '',
    })
    setError(null)
  }, [open, details, pkg])

  useEffect(() => {
    if (open) {
      setVisible(false)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined
    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [open])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  if (!open || !pkg) return null

  const closeDrawer = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  const images = [details?.image1, details?.image2, details?.image3].filter(Boolean)
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  const goNext = () => setActiveIndex((prev) => (prev + 1) % images.length)

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const payload = {
      location: form.location.trim(),
      description: form.description,
      category: form.category.trim(),
      totalDays: form.totalDays === '' ? undefined : Number(form.totalDays),
      price: form.price === '' ? undefined : Number(form.price),
      ratings: form.ratings === '' ? undefined : Number(form.ratings),
    }
    try {
      const updated = await updatePackage(token, pkg.id, payload)
      setDetails(updated)
      onUpdate?.(updated)
      onNotify?.('Package updated')
      setIsEditing(false)
    } catch (err) {
      setError(err?.message || 'Unable to update package.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadImage = async (slot, file) => {
    if (!token || !pkg?.id || !file) return
    setUploadingSlot(slot)
    setError(null)
    try {
      const updated = await uploadPackageImage(token, pkg.id, slot, file)
      setDetails(updated)
      onUpdate?.(updated)
      onNotify?.(`Image ${slot} updated`)
    } catch (err) {
      setError(err?.message || 'Unable to upload image.')
    } finally {
      setUploadingSlot(null)
    }
  }

  const handleRemoveImage = async (slot) => {
    setRemovingSlot(slot)
    setError(null)
    try {
      const updated = await deletePackageImage(token, pkg.id, slot)
      setDetails(updated)
      onUpdate?.(updated)
      onNotify?.(`Image ${slot} removed`)
    } catch (err) {
      setError(err?.message || 'Unable to remove image.')
    } finally {
      setRemovingSlot(null)
    }
  }

  return createPortal(
    <div
      className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[32rem] ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <aside
        className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
      >
        <div className="flex h-12 items-center justify-between border-b border-[var(--ew-line)] px-4">
          <h2 className="text-title text-[var(--ew-ink)]">{isEditing ? 'Edit package' : (details?.location || 'Package details')}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Edit package"
                className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] focus-visible:ring-4 focus-visible:ring-accent/15"
              >
                <LuPen className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isEditing ? (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={1.8} className="h-4 w-4" />
              </div>
            ) : (
              <>
                {images.length > 0 && (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-control border" style={{ borderColor: 'var(--ew-line)' }}>
                      <img
                        src={images[activeIndex]}
                        alt={details?.location || 'Package image'}
                        className="h-56 w-full object-cover"
                      />
                    </div>
                    {images.length > 1 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-[var(--ew-muted)]">
                          {activeIndex + 1} / {images.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={goPrev}
                            className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
                            aria-label="Previous image"
                          >
                            <LuChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={goNext}
                            className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
                            aria-label="Next image"
                          >
                            <LuChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Category</p>
                  <p className="mt-1 text-body text-[var(--ew-ink)]">{details?.category || 'Uncategorized'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Duration</p>
                    <p className="mt-1 text-body-sm text-[var(--ew-ink)]">{details?.totalDays ? `${details.totalDays} days` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Price</p>
                    <p className="mt-1 text-body-sm font-medium text-success">{details?.price != null ? `INR ${details.price}` : '-'}</p>
                  </div>
                </div>

                {details?.ratings != null && (
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Rating</p>
                    <p className="mt-1 text-body-sm text-[var(--ew-ink)]">{details.ratings}</p>
                  </div>
                )}

                {details?.description && (
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Description</p>
                    <p className="mt-1 whitespace-pre-line text-body-sm text-[var(--ew-ink)]">{details.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <form id="edit-package-form" className="flex-1 space-y-4 overflow-y-auto p-4" onSubmit={handleSave}>
            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="ep-location">
                Location
              </label>
              <input
                id="ep-location"
                className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>

            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="ep-description">
                Description
              </label>
              <textarea
                id="ep-description"
                rows="3"
                className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="ep-category">
                Category
              </label>
              <input
                id="ep-category"
                className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="ep-days">
                  Days
                </label>
                <input
                  id="ep-days"
                  type="number"
                  className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                  style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                  value={form.totalDays}
                  onChange={(event) => setForm((prev) => ({ ...prev, totalDays: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="ep-price">
                  Price
                </label>
                <input
                  id="ep-price"
                  type="number"
                  className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                  style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="ep-rating">
                  Rating
                </label>
                <input
                  id="ep-rating"
                  type="number"
                  step="0.1"
                  className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                  style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                  value={form.ratings}
                  onChange={(event) => setForm((prev) => ({ ...prev, ratings: event.target.value }))}
                />
              </div>
            </div>





            <div>
              <p className="text-label font-medium text-[var(--ew-muted)]">Images</p>
              <div className="mt-2 space-y-3">
                {[1, 2, 3].map((slot) => {
                  const url = details?.[`image${slot}`]
                  return (
                    <div
                      key={slot}
                      className="rounded-xs border p-3"
                      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
                    >
                      <div
                        className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-xs border"
                        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-ground)' }}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={`Image ${slot}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-[var(--ew-muted)]">
                            No image
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label
                          className="rounded-xs border bg-ground px-3 py-1.5 text-xs font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                          style={{ borderColor: 'var(--ew-line)' }}
                        >
                          {url ? 'Replace image' : 'Upload image'}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploadingSlot === slot || removingSlot === slot}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void handleUploadImage(slot, file)
                              event.target.value = ''
                            }}
                          />
                        </label>
                        {url && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(slot)}
                            disabled={uploadingSlot === slot || removingSlot === slot}
                            className="rounded-xs bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger-strong disabled:opacity-60"
                          >
                            {removingSlot === slot ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                      {uploadingSlot === slot && (
                        <p className="mt-2 text-xs text-[var(--ew-muted)]">Uploading image...</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {error && (
              <div
                className="rounded-xs border px-3 py-2 text-body-sm"
                style={{
                  borderColor: 'rgba(194, 65, 12, 0.28)',
                  background: 'rgba(194, 65, 12, 0.06)',
                  color: 'var(--ew-accent-strong)',
                }}
              >
                {error}
              </div>
            )}

          </form>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--ew-line)] px-4 py-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-package-form"
                disabled={isSaving}
                className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              Close
            </button>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}
