import { PackagesIcon } from '../../components/icons.jsx'

export default function PackageCard({ pkg, onView }) {
  const image = pkg?.image1

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      {image && (
        <div className="mb-3 space-y-2">
          <div className="overflow-hidden rounded-control border" style={{ borderColor: 'var(--ew-line)' }}>
            <img
              src={image}
              alt={pkg?.location || 'Package image'}
              loading="lazy"
              className="h-44 w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </div>

        </div>
      )}

      <div className="min-w-0">
        <h3 className="truncate text-body font-semibold text-[var(--ew-ink)]">
          {pkg?.location}
        </h3>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--ew-muted)]">
          {pkg?.category || 'Uncategorized'}
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-success">
          {pkg?.price != null ? `INR ${pkg.price}` : '-'}
        </span>
        <button
          type="button"
          onClick={() => onView?.(pkg)}
          className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e]"
        >
          View
        </button>
      </div>
    </div>
  )
}
