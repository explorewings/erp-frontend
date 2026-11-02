import { LuTrash2 } from 'react-icons/lu'

const statusStyles = {
  completed: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger-strong',
  processing: 'bg-accent-soft text-accent-strong',
  deleting: 'bg-danger-soft text-danger-strong',
}

export default function ClientImportCard({
  clientImport,
  canDelete = false,
  isDeleting = false,
  deleteProgress = 0,
  onDelete,
}) {
  const createdDate = clientImport.createdAt
    ? new Date(clientImport.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '-'
  const status = isDeleting ? 'deleting' : clientImport.status || 'processing'
  const statusClass = statusStyles[status] || statusStyles.processing

  return (
    <article
      className="min-w-0 rounded-control border p-4 sm:p-5"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--ew-ink)]">
          {clientImport.name}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`${status === 'completed' || status === 'deleting' ? 'rounded-none' : 'rounded-pill'} px-2.5 py-1 text-xs font-medium capitalize ${statusClass}`}>
            {status}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--ew-ink)]">
            {clientImport.importedRows} <span className="text-sm font-normal text-[var(--ew-muted)]">/ {clientImport.totalRows} rows</span>
          </p>
          <p className="mt-1 text-xs text-[var(--ew-muted)]">Client records imported</p>
          <time className="mt-1 block text-xs text-[var(--ew-muted)]" dateTime={clientImport.createdAt || undefined}>
            {createdDate}
          </time>
        </div>
        {canDelete && !isDeleting && status !== 'processing' && (
          <button
            type="button"
            onClick={() => onDelete?.(clientImport)}
            aria-label={`Delete ${clientImport.name} import`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border text-danger-strong transition-colors hover:bg-danger-soft"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <LuTrash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {isDeleting && (
        <div className="mt-4 px-2 pb-1" role="status" aria-label={`Deleting clients from ${clientImport.name}`}>
          <p className="mb-2 text-center text-xs font-medium text-danger-strong">
            Deleting clients · {Math.round(deleteProgress)}%
          </p>
          <div
            className="h-2 overflow-hidden rounded-pill bg-danger-soft"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(deleteProgress)}
          >
            <div
              className="h-full rounded-pill bg-danger transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, deleteProgress))}%` }}
            />
          </div>
        </div>
      )}
    </article>
  )
}
