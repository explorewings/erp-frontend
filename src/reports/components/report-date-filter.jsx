import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCalendarDays, LuChevronDown, LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function toIso(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayIso() {
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
}

function parseIso(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month: month - 1, day }
}

function formatLabel(value) {
  const parts = parseIso(value)
  if (!parts) return 'All dates'
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Monday-first grid of 6 weeks covering the given month. */
function buildMonthCells(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const offset = (firstOfMonth.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return {
      year: cell.getFullYear(),
      month: cell.getMonth(),
      day: cell.getDate(),
      iso: toIso(cell.getFullYear(), cell.getMonth(), cell.getDate()),
      inMonth: cell.getMonth() === month,
    }
  })
}

export default function ReportDateFilter({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const selected = parseIso(value)
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? parseIso(todayIso())
    return { year: base.year, month: base.month }
  })

  useEffect(() => {
    if (!selected) return
    setCursor({ year: selected.year, month: selected.month })
  }, [value])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleReposition = () => setOpen(false)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open])

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor.year, cursor.month])
  const today = todayIso()
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const shiftMonth = (delta) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const [anchor, setAnchor] = useState(null)

  const openPicker = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const width = Math.min(304, window.innerWidth - 32)
      const left = Math.min(
        Math.max(16, rect.right - width),
        window.innerWidth - width - 16,
      )
      setAnchor({ top: rect.bottom + 8, left, width })
    }
    setOpen((current) => !current)
  }

  const pick = (iso) => {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `Reports for ${formatLabel(value)}` : 'Filter reports by date'}
        className={`inline-flex h-10 items-center gap-2 rounded-xs border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-60 ${
          value
            ? 'border-accent bg-accent/5 text-ink'
            : 'border-field bg-surface text-muted hover:bg-ground'
        }`}
      >
        <LuCalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden whitespace-nowrap sm:inline">{formatLabel(value)}</span>
        <LuChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[70]" role="presentation">
          <button
            type="button"
            aria-label="Close date picker"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a report date"
            className="fixed rounded-tile border border-line bg-surface p-3 shadow-panel"
            style={anchor ? { top: anchor.top, left: anchor.left, width: anchor.width } : undefined}
          >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
            >
              <LuChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-ink">{monthLabel}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
            >
              <LuChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((label) => (
              <span key={label} className="flex h-7 items-center justify-center text-label font-medium text-muted">
                {label}
              </span>
            ))}
            {cells.map((cell) => {
              const isSelected = cell.iso === value
              const isToday = cell.iso === today
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => pick(cell.iso)}
                  aria-label={formatLabel(cell.iso)}
                  aria-current={isSelected ? 'date' : undefined}
                  className={`flex h-8 items-center justify-center rounded-xs text-meta transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${
                    isSelected
                      ? 'bg-accent font-semibold text-white'
                      : cell.inMonth
                        ? 'text-ink hover:bg-ground'
                        : 'text-muted/50 hover:bg-ground'
                  } ${isToday && !isSelected ? 'ring-1 ring-inset ring-accent/40' : ''}`}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-xs px-2 py-1.5 text-meta font-medium text-accent-strong hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="inline-flex items-center gap-1 rounded-xs px-2 py-1.5 text-meta font-medium text-muted hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
                >
                  <LuX className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xs px-2 py-1.5 text-meta font-medium text-muted hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
        document.body,
      ) : null}
    </div>
  )
}
