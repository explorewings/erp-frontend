export default function UsersTable({ users, onSelectUser }) {
  if (!users || users.length === 0) {
    return (
      <div
        className="rounded-2xl border px-6 py-12 text-center text-sm text-[var(--ew-muted)]"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        No users found.
      </div>
    )
  }

  const statusBadge = (status) => {
    const inactive = status === 'inactive'
    return (
      <span
        className={`inline-flex items-center rounded-pill px-2 py-0.5 text-micro font-semibold uppercase tracking-wide ${
          inactive
            ? 'bg-[var(--ew-ground)] text-[var(--ew-muted)]'
            : 'bg-[#f0fdf4] text-[#15803d]'
        }`}
      >
        {inactive ? 'Inactive' : 'Active'}
      </span>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border-2"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)', height: '70vh' }}
    >
      {/* Desktop table */}
      <div className="hidden h-full overflow-x-auto overflow-y-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'var(--ew-ground)' }}>
              {['Username', 'Email', 'Role', 'Status', 'Created'].map((label) => (
                <th
                  key={label}
                  className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ew-muted)]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => onSelectUser?.(user)}
                className="group cursor-pointer border-b transition-colors hover:bg-[#cc785c]"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                <td className="px-5 py-3.5 font-medium text-[var(--ew-ink)] group-hover:text-white">
                  {user.username}
                </td>
                <td className="px-5 py-3.5 text-[var(--ew-ink)] group-hover:text-white">
                  {user.email}
                </td>
                <td className="px-5 py-3.5 text-[var(--ew-ink)] capitalize group-hover:text-white">
                  {user.role}
                </td>
                <td className="px-5 py-3.5">{statusBadge(user.status)}</td>
                <td className="px-5 py-3.5 text-[var(--ew-ink)] group-hover:text-white">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="h-full space-y-3 overflow-y-auto p-4 md:hidden">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser?.(user)}
            className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-[#cc785c] hover:text-white"
            style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-ground)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--ew-ink)]">
                  {user.username}
                </p>
                <p className="mt-0.5 truncate text-sm text-[var(--ew-muted)]">
                  {user.email}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs font-medium capitalize text-[var(--ew-muted)]">
                  {user.role}
                </span>
                {statusBadge(user.status)}
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--ew-muted)]">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
