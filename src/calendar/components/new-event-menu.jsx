import { useEffect, useRef, useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { EVENT_TYPES } from '../lib/event-meta.js'

const ITEMS = ['task', 'meeting', 'announcement', 'followup']
const NOTES = {
  announcement: 'Admins and superadmins only',
  followup: 'Available once CRM follow-ups are set up',
}

/** "Add event" button with a menu of the event types the viewer may create. */
export default function NewEventMenu({ creatable, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const firstItem = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    firstItem.current?.focus()
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-[#cc785c]/45 bg-accent-soft px-3 text-body-sm font-medium text-accent-strong transition-colors hover:border-[#cc785c] hover:bg-[#ffeee4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
      >
        <LuPlus className="h-4 w-4" aria-hidden="true" />
        Add event
      </button>
      {open ? (
        <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-control border border-line bg-surface py-1 shadow-panel">
          {ITEMS.map((type, index) => {
            const allowed = creatable[type]
            return (
              <button
                key={type}
                ref={index === 0 ? firstItem : undefined}
                type="button"
                role="menuitem"
                disabled={!allowed}
                onClick={() => {
                  setOpen(false)
                  onPick(type)
                }}
                className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors enabled:hover:bg-ground focus-visible:bg-ground focus-visible:outline-none disabled:cursor-not-allowed"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-pill"
                  style={{ background: EVENT_TYPES[type].color, opacity: allowed ? 1 : 0.4 }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className={`block text-body-sm font-medium ${allowed ? 'text-ink' : 'text-muted'}`}>
                    {EVENT_TYPES[type].label}
                  </span>
                  {NOTES[type] && (!allowed || type === 'announcement') ? (
                    <span className="block text-meta text-muted">{NOTES[type]}</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
