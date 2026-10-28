import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../authetication/auth-context.js'
import { useSignOut } from '../../authetication/use-sign-out.js'
import { ChevronIcon, LogoutIcon } from '../../components/icons.jsx'

export default function UserMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const signOut = useSignOut()

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!open) return undefined

    const handlePointer = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSignOut = () => {
    setOpen(false)
    signOut()
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-control py-1 pl-1 pr-2 outline-none transition-colors hover:bg-ground focus-visible:ring-4 focus-visible:ring-accent/15"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-pill bg-[#cc785c] text-label font-semibold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[16ch] truncate text-meta font-semibold leading-tight text-ink">
            {user?.username}
          </span>
          <span className="block max-w-[16ch] truncate text-label leading-tight text-muted">
            {user?.email}
          </span>
        </span>
        <ChevronIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-tile border border-line bg-surface p-1.5 shadow-panel"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-body-sm font-semibold text-ink">{user?.username}</p>
            <p className="mt-0.5 truncate text-meta text-muted">{user?.email}</p>
            {user?.role && (
              <p className="mt-2 inline-flex rounded-pill bg-accent-soft px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-accent-strong">
                {user.role}
              </p>
            )}
          </div>

          <div className="my-1 h-px bg-line" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-body-sm font-medium text-ink outline-none transition-colors hover:bg-ground focus-visible:ring-4 focus-visible:ring-accent/15"
          >
            <LogoutIcon className="h-[18px] w-[18px] text-muted" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
