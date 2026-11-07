import { useState } from 'react'
import { LuBell } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../authetication/auth-context.js'
import { useNotifications } from '../hooks/use-notifications.js'
import NotificationDrawer from './notification-drawer.jsx'

/** Header bell with an unread badge; opens the notifications drawer. Mounted once in the topbar.
 *  On mobile (<lg) it renders as a bare icon button like the menu button; from lg up it is the
 *  orange circle. `className` positions it in the topbar flex flow. */
export default function NotificationBell({ className = '' }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const data = useNotifications(token)
  const { unread } = data
  const label = unread ? `Notifications, ${unread} unread` : 'Notifications'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        title="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-control transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 lg:rounded-full lg:border lg:border-[#cc785c] ${
          open
            ? 'bg-ground text-ink lg:bg-[#fff5ef] lg:text-accent-strong'
            : 'text-muted hover:bg-ground hover:text-ink lg:bg-surface lg:text-[#cc785c]'
        } ${className}`}
      >
        <LuBell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
        {unread ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-[#cc785c] px-1 text-[10px] font-semibold leading-none tabular-nums text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      {open ? <NotificationDrawer data={data} onClose={() => setOpen(false)} onNavigate={(link) => navigate(link)} /> : null}
    </>
  )
}
