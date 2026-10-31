export default function ResortCard({ resort, onView }) {
  return (
    <article
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      {resort?.image1 && (
        <div className="mb-3 overflow-hidden rounded-control border" style={{ borderColor: 'var(--ew-line)' }}>
          <img
            src={resort.image1}
            alt={resort.location || 'Resort image'}
            loading="lazy"
            className="h-44 w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}
      <h3 className="truncate text-body font-semibold text-[var(--ew-ink)]">
        {resort?.location || 'Untitled resort'}
      </h3>
      {resort?.description && (
        <p className="mt-1 line-clamp-2 text-body-sm text-[var(--ew-muted)]">
          {resort.description}
        </p>
      )}
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-success">
          {resort?.price != null ? `INR ${resort.price}` : '-'}
        </span>
        <button
          type="button"
          onClick={() => onView?.(resort)}
          className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e]"
        >
          View
        </button>
      </div>
    </article>
  )
}
