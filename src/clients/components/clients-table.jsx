import { LuTrash2 } from 'react-icons/lu'
import { MdKeyboardDoubleArrowRight } from 'react-icons/md'

export default function ClientsTable({
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
      {clients.length === 0 && !loading ? (
        <p
          className={`hidden py-12 text-center text-sm md:block ${error ? 'text-danger-strong' : 'text-[var(--ew-muted)]'}`}
          role={error ? 'alert' : undefined}
        >
          {error || 'No clients yet.'}
        </p>
      ) : (
        <div className="hidden h-[70vh] max-h-[70vh] flex-col overflow-hidden rounded-2xl border-2 md:flex" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: 'var(--ew-ground)' }}>
                  {['Name', 'Email', 'Phone number', 'Added', ...(canManage ? ['Actions'] : [])].map((label) => (
                    <th key={label} className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ew-muted)]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.length > 0 ? clients.map((client) => (
                  <tr key={client.id} className="border-b" style={{ borderColor: 'var(--ew-line)' }}>
                    <td className="px-5 py-3.5 font-medium text-[var(--ew-ink)]">{client.name}</td>
                    <td className="px-5 py-3.5 text-[var(--ew-ink)]">{client.email || '-'}</td>
                    <td className="px-5 py-3.5 text-[var(--ew-ink)]">{client.phoneNumber || '-'}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[var(--ew-muted)]">{createdDate(client.createdAt)}</td>
                    {canManage && (
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onView?.(client)} className="inline-flex h-8 items-center gap-1.5 rounded-xs bg-[#cc785c] px-3 text-xs font-medium text-white transition-colors hover:bg-[#b36a4e]">
                            View
                            <MdKeyboardDoubleArrowRight className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => onDelete?.(client)} aria-label={`Delete ${client.name}`} className="flex h-8 w-8 items-center justify-center rounded-xs bg-danger text-white transition-colors hover:bg-danger-strong">
                            <LuTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="px-5 py-12 text-center text-sm text-[var(--ew-muted)]">
                      {loading ? 'Loading clients...' : error || 'No clients found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6" style={{ borderColor: 'var(--ew-line)' }}>
            <p className="text-sm text-[var(--ew-muted)]">
              Page {page} of {totalPages} · {total} results
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={onPrevious} disabled={page <= 1 || loading} className="rounded-xs border px-3 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: 'var(--ew-line)' }}>
                Previous
              </button>
              <button type="button" onClick={onNext} disabled={page >= totalPages || loading} className="rounded-xs bg-[#cc785c] px-3 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:cursor-not-allowed disabled:opacity-60">
                Next
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  )
}
