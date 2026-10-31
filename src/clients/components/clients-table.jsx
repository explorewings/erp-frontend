export default function ClientsTable({
  clients = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  total = 0,
  onPrevious,
  onNext,
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
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border-2" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'var(--ew-ground)' }}>
              {['Name', 'Email', 'Phone number', 'Additional fields', 'Added'].map((label) => (
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
                  <td className="px-5 py-3.5 text-[var(--ew-ink)]">
                    {Object.entries(client.customFields || {}).length > 0
                      ? Object.entries(client.customFields).map(([key, value]) => (
                          <div key={key} className="max-w-xs truncate" title={`${key}: ${value}`}>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-[var(--ew-muted)]">{createdDate(client.createdAt)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--ew-muted)]">
                    {loading ? 'Loading clients...' : error || 'No clients found.'}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {clients.length > 0 ? clients.map((client) => (
          <article key={client.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-ground)' }}>
            <h3 className="truncate font-medium text-[var(--ew-ink)]">{client.name}</h3>
            <p className="mt-1 truncate text-sm text-[var(--ew-muted)]">{client.email || client.phoneNumber}</p>
            {client.email && client.phoneNumber && (
              <p className="mt-1 truncate text-sm text-[var(--ew-muted)]">{client.phoneNumber}</p>
            )}
            {Object.entries(client.customFields || {}).length > 0 && (
              <dl className="mt-2 space-y-1">
                {Object.entries(client.customFields).map(([key, value]) => (
                  <div key={key} className="flex gap-1 text-xs">
                    <dt className="font-medium text-[var(--ew-ink)]">{key}:</dt>
                    <dd className="min-w-0 truncate text-[var(--ew-muted)]">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-2 text-xs text-[var(--ew-muted)]">{createdDate(client.createdAt)}</p>
          </article>
        )) : (
          <p className="py-8 text-center text-sm text-[var(--ew-muted)]">
            {loading ? 'Loading clients...' : error || 'No clients found.'}
          </p>
        )}
      </div>
      <footer className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6" style={{ borderColor: 'var(--ew-line)' }}>
        <p className="text-sm text-[var(--ew-muted)]">
          Page {page} of {totalPages} · {total} results
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={page <= 1 || loading}
            className="rounded-xs border px-3 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={page >= totalPages || loading}
            className="rounded-xs bg-[#cc785c] px-3 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  )
}
