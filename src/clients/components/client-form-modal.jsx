import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'

/**
 * Modal frame shared by Add client and Add deal: overlay, centring within
 * the main content area, Escape/backdrop close, header, scrollable body,
 * error line, and Cancel/submit footer.
 */
export default function ClientFormModal({
  titleId,
  title,
  subtitle,
  submitLabel,
  busyLabel,
  busy,
  error,
  onSubmit,
  onClose,
  children,
}) {
  const [horizontalOffset, setHorizontalOffset] = useState(0)

  // Centre the dialog over <main> rather than the whole window (sidebar offset).
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

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
        aria-labelledby={titleId}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: 'var(--ew-line)' }}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-title text-[var(--ew-ink)]">
              {title}
            </h2>
            {subtitle ? <div className="mt-1 text-xs text-[var(--ew-muted)]">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border text-muted hover:bg-ground hover:text-ink disabled:opacity-50"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-col" onSubmit={onSubmit}>
          <div className="space-y-4 overflow-y-auto px-6 py-5">{children}</div>

          {error && (
            <p
              role="alert"
              className="mx-6 mb-3 rounded-xs border px-3 py-2 text-sm text-[var(--ew-accent-strong)]"
              style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)' }}
            >
              {error}
            </p>
          )}

          <footer className="flex shrink-0 justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--ew-line)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
            >
              {busy && <Loader size={1} className="h-4 w-4" />}
              {busy ? busyLabel : submitLabel}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}
