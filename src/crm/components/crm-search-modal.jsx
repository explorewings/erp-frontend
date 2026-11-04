import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'

export default function CrmSearchModal({ open, query, onSearch, onClose }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    inputRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-ink/15 backdrop-blur-sm" aria-label="Close CRM search" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-search-title"
        className="relative w-full max-w-xl rounded-control border p-5 shadow-2xl"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="crm-search-title" className="text-sm font-semibold text-[var(--ew-ink)]">Search current pipeline</h2>
            <p className="mt-1 text-xs text-[var(--ew-muted)]">Search deals in the selected pipeline by client name or contact details.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close CRM search" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground/70">
            <LuX className="h-4 w-4" />
          </button>
        </header>
        <label className="mt-4 block">
          <span className="sr-only">Search current pipeline</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onSearch?.(event.target.value)}
            placeholder="Search deals..."
            className="h-11 w-full rounded-xs border bg-surface px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            style={{ borderColor: 'var(--ew-field-line)' }}
          />
        </label>
      </section>
    </div>,
    document.body,
  )
}
