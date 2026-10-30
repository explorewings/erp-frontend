import { useEffect, useState } from 'react'
import { useAuth } from '../../authetication/auth-context.js'
import { fetchPackages, fetchPackageCategories } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import Select from '../../appcomponents/select.jsx'
import PackageCard from '../components/package-card.jsx'
import PackageFooter from '../components/footer.jsx'

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
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
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
          className="mx-auto w-full max-w-6xl rounded-xl border px-4 py-3 text-sm"
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
          className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--ew-muted)]"
        >
          <Loader />
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--ew-line) transparent',
            }}
          >
            {items.length > 0 ? (
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
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

          <PackageFooter
            page={page}
            totalPages={totalPages}
            total={total}
            onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            onNext={() =>
              setPage((currentPage) => Math.min(totalPages, currentPage + 1))
            }
            canPrevious={page > 1}
            canNext={page < totalPages}
            className="mx-[-1rem] border-t bg-surface sm:mx-[-2rem]"
          />
        </div>
      )}
    </section>
  )
}

export default Packages
