import Loader from '../../appcomponents/loader.jsx'
import PackageCard from './package-card.jsx'

export default function PackageList({ items = [], isLoading = false, error = null }) {
  if (error) {
    return (
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
    )
  }

  return (
    <div className="h-[70vh] overflow-y-auto rounded-2xl border p-4" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader />
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-[var(--ew-muted)]">
          No packages found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  )
}
