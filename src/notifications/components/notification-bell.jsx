import { useState } from 'react'
import { LuBell } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../authetication/auth-context.js'
import { useNotifications } from '../hooks/use-notifications.js'
import NotificationDrawer from './notification-drawer.jsx'

/** Header bell with an unread badge; opens the notifications drawer. Mounted once in the topbar. */
export default function NotificationBell() {
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
        className={`relative flex h-9 w-9 items-center justify-center rounded-control border transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${
          open ? 'border-[#cc785c] bg-[#fff5ef] text-accent-strong' : 'border-line bg-surface text-muted hover:bg-ground hover:text-ink'
        }`}
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
