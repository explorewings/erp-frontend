import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuChevronDown, LuSearch, LuUserRound, LuX } from 'react-icons/lu'
import { searchUsers } from '../../settings/api.js'

function label(user) {
  return user?.username || user?.email || 'Unknown user'
}

export default function ReportUserFilter({ value, selectedUser, token, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [picked, setPicked] = useState(null)
  const containerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!open || !token) return undefined
    let cancelled = false
    setLoading(true)
    setSearchError('')
    // Debounce so typing does not fire a request per keystroke.
    const timer = window.setTimeout(() => {
      searchUsers(token, query, 20)
        .then((result) => {
          if (cancelled) return
          setResults(result.items)
          setTotal(result.total)
        })
        .catch((error) => {
          if (cancelled) return
          setResults([])
          setTotal(0)
          setSearchError(error?.message || 'Unable to search people.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, token, query])

  const [anchor, setAnchor] = useState(null)

  /** Measure the trigger and place the panel, flipping above when space is short. */
  const reposition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // On mobile the on-screen keyboard shrinks the *visual* viewport without
    // changing window.innerHeight, so measure against visualViewport when it
    // exists or the panel ends up underneath the keyboard.
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const width = Math.min(288, window.innerWidth - 32)
    const left = Math.min(
      Math.max(16, rect.right - width),
      window.innerWidth - width - 16,
    )
    const PANEL_HEIGHT = 320
    const GAP = 8
    const spaceBelow = viewportHeight - rect.bottom - GAP - 16
    const spaceAbove = rect.top - GAP - 16
    const flipAbove = spaceBelow < PANEL_HEIGHT && spaceAbove > spaceBelow
    const available = flipAbove ? spaceAbove : spaceBelow
    setAnchor({
      left,
      width,
      maxHeight: Math.max(160, Math.min(PANEL_HEIGHT, available)),
      ...(flipAbove
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    })
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    // Scrolling the page moves the trigger, so the panel would drift. Re-anchor
    // instead of closing: on mobile, focusing the search input makes the browser
    // scroll the field into view, which used to dismiss the panel instantly.
    const handleScroll = (event) => {
      const target = event.target
      if (target instanceof Node && panelRef.current?.contains(target)) return
      const rect = containerRef.current?.getBoundingClientRect()
      // Trigger scrolled out of view: nothing sensible left to anchor to.
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false)
        return
      }
      reposition()
    }
    // A mobile keyboard changes only the viewport *height*. Closing on any
    // resize dismissed the panel the moment the search input was focused, so
    // react to width changes (rotation / real resizes) and re-anchor on height.
    let lastWidth = window.innerWidth
    const handleResize = () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth
        setOpen(false)
        return
      }
      reposition()
    }
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    // The keyboard opening/closing fires visualViewport resize, not window resize.
    window.visualViewport?.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      window.visualViewport?.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    // Autofocus is right on desktop but on touch/mobile it pops the keyboard the
    // instant the panel opens, which resizes the viewport and fights the anchor.
    // There the user taps the field when ready.
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    if (!coarse) searchRef.current?.focus()
  }, [open])

  const openPicker = () => {
    reposition()
    setOpen((current) => !current)
  }

  const pick = (id) => {
    setPicked(id ? (results.find((user) => user.id === id) ?? null) : null)
    onChange(id)
    setOpen(false)
  }

  const selected = value ? (picked?.id === value ? picked : results.find((user) => user.id === value) ?? selectedUser ?? null) : null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={selected ? `Reports by ${label(selected)}` : 'Filter reports by user'}
        className={`inline-flex h-8 items-center gap-2 rounded-xs border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-60 sm:h-10 sm:px-3 ${
          value
            ? 'border-accent bg-accent/5 text-ink'
            : 'border-field bg-surface text-muted hover:bg-ground'
        }`}
      >
        <LuUserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden max-w-[12ch] truncate whitespace-nowrap sm:inline">
          {selected ? label(selected) : 'All users'}
        </span>
        <LuChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[70]" role="presentation">
          <button
            type="button"
            aria-label="Close user filter"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a user"
            className="fixed flex flex-col overflow-hidden rounded-tile border border-line bg-surface p-3 shadow-panel"
            style={anchor ? { left: anchor.left, width: anchor.width, maxHeight: anchor.maxHeight, ...(anchor.top !== undefined ? { top: anchor.top } : { bottom: anchor.bottom }) } : { top: 80, left: 16, width: 288, maxHeight: 320 }}
          >
            <div className="relative shrink-0">
              <LuSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people…"
                aria-label="Search people"
                className="h-9 w-full rounded-xs border border-field bg-surface pl-8 pr-3 text-meta text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </div>

            <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto" role="listbox" aria-label="Users">
              {value ? (
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pick(null)}
                    className="flex w-full items-center gap-2 rounded-xs px-2 py-2 text-left text-meta font-medium text-accent-strong hover:bg-accent/5"
                  >
                    <LuX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    All users
                  </button>
                </li>
              ) : null}

              {loading ? (
                <li className="px-2 py-6 text-center text-meta text-muted" role="status">Searching…</li>
              ) : searchError ? (
                <li className="px-2 py-6 text-center text-meta text-danger-strong" role="alert">{searchError}</li>
              ) : results.length ? results.map((user) => {
                const isSelected = user.id === value
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pick(user.id)}
                      className={`flex w-full items-center gap-2 rounded-xs px-2 py-2 text-left transition-colors ${
                        isSelected ? 'bg-accent/10' : 'hover:bg-ground'
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ground text-label font-semibold uppercase text-muted">
                        {label(user).slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-meta ${isSelected ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
                          {label(user)}
                        </span>
                        {user.email ? (
                          <span className="block truncate text-label text-muted">{user.email}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              }) : (
                <li className="px-2 py-6 text-center text-meta text-muted">No people match that search.</li>
              )}
            </ul>

            {!loading && !searchError && total > results.length ? (
              <p className="mt-2 shrink-0 border-t border-line pt-2 text-label text-muted">
                Showing {results.length} of {total}. Refine your search to narrow it down.
              </p>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
