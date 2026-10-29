import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../authetication/auth-context.js'
import { fetchUsers, fetchAccess, saveAccess, fetchAccessItems } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import UsersTable from '../components/users-table.jsx'
import PermissionDrawer from '../components/permission-drawer.jsx'
import UserDrawer from '../components/user-drawer.jsx'
import CreateUserModal from '../components/create-user-modal.jsx'
import { LuPlus } from 'react-icons/lu'
import { NAV_ITEMS } from '../../erplayout/nav.js'
import { SettingsIcon } from '../../components/icons.jsx'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'permissions', label: 'Permissions' },
]

export default function Settings() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [toast, setToast] = useState(null)
  const [users, setUsers] = useState([])
  const [accessItems, setAccessItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [permissionsUser, setPermissionsUser] = useState(null)
  const [permissionCodes, setPermissionCodes] = useState(null)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [permissionError, setPermissionError] = useState(null)
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef([])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchUsers(token)
      .then((data) => {
        if (cancelled) return
        setUsers(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Unable to load users.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchAccessItems(token, 'menu')
      .then((items) => setAccessItems(Array.isArray(items) ? items : []))
      .catch(() => setAccessItems([]))
  }, [token])

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

  useEffect(() => {
    if (activeTab !== 'permissions' || !permissionsUser || !token) return
    let cancelled = false
    setIsLoadingPermissions(true)
    setPermissionError(null)
    fetchAccess(token, permissionsUser.id)
      .then((rows) => {
        if (cancelled) return
        const codes = Array.isArray(rows) && rows.length
          ? rows.filter((row) => row.allowed).map((row) => row.code)
          : null
        setPermissionCodes(codes)
      })
      .catch((err) => {
        if (cancelled) return
        setPermissionError(err?.message || 'Unable to load access.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPermissions(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, permissionsUser, token])

  const handleSavePermissions = async () => {
    if (!permissionsUser || !token) return
    setIsSavingPermissions(true)
    setPermissionError(null)
    const selectedCodes = permissionCodes === null
      ? NAV_ITEMS.map((item) => item.key)
      : permissionCodes
    try {
      await saveAccess(token, permissionsUser.id, selectedCodes)
      setToast({ message: 'Access updated', type: 'success' })
    } catch (err) {
      setPermissionError(err?.message || 'Unable to save access.')
    } finally {
      setIsSavingPermissions(false)
    }
  }

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
    <section className={`ew-rise mx-auto max-w-6xl space-y-6 ${(isCreateOpen || selectedUser || selectedMenu) ? 'blur-sm pointer-events-none select-none' : ''}`}>
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
            <UsersTable users={users} onSelectUser={setSelectedUser} />
          )}
        </>
      )}

      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accessItems.map((item) => {
            const meta = NAV_ITEMS.find((entry) => entry.key === item.code) || {}
            const Icon = meta.Icon || SettingsIcon
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setSelectedMenu({ key: item.code, label: item.name, Icon, description: item.description || meta.description })}
                className="rounded-lg border p-5 text-left transition-colors hover:bg-ground/70"
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
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">
                        {item.description || meta.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
    <PermissionDrawer
      menu={selectedMenu}
      open={!!selectedMenu}
      token={token}
      users={users}
      onClose={() => setSelectedMenu(null)}
      onSaved={(message) => setToast({ message, type: 'success' })}
    />
    <Toast open={!!toast} message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    <UserDrawer
      user={selectedUser}
      open={!!selectedUser}
      token={token}
      onClose={() => setSelectedUser(null)}
      onUpdate={(updated) => {
        setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        setSelectedUser(updated)
      }}
      onNotify={(message) => setToast({ message, type: 'success' })}
      onDeleted={(id) => {
        setUsers((prev) => prev.filter((item) => item.id !== id))
        setSelectedUser(null)
        setToast({ message: 'User deleted', type: 'success' })
      }}
    />
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
