import { PackagesIcon } from '../../components/icons.jsx'

export default function PackageCard({ pkg }) {
  const image = pkg?.image1

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      {image && (
        <div className="mb-4 space-y-2">
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

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ew-ground)]">
          <PackagesIcon className="h-5 w-5 text-[var(--ew-ink)]" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-body font-semibold text-[var(--ew-ink)]">
            {pkg?.location}
          </h3>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--ew-muted)]">
            {pkg?.category || 'Uncategorized'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--ew-muted)]">
        <span>{pkg?.totalDays ? `${pkg.totalDays} days` : '-'}</span>
        <span className="font-medium text-[var(--ew-ink)]">
          {pkg?.price != null ? `INR ${pkg.price}` : '-'}
        </span>
      </div>

      {pkg?.ratings != null && (
        <p className="mt-1 text-xs text-[var(--ew-muted)]">Rating: {pkg.ratings}</p>
      )}
    </div>
  )
}
