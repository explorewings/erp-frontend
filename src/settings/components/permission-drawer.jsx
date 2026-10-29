import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'
import { fetchMenuAccess, saveMenuAccess } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import Tooltip from '../../appcomponents/tooltip.jsx'

export default function PermissionDrawer({ menu, open, token, users, onClose, onSaved }) {
  const [selected, setSelected] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [visible, setVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  useEffect(() => {
    if (!open || !token || !menu) return undefined
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchMenuAccess(token, menu.key)
      .then((rows) => {
        if (cancelled) return
        const rowMap = new Map((Array.isArray(rows) ? rows : []).map((row) => [row.userId, row.allowed]))
        const next = new Set()
        for (const user of users || []) {
          const hasRow = rowMap.has(user.id)
          const allowed = hasRow ? rowMap.get(user.id) : true
          if (allowed) next.add(user.id)
        }
        setSelected(next)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Unable to load access.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, token, menu, users])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const closeDrawer = () => {
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

  if (!open || !menu) return null

  const toggleUser = (userId) => (event) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (event.target.checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  const handleSave = async () => {
    if (!menu || !token) return
    setIsSaving(true)
    setError(null)
    try {
      await saveMenuAccess(token, menu.key, Array.from(selected))
      onSaved?.('Access updated')
      closeDrawer()
    } catch (err) {
      setError(err?.message || 'Unable to save access.')
    } finally {
      setIsSaving(false)
    }
  }

  const Icon = menu.Icon
  const isSuper = (user) => user.role === 'superadmin' || user.role === 'superuser'

  return createPortal(
    <div
      className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[28rem] ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <aside className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel">
        <div className="flex h-12 items-center justify-between border-b border-[var(--ew-line)] px-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[var(--ew-ink)]" />}
            <h2 className="text-title text-[var(--ew-ink)]">{menu.label} access</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : (
            (users || []).map((user) => {
              const superUser = isSuper(user)
              const row = (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 rounded-xs border p-3 transition-colors ${
                    superUser ? "cursor-default opacity-70" : "cursor-pointer hover:bg-ground/70"
                  }`}
                  style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#cc785c] disabled:cursor-default"
                    checked={superUser ? true : selected.has(user.id)}
                    disabled={superUser}
                    onChange={toggleUser(user.id)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-[var(--ew-ink)]">
                      {user.username}
                    </p>
                    <p className="truncate text-xs text-[var(--ew-muted)]">
                      {user.email} - {user.role}
                    </p>
                  </div>
                </label>
              )
              return superUser ? (
                <Tooltip key={user.id} content="Full access granted" className="block w-full">
                  {row}
                </Tooltip>
              ) : (
                row
              )
            })
          )}

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
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--ew-line)] p-4">
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save access'}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
