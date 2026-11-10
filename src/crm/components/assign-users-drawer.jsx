import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuArrowLeftRight, LuCircleUserRound, LuUsers, LuX } from 'react-icons/lu'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import { fetchCrmUsers } from '../api.js'
import InlineError from './inline-error.jsx'
import PipelineTag from './pipeline-tag.jsx'
import SlidingTabs from './sliding-tabs.jsx'

const TABS = [
  { id: 'pipeline-access', label: 'Pipeline access' },
  { id: 'deal-assign', label: 'Deal assign' },
]

const ASSIGNMENT_METHODS = [
  {
    id: 'round-robin',
    title: 'Round robin',
    description: 'Assign each new deal to the next available user in turn.',
    Icon: LuArrowLeftRight,
  },
  {
    id: 'creator-manual',
    title: 'Creator + manual',
    description: 'Assign the deal to the person who added it, then allow manual reassignment.',
    Icon: LuCircleUserRound,
  },
  {
    id: 'least-loaded',
    title: 'Least loaded',
    description: 'Assign each new deal to the eligible user with the fewest deals.',
    Icon: LuUsers,
  },
]

export default function AssignUsersDrawer({ open, token, pipeline, onClose }) {
  if (!open || !pipeline) return null
  return <AssignUsersDrawerContent token={token} pipeline={pipeline} onClose={onClose} />
}

function AssignUsersDrawerContent({ token, pipeline, onClose }) {
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError('')
    fetchCrmUsers(token)
      .then((list) => {
        if (!cancelled) setUsers(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load users.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, reloadTick])

  const closeDrawer = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  const closeDrawerRef = useRef(closeDrawer)
  closeDrawerRef.current = closeDrawer

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeDrawerRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const assignedUserIds = Array.isArray(pipeline.allowedUserIds) ? pipeline.allowedUserIds : []
  const assignedUsers = assignedUserIds.map((id) => ({
    id,
    user: users.find((candidate) => candidate.id === id),
  }))

  return createPortal(
    <>
      <DrawerBackdrop />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[32rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-users-title"
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-5">
            <div className="flex min-w-0 items-center gap-2">
              <LuUsers className="h-4 w-4 shrink-0 text-[var(--ew-ink)]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="assign-users-title" className="text-sm font-semibold text-[var(--ew-ink)]">
                  Assign users
                </h2>
                <PipelineTag name={pipeline.name} />
              </div>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close assign users"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink"
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <div className="border-b border-[var(--ew-line)] px-5 py-3">
            <SlidingTabs
              tabs={TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              ariaLabel="User assignment settings"
              idPrefix="assign-users"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <section
              id="assign-users-panel-pipeline-access"
              role="tabpanel"
              aria-labelledby="assign-users-tab-pipeline-access"
              hidden={activeTab !== 'pipeline-access'}
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[var(--ew-ink)]">Users with pipeline access</h3>
                <p className="mt-1 text-xs text-[var(--ew-muted)]">
                  These users can access this pipeline and its deals.
                </p>
              </div>
              {isLoading ? (
                <p role="status" className="py-6 text-center text-sm text-[var(--ew-muted)]">
                  Loading users...
                </p>
              ) : error ? (
                <InlineError>
                  {error}
                  <button
                    type="button"
                    onClick={() => setReloadTick((tick) => tick + 1)}
                    className="ml-2 font-medium underline"
                  >
                    Retry
                  </button>
                </InlineError>
              ) : assignedUsers.length === 0 ? (
                <p className="rounded-xs border border-dashed p-4 text-sm text-[var(--ew-muted)]">
                  No users are assigned to this pipeline.
                </p>
              ) : (
                <ul className="space-y-2">
                  {assignedUsers.map(({ id, user }) => (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 rounded-xs border px-3 py-2"
                      style={{ borderColor: 'var(--ew-line)' }}
                    >
                      <span className="min-w-0 truncate text-sm text-[var(--ew-ink)]">
                        {user?.username || 'User unavailable'}
                        {user?.id === pipeline.createdBy ? (
                          <span className="ml-2 text-xs text-[var(--ew-muted)]">Pipeline creator</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs capitalize text-[var(--ew-muted)]">
                        {user ? user.role : 'Unavailable'}
                        {user?.status === 'inactive' ? ' · Inactive' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              id="assign-users-panel-deal-assign"
              role="tabpanel"
              aria-labelledby="assign-users-tab-deal-assign"
              hidden={activeTab !== 'deal-assign'}
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[var(--ew-ink)]">Deal assignment method</h3>
                <p className="mt-1 text-xs text-[var(--ew-muted)]">
                  Choose how deals should be assigned to users with pipeline access.
                </p>
              </div>
              <div className="space-y-3">
                {ASSIGNMENT_METHODS.map(({ id, title, description, Icon }) => (
                  <article
                    key={id}
                    className="flex items-start gap-3 rounded-control border p-4"
                    style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#cc785c]/10 text-[#b76c4f]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[var(--ew-ink)]">{title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">{description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </>,
    document.body,
  )
}
