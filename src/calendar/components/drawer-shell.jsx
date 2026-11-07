import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'

const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Right-side drawer frame for the calendar: sits below the topbar, dims the page,
 * slides in, closes on Escape/scrim (unless busy), and returns focus on close.
 * `children` fill the body; pass a <form> when the drawer submits.
 */
export default function DrawerShell({ labelledBy, header, closeLabel = 'Close', busy = false, onClose, children }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const returnTo = document.activeElement
    const frame = requestAnimationFrame(() => {
      setVisible(true)
      closeRef.current?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      returnTo?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy])

  return createPortal(
    <>
      <div
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-ink/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
        onMouseDown={() => !busy && onClose()}
      />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 motion-reduce:transition-none sm:w-[30rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionTimingFunction: ease }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className="flex h-full w-full flex-col border-l border-line bg-[#f8f7f5] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-5">
            <div className="min-w-0">{header}</div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label={closeLabel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-line text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50"
            >
              <LuX className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>
          {children}
        </aside>
      </div>
    </>,
    document.body,
  )
}

const buttonBase =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xs px-4 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60'

export const BUTTON = {
  primary: `${buttonBase} bg-[#cc785c] text-white hover:bg-[#b36a4e] focus-visible:ring-accent/30`,
  neutral: `${buttonBase} border border-[var(--ew-field-line)] bg-surface text-ink hover:bg-ground focus-visible:ring-accent/20`,
  danger: `${buttonBase} border border-danger/40 bg-surface text-danger-strong hover:bg-danger-soft focus-visible:ring-danger/20`,
  dangerSolid: `${buttonBase} bg-danger text-white hover:bg-danger-strong focus-visible:ring-danger/25`,
}

/** White, hairline-bordered container that groups drawer content on the stone body. */
export function Panel({ title, icon: Icon, action, className = '', children }) {
  return (
    <section className={`rounded-xs border border-line bg-surface ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-label font-medium text-ink">
            {Icon ? <Icon className="h-[15px] w-[15px] text-muted" strokeWidth={1.75} aria-hidden="true" /> : null}
            {title}
          </h3>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** One labelled value in its own container; `wide` spans both grid columns. */
export function FieldTile({ label, icon: Icon, wide, tone, children }) {
  return (
    <div className={`min-w-0 rounded-xs border border-line bg-surface px-3.5 py-3 ${wide ? 'col-span-2' : ''}`}>
      <dt className="flex items-center gap-1.5 text-meta text-muted">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd
        className={`mt-1 whitespace-pre-line break-words text-body-sm font-medium ${
          tone === 'danger' ? 'text-danger-strong' : tone === 'accent' ? 'text-accent-strong' : 'text-ink'
        }`}
      >
        {children}
      </dd>
    </div>
  )
}

export function ErrorLine({ message }) {
  return (
    <p role="alert" className="rounded-xs border border-danger/25 bg-danger-soft px-3 py-2 text-body-sm text-danger-strong">
      {message}
    </p>
  )
}
