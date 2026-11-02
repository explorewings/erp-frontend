import { useEffect, useRef, useState } from 'react'
import { LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { fetchClients } from '../api.js'

const PAGE_SIZE = 20

export default function ClientSearchModal({ open, token, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [clients, setClients] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
      return undefined
    }
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [open, query])

  useEffect(() => {
    if (!open || !debouncedQuery) {
      setClients([])
      setTotal(0)
      setPage(1)
      setTotalPages(1)
      setLoading(false)
      setError('')
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError('')
    fetchClients(token, { search: debouncedQuery, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return
        setClients(Array.isArray(data?.items) ? data.items : [])
        setTotal(Number(data?.total) || 0)
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1))
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError?.message || 'Unable to search clients.')
        setClients([])
        setTotal(0)
        setTotalPages(1)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, token, debouncedQuery, page])

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-5"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close client search"
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-sm"
      />
      <section
        className="relative z-10 flex max-h-[min(42rem,calc(100dvh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-control border shadow-2xl"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-search-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--ew-line)' }}>
          <div className="min-w-0">
            <h2 id="client-search-title" className="text-sm font-semibold text-[var(--ew-ink)]">
              Search clients
            </h2>
            <p className="mt-1 text-xs text-[var(--ew-muted)]">
              Search by name, email, or phone number.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close client search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-ink)]"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b p-4 sm:px-5" style={{ borderColor: 'var(--ew-line)' }}>
          <label className="relative block">
            <input
              ref={inputRef}
              type="text"
              role="searchbox"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Search clients..."
              aria-label="Search clients by name, email, or phone"
              className="h-11 w-full rounded-xs border bg-surface px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
              style={{ borderColor: 'var(--ew-field-line)' }}
            />
          </label>
        </div>

        <div className="relative min-h-[12rem] max-h-[16rem] flex-1 overflow-y-auto" aria-busy={loading}>
          <div className={`min-h-[12rem] ${loading ? 'blur-sm' : ''}`}>
            {clients.length > 0 && (
              <ul className="divide-y" style={{ borderColor: 'var(--ew-line)' }}>
                {clients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(client)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-ground/70 sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--ew-ink)]">{client.name}</span>
                        <span className="mt-1 block truncate text-xs text-[var(--ew-muted)]">
                          {[client.email, client.phoneNumber].filter(Boolean).join(' · ') || 'No contact details'}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-[var(--ew-accent-strong)]">View</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!loading && !error && !debouncedQuery && (
              <p className="px-5 py-12 text-center text-sm text-[var(--ew-muted)]">
                Enter a name, email, or phone number to search.
              </p>
            )}
            {!loading && !error && debouncedQuery && clients.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-[var(--ew-muted)]">
                No clients found.
              </p>
            )}
            {error && (
              <p className="px-5 py-8 text-center text-sm text-danger-strong" role="alert">
                {error}
              </p>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--ew-surface)]/55" role="status" aria-label="Searching clients">
              <Loader size={2} />
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3 sm:px-5" style={{ borderColor: 'var(--ew-line)' }}>
          <p className="text-xs text-[var(--ew-muted)]">
            {debouncedQuery && !error ? `${total} result${total === 1 ? '' : 's'}` : 'Search results'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading || !debouncedQuery}
              className="rounded-xs border px-3 py-2 text-xs font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading || !debouncedQuery}
              className="rounded-xs bg-[#cc785c] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
