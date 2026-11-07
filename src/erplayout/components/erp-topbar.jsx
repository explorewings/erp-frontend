import { useLocation } from 'react-router-dom'
import { getSectionLabel } from '../nav.js'
import { MenuIcon } from '../../components/icons.jsx'
import UserMenu from './user-menu.jsx'
import NotificationBell from '../../notifications/components/notification-bell.jsx'

export default function ErpTopbar({ onMenu }) {
  const { pathname } = useLocation()
  const section = getSectionLabel(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <NotificationBell className="order-3 lg:order-2" />
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="order-3 ml-auto flex h-9 w-9 items-center justify-center rounded-control text-muted outline-none transition-colors hover:bg-ground hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15 lg:order-none lg:ml-0 lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <p className="order-2 min-w-0 flex-1 truncate text-center text-body font-semibold tracking-[-0.01em] text-ink lg:order-none lg:text-left">
        {section}
      </p>

      <div className="order-1 flex items-center gap-3 lg:order-3">
        <UserMenu />
      </div>
    </header>
  )
}
