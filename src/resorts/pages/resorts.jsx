import { useEffect, useState } from 'react'
import { useAuth } from '../../authetication/auth-context.js'
import { LuPlus } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import PackageFooter from '../../packages/components/footer.jsx'
import { fetchResorts } from '../api.js'
import AddResorts from '../components/add-resorts.jsx'
import ResortCard from '../components/resort-card.jsx'
import ResortsDetailDrawer from '../components/resortsdetaildrawer.jsx'

const LIMIT = 20

export default function Resorts() {
  const { token } = useAuth()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch])

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchResorts(token, { search: debouncedSearch, page, limit: LIMIT })
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        setTotal(Number(data?.total) || 0)
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load resorts.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, debouncedSearch, page, refreshKey])

  return (
    <>
      <section className="relative flex min-h-0 flex-1 flex-col gap-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resorts..." className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-64" style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }} />
          <button type="button" onClick={() => setAddOpen(true)} aria-label="Create resort" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white hover:bg-[#b36a4e]"><LuPlus className="h-4 w-4" /></button>
        </div>
        {error && <div role="alert" className="mx-auto w-full max-w-6xl rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)', color: 'var(--ew-accent-strong)' }}>{error}</div>}
        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--ew-muted)]"><Loader /></div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--ew-line) transparent' }}>
              {items.length > 0 ? (
                <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((resort) => <ResortCard key={resort.id} resort={resort} onView={setSelected} />)}
                </div>
              ) : !error ? <div className="py-12 text-center text-sm text-[var(--ew-muted)]">No resorts found.</div> : null}
            </div>
            <PackageFooter page={page} totalPages={totalPages} total={total} onPrevious={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => Math.min(totalPages, current + 1))} canPrevious={page > 1} canNext={page < totalPages} className="mx-[-1rem] border-t bg-surface sm:mx-[-2rem]" />
          </div>
        )}
        <AddResorts open={addOpen} token={token} onClose={() => setAddOpen(false)} onCreated={() => {
          setPage(1)
          setRefreshKey((current) => current + 1)
          setToast({ message: 'Resort created', type: 'success' })
        }} onUpdated={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} />
        <ResortsDetailDrawer open={!!selected} resort={selected} token={token} onClose={() => setSelected(null)} onUpdate={(updated) => {
          setItems((current) => current.map((item) => item.id === updated.id ? updated : item))
          setSelected(updated)
        }} onNotify={(message) => setToast({ message, type: 'success' })} onDeleted={(deletedId, warnings) => {
          setItems((current) => current.filter((item) => item.id !== deletedId))
          const nextTotal = Math.max(0, total - 1)
          const nextPages = Math.max(1, Math.ceil(nextTotal / LIMIT))
          setTotal(nextTotal)
          setPage((current) => Math.min(current, nextPages))
          setRefreshKey((current) => current + 1)
          setSelected(null)
          setToast(warnings.length ? { message: `Resort deleted. ${warnings.join(' ')}`, type: 'error' } : { message: 'Resort deleted', type: 'success' })
        }} />
      </section>
      <Toast open={!!toast} message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </>
  )
}
