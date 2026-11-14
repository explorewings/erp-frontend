import { useEffect, useId, useRef, useState } from 'react'
import { LuCheck, LuChevronDown, LuSearch } from 'react-icons/lu'
import { searchUsers } from '../../settings/api.js'

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_LIMIT = 20

/**
 * System-style user dropdown with a server-side search bar.
 * `value` is the selected user id as a string; `onChange` receives the new id string and the user object.
 * `excludedIds` removes users that must not be offered (e.g. current members).
 * `users` (optional) is a fixed list `[{ id, username, role, meta? }]` searched locally
 * instead of the server; `meta` replaces the role on the right of each row.
 * `collapsible` opens the list inline under the field (pushing content down)
 * instead of floating over it, and keeps it open until a pick, a click on the
 * field or Escape.
 */
export default function UserSelect({
  token,
  value,
  onChange,
  excludedIds = [],
  disabled = false,
  placeholder = 'Select a user',
  users: fixedUsers,
  collapsible = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  // Server-side search, debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    if (fixedUsers || !open || !token) return undefined
    let cancelled = false
    setIsLoading(true)
    setSearchError('')
    const timer = window.setTimeout(() => {
      searchUsers(token, query, SEARCH_LIMIT)
        .then((result) => {
          if (cancelled) return
          setUsers(Array.isArray(result.items) ? result.items : [])
        })
        .catch((err) => {
          if (!cancelled) {
            setUsers([])
            setSearchError(err?.message || 'Unable to search users.')
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [fixedUsers, open, token, query])

  const needle = query.trim().toLowerCase()
  const source = fixedUsers
    ? fixedUsers.filter((user) => !needle || String(user.username || '').toLowerCase().includes(needle))
    : users
  const options = source.filter(
    (user) => user.status !== 'inactive' && !excludedIds.includes(String(user.id)),
  )

  const selected =
    (fixedUsers ?? options).find((user) => String(user.id) === value) ?? null

  useEffect(() => {
    if (!open || collapsible) return undefined
    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open, collapsible])

  // Keep the highlighted option visible while moving through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  useEffect(() => {
    if (open) {
      setActiveIndex(-1)
      // Desktop only: focusing the search immediately would fight the mobile keyboard.
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      if (!coarse) searchRef.current?.focus()
    } else {
      setQuery('')
    }
  }, [open])

  const openMenu = () => {
    if (disabled) return
    setOpen(true)
  }

  const closeMenu = (focusTrigger = true) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  const choose = (user) => {
    if (!user) return
    onChange?.(String(user.id), user)
    closeMenu()
  }

  const handleKeyDown = (event) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(options.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        // Space keeps typing in the search field; pick with Enter.
        if (event.key === 'Enter' && activeIndex >= 0) {
          event.preventDefault()
          choose(options[activeIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        closeMenu(false)
        break
      default:
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xs border bg-surface px-3 text-left text-sm font-medium text-[var(--ew-ink)] outline-none transition-colors focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ borderColor: open ? '#cc785c' : 'var(--ew-line)' }}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'font-normal text-[var(--ew-muted)]'}`}>
          {selected ? selected.username : placeholder}
        </span>
        <LuChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--ew-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className={`flex w-full flex-col overflow-hidden rounded-xs border bg-[var(--ew-surface)] py-1 ${
            collapsible
              ? 'mt-1.5 max-h-64'
              : 'absolute left-0 top-full z-50 mt-1.5 max-h-72 shadow-panel'
          }`}
          style={{ borderColor: 'var(--ew-line)' }}
        >
          <div className="relative shrink-0 px-2 pb-1 pt-1">
            <LuSearch
              className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ew-muted)]"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search users..."
              aria-label="Search users"
              className="h-8 w-full rounded-xs border border-[var(--ew-field-line)] bg-surface pl-8 pr-3 text-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label="Users" className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && !fixedUsers ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--ew-muted)]" role="status">
                Searching...
              </li>
            ) : searchError ? (
              <li className="px-3 py-6 text-center text-sm text-danger" role="alert">
                {searchError}
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--ew-muted)]">No users match that search.</li>
            ) : (
              options.map((user, index) => {
                const isSelected = String(user.id) === value
                const isActive = index === activeIndex
                return (
                  <li
                    key={user.id}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(user)}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${isActive ? 'bg-ground/80' : ''}`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#cc785c]">
                      {isSelected ? <LuCheck className="h-4 w-4" aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[var(--ew-ink)]">{user.username}</span>
                    <span className={`shrink-0 text-xs text-[var(--ew-muted)] ${user.meta ? '' : 'capitalize'}`}>
                      {user.meta ?? user.role}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
