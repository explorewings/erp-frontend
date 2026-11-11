import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuBell, LuBellOff, LuCalendarClock, LuCheckCheck, LuClipboardX, LuListTodo, LuMegaphone, LuMessageSquareText, LuTriangleAlert, LuX } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { isTopDrawer, registerDrawer, useCloseOnBack } from '../../components/drawer-back.js'

const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

function ago(value) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relative.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 7) return relative.format(-days, 'day')
  return dateFormat.format(new Date(value))
}

/** Icon per kind. Kinds without one here fall back to the bell. */
function iconFor(item) {
  if (item.kind === 'task_failed') return { Icon: LuTriangleAlert, tone: 'text-danger-strong bg-danger-soft' }
  if (item.kind?.startsWith('task_')) return { Icon: LuListTodo, tone: 'text-accent-strong bg-[#fff5ef]' }
  if (item.kind?.startsWith('meeting_')) return { Icon: LuCalendarClock, tone: 'text-[#47637d] bg-[#eef2f6]' }
  if (item.kind === 'report_missing') return { Icon: LuClipboardX, tone: 'text-danger-strong bg-danger-soft' }
  if (item.kind?.startsWith('report_remarks_')) return { Icon: LuMessageSquareText, tone: 'text-accent-strong bg-[#fff5ef]' }
  if (item.kind?.startsWith('announcement_')) return { Icon: LuMegaphone, tone: 'text-[#8a6d1f] bg-[#f8f3e6]' }
  return { Icon: LuBell, tone: 'text-muted bg-ground' }
}

function NotificationItem({ item, onOpen }) {
  const { Icon, tone } = iconFor(item)
  const unread = !item.readAt
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={`relative flex w-full items-start gap-3 rounded-[10px] border px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(27,26,24,0.08),0_4px_10px_-6px_rgba(27,26,24,0.2)] outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[#dfae95] hover:bg-[#fff8f3] hover:shadow-[0_1px_2px_rgba(27,26,24,0.08),0_8px_18px_-8px_rgba(183,108,79,0.32)] focus-visible:border-[var(--ew-accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]/45 ${
          unread
            ? 'border-[#ecd6c9] bg-[#fff8f3]'
            : 'border-[#d9d2c9] bg-[var(--ew-surface)]'
        }`}
      >
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${tone}`}>
          <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className={`min-w-0 flex-1 ${unread ? 'pr-2.5' : ''}`}>
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-body-sm ${unread ? 'font-semibold text-ink' : 'font-medium text-ink/80'}`}>{item.title}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted">{ago(item.createdAt)}</span>
          </span>
          {item.body ? <span className={`mt-0.5 block text-xs leading-5 ${unread ? 'text-ink/75' : 'text-muted'}`}>{item.body}</span> : null}
        </span>
        {unread ? (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-[#cc785c]" aria-label="Unread" />
        ) : null}
      </button>
    </li>
  )
}

/**
 * Right-side drawer under the topbar listing the signed-in user's notifications,
 * newest first, 50 at a time (server page size). Opening an item marks it read and follows its link.
 */
export default function NotificationDrawer({ data, onClose, onNavigate }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(null)
  const idRef = useRef(null)
  if (idRef.current === null) idRef.current = Symbol('drawer')
  // Back button and Escape close the drawer; release() leaves the history marker
  // alone when following a notification link (the navigation must not be undone).
  const { close, release } = useCloseOnBack(true, onClose)
  const { items, status, error, hasMore, loadingMore, unread, loadFirst, loadMore, markRead } = data

  useEffect(() => registerDrawer(idRef.current), [])

  useEffect(() => {
    loadFirst()
    const returnTo = document.activeElement
    const frame = requestAnimationFrame(() => {
      setVisible(true)
      closeRef.current?.focus()
    })
    const onKey = (event) => {
      if (event.key === 'Escape' && isTopDrawer(idRef.current)) close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      returnTo?.focus?.()
    }
  }, [loadFirst, close])

  const open = (item) => {
    if (!item.readAt) markRead([item.id])
    release()
    if (item.link) onNavigate(item.link)
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-ink/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
        onMouseDown={close}
      />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 motion-reduce:transition-none sm:w-[26rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionTimingFunction: ease }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-title"
          className="flex h-full w-full flex-col border-l border-line bg-[#f8f7f5] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id="notifications-title" className="text-sm font-semibold text-ink">
                Notifications
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {unread ? (
                <button
                  type="button"
                  onClick={() => markRead()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-line px-2.5 text-xs font-medium text-ink transition-colors hover:bg-ground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
                >
                  <LuCheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Mark read
                </button>
              ) : null}
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close notifications"
                className="flex h-8 w-8 items-center justify-center rounded-xs border border-line text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
              >
                <LuX className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-busy={status === 'loading'}>
            {status === 'loading' ? (
              <div className="flex h-full items-center justify-center" role="status" aria-label="Loading notifications">
                <Loader size={2.2} />
              </div>
            ) : status === 'error' && !items.length ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-body-sm text-danger-strong" role="alert">
                  {error}
                </p>
                <button type="button" onClick={loadFirst} className="mt-2 text-xs font-medium text-ink underline underline-offset-4">
                  Try again
                </button>
              </div>
            ) : items.length ? (
              <>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <NotificationItem key={item.id} item={item} onOpen={open} />
                  ))}
                </ul>
                {error ? (
                  <p className="mt-2 text-center text-[11px] text-danger-strong" role="alert">
                    {error}
                  </p>
                ) : null}
                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#d9d2c9] bg-white/70 text-xs font-medium text-ink transition-colors hover:border-[#dfae95] hover:bg-[#fff8f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]/45 disabled:cursor-wait"
                  >
                    {loadingMore ? <Loader size={1.1} /> : 'Load more'}
                  </button>
                ) : null}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-tile border border-line bg-surface text-muted">
                  <LuBellOff className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <p className="mt-4 text-body-sm font-medium text-ink">You're all caught up</p>
                <p className="mt-1 max-w-[30ch] text-xs leading-5 text-muted">
                  New tasks, meetings and announcements for you will show up here.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>,
    document.body,
  )
}
