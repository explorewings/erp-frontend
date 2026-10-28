export default function EmptyState({ icon, title, description, note }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-7 sm:p-9">
      {icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-tile border border-line bg-ground text-muted">
          {icon}
        </span>
      )}
      <h2 className="mt-5 text-title font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-body leading-relaxed text-muted">
        {description}
      </p>
      {note && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1 text-label font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-pill bg-line" aria-hidden="true" />
          {note}
        </p>
      )}
    </div>
  )
}
