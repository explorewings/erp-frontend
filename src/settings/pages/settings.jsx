import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../authetication/auth-context.js'
import { fetchUsers } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import UsersTable from '../components/users-table.jsx'
import CreateUserModal from '../components/create-user-modal.jsx'
import { LuPlus } from 'react-icons/lu'
import { NAV_ITEMS } from '../../erplayout/nav.js'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'permissions', label: 'Permissions' },
]

export default function Settings() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef([])

  useEffect(() => {
    if (activeTab !== 'users' || !token) return

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetchUsers(token)
      .then((data) => {
        if (controller.signal.aborted) return
        setUsers(data)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err?.message || 'Unable to load users.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [activeTab, token])

  useEffect(() => {
    const update = () => {
      const index = TABS.findIndex((tab) => tab.id === activeTab)
      const node = tabRefs.current[index]
      if (!node) return
      setSliderStyle({ left: node.offsetLeft, width: node.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab])

  const tabActions = (
    <div
      className="relative inline-flex rounded-lg border p-1"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      <div
        className="absolute inset-y-1 rounded-xs bg-[#cc785c] transition-all duration-300 ease-out"
        style={{ left: sliderStyle.left, width: sliderStyle.width }}
      />
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 rounded-xs px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-[var(--ew-muted)]'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
    <section className={`ew-rise mx-auto max-w-6xl space-y-6 ${isCreateOpen ? 'blur-sm pointer-events-none select-none' : ''}`}>
      <div className="flex items-center justify-between">
        {tabActions}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          aria-label="Create user"
          className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
        >
          <LuPlus className="h-4 w-4" />
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {error && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'rgba(194, 65, 12, 0.28)',
                background: 'rgba(194, 65, 12, 0.06)',
                color: 'var(--ew-accent-strong)',
              }}
            >
              {error}
            </div>
          )}

          {isLoading ? (
            <div
              className="flex items-center justify-center rounded-2xl border text-sm text-[var(--ew-muted)]"
              style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)', height: '70vh' }}
            >
              <Loader />
            </div>
          ) : (
            <UsersTable users={users} />
          )}
        </>
      )}

      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.Icon
            return (
              <div
                key={item.to}
                className="rounded-lg border p-5 transition-colors hover:bg-orange-600/30"
                style={{
                  borderColor: 'var(--ew-line)',
                  background: 'var(--ew-surface)',
                }}
              >
                <div className="flex items-start gap-3">
                  {Icon && (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: '#cc785c' }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--ew-ink)]">
                      {item.label}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
    <Toast open={!!toast} message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    <CreateUserModal
      open={isCreateOpen}
      token={token}
      onClose={() => setIsCreateOpen(false)}
      onCreated={(created) => {
        setUsers((prev) => [created, ...prev])
        setToast({ message: 'User created', type: 'success' })
      }}
    />
    </>
  )
}
