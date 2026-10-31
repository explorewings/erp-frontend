import { useEffect, useState } from 'react'
import { LuX } from 'react-icons/lu'
import { createPackage } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'

export default function AddPackageModal({ open, token, onClose, onCreated }) {
  const [form, setForm] = useState({
    location: '',
    description: '',
    category: '',
    totalDays: '',
    price: '',
    ratings: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm({ location: '', description: '', category: '', totalDays: '', price: '', ratings: '' })
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const created = await createPackage(token, {
        location: form.location.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        totalDays: form.totalDays === '' ? null : Number(form.totalDays),
        price: form.price === '' ? null : Number(form.price),
        ratings: form.ratings === '' ? null : Number(form.ratings),
      })
      onCreated?.(created)
      onClose()
    } catch (err) {
      setError(err?.message || 'Unable to create package.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15'
  const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-control border p-6 shadow-2xl ring-1 ring-[var(--ew-line)]"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-title text-[var(--ew-ink)]">Create package</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xs text-muted transition-colors hover:text-ink"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cp-location">
              Location
            </label>
            <input
              id="cp-location"
              required
              className={fieldClass}
              style={fieldStyle}
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cp-description">
              Description
            </label>
            <textarea
              id="cp-description"
              rows={3}
              className={fieldClass}
              style={fieldStyle}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cp-category">
              Category
            </label>
            <input
              id="cp-category"
              className={fieldClass}
              style={fieldStyle}
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cp-days">
                Days
              </label>
              <input
                id="cp-days"
                type="number"
                className={fieldClass}
                style={fieldStyle}
                value={form.totalDays}
                onChange={(e) => setForm((prev) => ({ ...prev, totalDays: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cp-price">
                Price
              </label>
              <input
                id="cp-price"
                type="number"
                className={fieldClass}
                style={fieldStyle}
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cp-rating">
                Rating
              </label>
              <input
                id="cp-rating"
                type="number"
                step="0.1"
                className={fieldClass}
                style={fieldStyle}
                value={form.ratings}
                onChange={(e) => setForm((prev) => ({ ...prev, ratings: e.target.value }))}
              />
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

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
                  Creating...
                </span>
              ) : (
                'Create package'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
