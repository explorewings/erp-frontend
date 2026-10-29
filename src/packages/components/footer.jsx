export default function PackageFooter({ page, totalPages, total, onPrevious, onNext, canPrevious, canNext, className = '' }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 ${className}`}
    >
      <p className="text-sm text-[var(--ew-muted)]">
        Page {page} of {totalPages} · {total} results
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--ew-line)' }}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
