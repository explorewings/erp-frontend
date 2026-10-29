import { useEffect, useState } from 'react'
import { useAuth } from '../../authetication/auth-context.js'
import { fetchPackages, fetchPackageCategories } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import Select from '../../appcomponents/select.jsx'
import PackageCard from '../components/package-card.jsx'

const LIMIT = 20

function Packages() {
  const { token } = useAuth()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!token) return
    fetchPackageCategories(token)
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchPackages(token, { search: debouncedSearch, category, page, limit: LIMIT })
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        setTotal(Number(data?.total) || 0)
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Unable to load packages.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, debouncedSearch, category, page])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category])

  return (
    <section className="ew-rise mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search packages..."
          className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm sm:w-64 text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
          style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
        />

        <Select
          className="shrink-0"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'All categories' },
            ...categories.map((cat) => ({ value: cat, label: cat })),
          ]}
          iconOnly
        />
      </div>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(194, 65, 12, 0.28)',
            background: 'rgba(194, 65, 12, 0.06)',
            color: 'var(--ew-accent-strong)',
          }}
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div
          className="flex items-center justify-center rounded-2xl border text-sm text-[var(--ew-muted)]"
          style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)', height: '50vh' }}
        >
          <Loader />
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="flex-1 overflow-y-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--ew-line) transparent',
            }}
          >
            {items.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            ) : items.length === 0 && !error ? (
              <div className="py-12 text-center text-sm text-[var(--ew-muted)]">
                No packages found.
              </div>
            ) : null}
          </div>

          <div
            className="flex items-center justify-between gap-3 border-t px-4 py-3"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <p className="text-sm text-[var(--ew-muted)]">
              Page {page} of {totalPages} · {total} results
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Packages
