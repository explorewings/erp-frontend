import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCalendar, LuChevronDown, LuCheck, LuCopy, LuLayers, LuX } from 'react-icons/lu'
import { MdKeyboardDoubleArrowRight } from 'react-icons/md'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'

const slideEase = 'cubic-bezier(0.16, 1, 0.3, 1)'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Field({ label, children, copyValue }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    if (!copyValue) return
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard API can be blocked; the value is still visible to copy manually.
    }
  }
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-[var(--ew-muted)]">{label}</dt>
        <dd className="mt-0.5 break-words text-sm leading-5 text-[var(--ew-ink)]">{children}</dd>
      </div>
      {copyValue ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-[var(--ew-line)] text-[var(--ew-muted)] transition-colors hover:bg-[var(--ew-ground)] hover:text-[var(--ew-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
        >
          {copied ? (
            <LuCheck className="h-3.5 w-3.5 text-[#b76c4f]" aria-hidden="true" />
          ) : (
            <LuCopy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  )
}
export default function DealDetailsDrawer({ deal, pipeline, stages = [], onClose }) {
  const [visible, setVisible] = useState(false)
  const [additionalOpen, setAdditionalOpen] = useState(false)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (open) {
      setAdditionalOpen(false)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])
  const closeDrawer = () => {
    if (ignorePopRef.current) {
      ignorePopRef.current = false
      return
    }
    onCloseRef.current?.()
  }

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

  const requestClose = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  if (!open || !deal) return null

  const client = deal.client || {}
  const stage = stages.find((item) => String(item.id) === String(deal.stageId))
  const customFields = client.customFields || {}

  return createPortal(
    <>
      <DrawerBackdrop />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-[var(--md-ease,0.16,1,0.3,1)] sm:w-[26rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionTimingFunction: slideEase }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="deal-details-title"
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-5">
            <h2 id="deal-details-title" className="text-sm font-semibold text-[var(--ew-ink)]">
              Deal details
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close deal details"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[var(--ew-line)] text-[var(--ew-muted)] transition-colors hover:bg-[var(--ew-ground)] hover:text-[var(--ew-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="px-5 py-5">
              <div className="flex justify-end">
                <span className="inline-flex items-center rounded-none border border-[var(--ew-line)] bg-[var(--ew-ground)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--ew-muted)]">
                  Deal #{deal.id}
                </span>
              </div>
              <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ew-muted)]">
                Client
              </h3>
              <dl className="mt-3 space-y-3">
                <Field label="Name">
                  {client.name || '—'}
                </Field>
                {client.phoneNumber && (
                  <Field label="Phone" copyValue={client.phoneNumber}>
                    <a
                      href={`tel:${client.phoneNumber}`}
                      className="text-[var(--ew-accent-strong)] underline-offset-2 hover:underline"
                    >
                      {client.phoneNumber}
                    </a>
                  </Field>
                )}
                {client.email && (
                  <Field label="Email" copyValue={client.email}>
                    <a
                      href={`mailto:${client.email}`}
                      className="text-[var(--ew-accent-strong)] underline-offset-2 hover:underline"
                    >
                      {client.email}
                    </a>
                  </Field>
                )}
                {Object.keys(customFields).length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setAdditionalOpen((value) => !value)}
                      aria-expanded={additionalOpen}
                      className="mt-4 flex w-full items-center justify-between gap-3 rounded-[4px] border border-[var(--ew-line)] bg-[var(--ew-ground)] px-3 py-2 text-sm font-semibold text-[var(--ew-ink)] transition-colors hover:bg-[#f0e6df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
                    >
                      <span>Additional fields ({Object.keys(customFields).length})</span>
                      <LuChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          additionalOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        additionalOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <ul className="mt-2 divide-y divide-[var(--ew-line)] rounded-[6px] border border-[var(--ew-line)]">
                          {Object.entries(customFields).map(([key, value]) => (
                            <li key={key} className="flex items-start justify-between gap-3 px-3 py-2">
                              <span className="shrink-0 text-xs text-[var(--ew-muted)]">{key}</span>
                              <span className="min-w-0 truncate text-right text-sm text-[var(--ew-ink)]">{value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {!client.phoneNumber && !client.email && Object.keys(customFields).length === 0 && (
                  <p className="text-sm text-[var(--ew-muted)]">No contact details yet.</p>
                )}
              </dl>
            </section>

            <hr className="mx-5 border-t border-[var(--ew-line)]" />

            <section className="px-5 py-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ew-muted)]">
                Deal
              </h3>
              <dl className="mt-3 divide-y divide-[var(--ew-line)] rounded-[6px] border border-[var(--ew-line)]">
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <MdKeyboardDoubleArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    Stage
                  </dt>
                  <dd className="truncate text-sm font-medium text-[var(--ew-ink)]">{stage?.name || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuLayers className="h-3.5 w-3.5" aria-hidden="true" />
                    Pipeline
                  </dt>
                  <dd className="truncate text-sm text-[var(--ew-ink)]">{pipeline?.name || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuCalendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Added
                  </dt>
                  <dd className="text-sm tabular-nums text-[var(--ew-ink)]">{formatDateTime(deal.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuCalendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Updated
                  </dt>
                  <dd className="text-sm tabular-nums text-[var(--ew-ink)]">{formatDateTime(deal.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <footer className="shrink-0 border-t border-[var(--ew-line)] px-5 py-4">
            <p className="text-xs text-[var(--ew-muted)]">
              Editing deals and deal-specific fields (value, priority, owner) come in a later phase.
            </p>
          </footer>
        </aside>
      </div>
    </>,
    document.body,
  )
}
