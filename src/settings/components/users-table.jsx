export default function UsersTable({ users, onSelectUser }) {
  const statusBadge = (status) => {
    const inactive = status === 'inactive'
    return (
      <span
        className={`inline-flex items-center rounded-xs px-2 py-0.5 text-micro font-semibold uppercase tracking-wide ${
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
    <>
      <div
        className="hidden h-[70vh] overflow-x-auto overflow-y-auto rounded-2xl border-2 md:block"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
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
            {users?.length ? users.map((user) => (
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
                    : '-'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--ew-muted)]">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 pb-24 md:hidden">
        {users?.length ? users.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser?.(user)}
            className="cursor-pointer rounded-lg border p-5 transition-colors hover:bg-ground/70"
            style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body font-semibold text-[var(--ew-ink)]">
                  {user.username}
                </p>
                <p className="mt-1 truncate text-body-sm text-[var(--ew-muted)]">
                  {user.email}
                </p>
              </div>
              <span className="shrink-0 rounded-xs bg-ground px-2.5 py-1 text-xs font-medium capitalize text-[var(--ew-muted)]">
                {user.role}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--ew-line)' }}>
              <p className="text-xs text-[var(--ew-muted)]">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
              {statusBadge(user.status)}
            </div>
          </div>
        )) : (
          <p className="py-12 text-center text-sm text-[var(--ew-muted)]">No users found.</p>
        )}
      </div>
    </>
  )
}
