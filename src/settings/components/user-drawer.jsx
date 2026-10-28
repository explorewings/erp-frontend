import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuPen, LuTrash2, LuX } from 'react-icons/lu'
import { deleteUser, updateUser } from '../api.js'
import Alert from '../../appcomponents/alert.jsx'

export default function UserDrawer({ user, open, token, onClose, onUpdate, onNotify, onDeleted }) {
  const [visible, setVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  onCloseRef.current = onClose
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', role: 'staff', password: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(false)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const closeOverlay = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  useEffect(() => {
    if (!open) return undefined
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
  }, [open])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (open && user) {
      setForm({
        username: user.username ?? '',
        email: user.email ?? '',
        role: user.role ?? 'staff',
        password: '',
      })
      setIsEditing(false)
      setError(null)
    }
  }, [open, user])

  if (!open || !user) return null

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    const payload = {}
    if (form.username.trim() && form.username.trim() !== user.username) payload.username = form.username.trim()
    if (form.email.trim() && form.email.trim().toLowerCase() !== user.email) payload.email = form.email.trim()
    if (form.role && form.role !== user.role) payload.role = form.role
    if (form.password) payload.password = form.password

    try {
      const updated = Object.keys(payload).length ? await updateUser(token, user.id, payload) : user
      onUpdate?.(updated)
      onNotify?.('User details saved successfully')
      setIsEditing(false)
    } catch (err) {
      setError(err?.message || 'Unable to update user.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    setIsToggling(true)
    try {
      const nextStatus = user.status === 'inactive' ? 'active' : 'inactive'
      const updated = await updateUser(token, user.id, { status: nextStatus })
      onUpdate?.(updated)
      onNotify?.(nextStatus === 'inactive' ? 'User deactivated' : 'User activated')
    } catch (err) {
      onNotify?.(err?.message || 'Unable to update user status.')
    } finally {
      setIsToggling(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteUser(token, user.id)
      onDeleted?.(user.id)
      onNotify?.('User deleted')
      onClose()
    } catch (err) {
      onNotify?.(err?.message || 'Unable to delete user.')
    } finally {
      setIsDeleting(false)
      setShowDeleteAlert(false)
    }
  }

  const details = [
    { label: 'Username', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role },
    {
      label: 'Created',
      value: user.createdAt
        ? new Date(user.createdAt).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    },
  ]

  return createPortal(
    <div
      className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[26rem] ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <aside
        className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
      >
        <div className="flex h-12 items-center justify-between border-b border-[var(--ew-line)] px-4">
          <h2 className="text-title text-[var(--ew-ink)]">{isEditing ? 'Edit user' : 'User details'}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Edit user"
                className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] focus-visible:ring-4 focus-visible:ring-accent/15"
              >
                <LuPen className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeOverlay}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isEditing ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {details.map((row) => (
              <div key={row.label}>
                <p className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">
                  {row.label}
                </p>
                <p className="mt-1 text-body-sm text-[var(--ew-ink)]">{row.value || '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <form id="edit-user-form" className="flex-1 space-y-4 overflow-y-auto p-4" onSubmit={handleSave}>
            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="eu-username">
                Username
              </label>
              <input
                id="eu-username"
                className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              />
            </div>

            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="eu-email">
                Email
              </label>
              <input
                id="eu-email"
                type="email"
                className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>

            <div>
              <span className="block text-label font-medium text-[var(--ew-muted)]">Role</span>
              <div className="mt-2 inline-flex rounded-lg border p-1" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
                {['admin', 'staff'].map((role) => {
                  const isActive = form.role === role
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, role }))}
                      className={`${isActive ? 'rounded-xs' : 'rounded-lg'} px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-out`}
                      style={
                        isActive
                          ? { background: '#cc785c', color: '#fff' }
                          : { color: 'var(--ew-muted)' }
                      }
                    >
                      {role === 'admin' ? 'Admin' : 'Staff'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="eu-password">
                New password (optional)
              </label>
              <input
                id="eu-password"
                type="password"
                minLength={6}
                className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>

            {error && (
              <div
                className="rounded-xs border px-3 py-2 text-body-sm"
                style={{
                  borderColor: 'rgba(194, 65, 12, 0.28)',
                  background: 'rgba(194, 65, 12, 0.06)',
                  color: 'var(--ew-accent-strong)',
                }}
              >
                {error}
              </div>
            )}

          </form>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--ew-line)] p-4">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-user-form"
                disabled={isSaving}
                className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isToggling || user?.role === 'superadmin' || user?.role === 'superuser'}
                className="rounded-xs bg-[#5f5b55] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#4a4640] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {user.status === 'inactive' ? 'Activate' : 'Deactivate'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteAlert(true)}
                disabled={isDeleting || user?.role === 'superadmin' || user?.role === 'superuser'}
                className="rounded-xs bg-danger px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-danger-strong disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </>
          )}
        </div>

        <Alert
          open={showDeleteAlert}
          title="Delete user?"
          description="This action cannot be undone. The user will be permanently removed."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="destructive"
          isConfirming={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteAlert(false)}
        />
      </aside>
    </div>,
    document.body,
  )
}
