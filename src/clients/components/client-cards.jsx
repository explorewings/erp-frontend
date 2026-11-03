import { createPortal } from 'react-dom'
import { LuTrash2 } from 'react-icons/lu'
import { MdKeyboardDoubleArrowRight } from 'react-icons/md'
import PackageFooter from '../../packages/components/footer.jsx'

export default function ClientCards({
  clients = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  total = 0,
  onPrevious,
  onNext,
  onView,
  onDelete,
  isSelected = () => false,
  isSelectionLocked = () => false,
  onToggleSelection,
  canManage = false,
}) {
  const createdDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '-'

  return (
    <>
      <div className="space-y-3 pb-28 md:hidden">
        {clients.length > 0 ? clients.map((client) => (
          <article
            key={client.id}
            className="rounded-lg border p-5 transition-colors"
            style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {canManage && (
                <input
                  type="checkbox"
                  checked={isSelected(client)}
                  disabled={isSelectionLocked(client)}
                  onChange={() => onToggleSelection?.(client)}
                  aria-label={`Select ${client.name}`}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded-full accent-[#cc785c] disabled:cursor-not-allowed"
                />
              )}
              <h3 className="min-w-0 truncate text-body font-semibold text-[var(--ew-ink)]">{client.name}</h3>
            </div>
            <div className="mt-2 space-y-1">
              {client.email && <p className="truncate text-body-sm text-[var(--ew-muted)]">{client.email}</p>}
              {client.phoneNumber && <p className="truncate text-body-sm text-[var(--ew-muted)]">{client.phoneNumber}</p>}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--ew-line)' }}>
              <p className="text-xs text-[var(--ew-muted)]">{createdDate(client.createdAt)}</p>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onView?.(client)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e]">
                    View
                    <MdKeyboardDoubleArrowRight className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => onDelete?.(client)} aria-label={`Delete ${client.name}`} className="flex h-9 w-10 items-center justify-center rounded-xs bg-danger text-white transition-colors hover:bg-danger-strong">
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </article>
        )) : (
          <p
            className={`py-8 text-center text-sm ${error ? 'text-danger-strong' : 'text-[var(--ew-muted)]'}`}
            role={error ? 'alert' : undefined}
          >
            {loading ? 'Loading clients...' : error || 'No clients yet.'}
          </p>
        )}
      </div>
      {createPortal(
        <PackageFooter
          page={page}
          totalPages={totalPages}
          total={total}
          onPrevious={onPrevious}
          onNext={onNext}
          canPrevious={page > 1 && !loading}
          canNext={page < totalPages && !loading}
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden"
        />,
        document.body,
      )}
    </>
  )
}
