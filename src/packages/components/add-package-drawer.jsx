import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuImagePlus, LuX } from 'react-icons/lu'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import { createPackage, deletePackageImage, uploadPackageImage } from '../api.js'
import PackageCategoryTabs from './package-category-tabs.jsx'
import Loader from '../../appcomponents/loader.jsx'

export default function AddPackageDrawer({ open, token, onClose, onCreated, onUpdated }) {
  const [form, setForm] = useState({
    location: '',
    description: '',
    category: 'International',
    totalDays: '',
    price: '',
    ratings: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [imageFiles, setImageFiles] = useState([null, null, null])
  const [localImagePreviews, setLocalImagePreviews] = useState([null, null, null])
  const [createdPackage, setCreatedPackage] = useState(null)
  const [visible, setVisible] = useState(false)
  const [removingSlot, setRemovingSlot] = useState(null)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open) {
      setVisible(false)
      const frame = requestAnimationFrame(() => setVisible(true))
      setForm({ location: '', description: '', category: 'International', totalDays: '', price: '', ratings: '' })
      setImageFiles([null, null, null])
      setCreatedPackage(null)
      setError(null)
      setRemovingSlot(null)
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  useEffect(() => {
    const previewUrls = imageFiles.map((file) => (file ? URL.createObjectURL(file) : null))
    setLocalImagePreviews(previewUrls)
    return () => {
      previewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [imageFiles])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

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

  const closeDrawer = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  if (!open) return null

  const handleRemoveImage = async (slot, index) => {
    setError(null)
    if (createdPackage?.[`image${slot}`]) {
      setRemovingSlot(slot)
      try {
        const updatedPackage = await deletePackageImage(token, createdPackage.id, slot)
        setCreatedPackage(updatedPackage)
        setImageFiles((previous) =>
          previous.map((file, fileIndex) => (fileIndex === index ? null : file)),
        )
        onUpdated?.(updatedPackage)
      } catch (err) {
        setError(err?.message || `Unable to remove photo ${slot}.`)
      } finally {
        setRemovingSlot(null)
      }
      return
    }

    setImageFiles((previous) =>
      previous.map((file, fileIndex) => (fileIndex === index ? null : file)),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    let packageWasCreated = Boolean(createdPackage)
    let failedSlot = null
    try {
      let updatedPackage = createdPackage
      if (!updatedPackage) {
        updatedPackage = await createPackage(token, {
          location: form.location.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          totalDays: form.totalDays === '' ? null : Number(form.totalDays),
          price: form.price === '' ? null : Number(form.price),
          ratings: form.ratings === '' ? null : Number(form.ratings),
        })
        setCreatedPackage(updatedPackage)
        packageWasCreated = true
        onCreated?.(updatedPackage)
      }

      for (const [index, file] of imageFiles.entries()) {
        const slot = index + 1
        if (!file) continue
        failedSlot = slot
        updatedPackage = await uploadPackageImage(token, updatedPackage.id, slot, file)
        setCreatedPackage(updatedPackage)
        onUpdated?.(updatedPackage)
        failedSlot = null
      }

      closeDrawer()
    } catch (err) {
      const message = err?.message || 'Unable to create package.'
      setError(
        packageWasCreated
          ? `Package created, but image ${failedSlot || ''} could not be uploaded: ${message} Select Retry image uploads to try again.`
          : message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldClass =
    'h-11 w-full rounded-xs border px-3.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors placeholder:text-[var(--ew-muted)]/70 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60'
  const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }

  return createPortal(
    <>
      <DrawerBackdrop />
      <aside
        className={`fixed bottom-0 right-0 top-16 z-50 flex w-full flex-col border-l border-[var(--ew-line)] shadow-panel transition-transform duration-300 ease-out sm:w-[32rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--ew-surface)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-package-title"
      >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <div>
          <h2 id="create-package-title" className="text-title text-[var(--ew-ink)]">
            Create package
          </h2>
          <p className="text-xs text-[var(--ew-muted)]">
            Add trip details and up to three photos.
          </p>
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close create package drawer"
          className="flex h-8 w-8 items-center justify-center rounded-xs border border-line text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15"
        >
          <LuX className="h-4 w-4" />
        </button>
      </header>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                className="mb-2 block text-label font-medium text-[var(--ew-ink)]"
                htmlFor="cp-location"
              >
                Location
              </label>
              <input
                id="cp-location"
                required
                placeholder="e.g. Manali getaway"
                className={fieldClass}
                style={fieldStyle}
                value={form.location}
                disabled={!!createdPackage}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                id="cp-category-label"
                className="mb-1.5 block text-label font-medium text-[var(--ew-ink)]"
              >
                Category
              </label>
              <PackageCategoryTabs
                value={form.category}
                disabled={!!createdPackage}
                labelledBy="cp-category-label"
                onChange={(category) => setForm((prev) => ({ ...prev, category }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-label font-medium text-[var(--ew-ink)]" htmlFor="cp-days">
                Duration <span className="font-normal text-[var(--ew-muted)]">(days)</span>
              </label>
              <input
                id="cp-days"
                type="number"
                min="0"
                placeholder="e.g. 5"
                className={fieldClass}
                style={fieldStyle}
                value={form.totalDays}
                disabled={!!createdPackage}
                onChange={(e) => setForm((prev) => ({ ...prev, totalDays: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-label font-medium text-[var(--ew-ink)]" htmlFor="cp-price">
                Price <span className="font-normal text-[var(--ew-muted)]">(INR)</span>
              </label>
              <input
                id="cp-price"
                type="number"
                min="0"
                placeholder="e.g. 12000"
                className={fieldClass}
                style={fieldStyle}
                value={form.price}
                disabled={!!createdPackage}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-label font-medium text-[var(--ew-ink)]" htmlFor="cp-rating">
                Rating <span className="font-normal text-[var(--ew-muted)]">(out of 5)</span>
              </label>
              <input
                id="cp-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="e.g. 4.8"
                className={fieldClass}
                style={fieldStyle}
                value={form.ratings}
                disabled={!!createdPackage}
                onChange={(e) => setForm((prev) => ({ ...prev, ratings: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className="mb-1.5 block text-label font-medium text-[var(--ew-ink)]"
                htmlFor="cp-description"
              >
                Description
              </label>
              <textarea
                id="cp-description"
                rows={3}
                placeholder="What makes this trip special?"
                className="w-full resize-y rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors placeholder:text-[var(--ew-muted)]/70 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                style={fieldStyle}
                value={form.description}
                disabled={!!createdPackage}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-body-sm font-semibold text-[var(--ew-ink)]">Package photos</h3>
              <p className="mt-0.5 text-xs text-[var(--ew-muted)]">
                Optional · JPG, PNG, or WebP · Up to 10 MB each
              </p>
            </div>
            <div className="space-y-3">
              {imageFiles.map((file, index) => {
                const slot = index + 1
                const uploadedImageUrl = createdPackage?.[`image${slot}`]
                const imageUrl = localImagePreviews[index] || uploadedImageUrl
                return (
                  <div
                    key={slot}
                    className="rounded-control border p-3 transition-colors"
                    style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-xs bg-ground text-[var(--ew-muted)]"
                        aria-hidden="true"
                      >
                        <LuImagePlus className="h-4 w-4" />
                      </span>
                      <span className="text-label font-medium text-[var(--ew-ink)]">Photo {slot}</span>
                    </div>
                    <input
                      id={`cp-image-${slot}`}
                      type="file"
                      accept="image/*"
                      className="peer sr-only"
                      disabled={isSubmitting}
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0] || null
                        setImageFiles((previous) =>
                          previous.map((currentFile, fileIndex) =>
                            fileIndex === index ? selectedFile : currentFile,
                          ),
                        )
                        event.target.value = ''
                      }}
                    />
                    {imageUrl ? (
                      <div className="overflow-hidden rounded-xs border" style={{ borderColor: 'var(--ew-line)' }}>
                        <img
                          src={imageUrl}
                          alt={`Package photo ${slot} preview`}
                          className="h-44 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <label
                        htmlFor={`cp-image-${slot}`}
                        className={`flex min-h-24 cursor-pointer items-center justify-center rounded-xs border border-dashed px-3 text-center text-xs text-[var(--ew-muted)] transition-colors hover:border-accent hover:bg-ground/70 peer-focus-visible:border-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/15 ${
                          isSubmitting ? 'pointer-events-none opacity-60' : ''
                        }`}
                        style={{ borderColor: 'var(--ew-field-line)' }}
                      >
                        Choose an image
                      </label>
                    )}
                    {imageUrl && (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="truncate text-xs text-[var(--ew-muted)]">
                          {file?.name || (uploadedImageUrl ? 'Uploaded image' : '')}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <label
                            htmlFor={`cp-image-${slot}`}
                            className={`cursor-pointer rounded-xs border px-3 py-1.5 text-xs font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 peer-focus-visible:ring-4 peer-focus-visible:ring-accent/15 ${
                              isSubmitting || removingSlot === slot ? 'pointer-events-none opacity-60' : ''
                            }`}
                            style={{ borderColor: 'var(--ew-line)' }}
                          >
                            Change
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(slot, index)}
                            disabled={isSubmitting || removingSlot === slot}
                            className="rounded-xs border border-danger/25 px-3 py-1.5 text-xs font-medium text-danger-strong transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Remove photo ${slot}`}
                          >
                            {removingSlot === slot ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div
              className="rounded-xs border border-danger/25 bg-danger-soft px-3 py-2 text-body-sm text-danger-strong"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-[var(--ew-surface)] px-5 py-4">
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader size={1} className="h-4 w-4" />
                  {createdPackage ? 'Uploading photos...' : 'Creating package...'}
                </span>
              ) : (
                createdPackage ? 'Retry image uploads' : 'Create package'
              )}
            </button>
        </div>
      </form>
      </aside>
    </>,
    document.body,
  )
}
