import { useEffect, useMemo, useState } from 'react'
import { loginRequest } from './api.js'
import { AuthContext } from './auth-context.js'
import { fetchMyAccess } from '../settings/api.js'

const STORAGE_KEY = 'ew.erp.session'

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [accessRefreshError, setAccessRefreshError] = useState('')
  const [menuAccessLoading, setMenuAccessLoading] = useState(true)

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  }, [session])

  useEffect(() => {
    const token = session?.token
    if (!token) {
      setAccessRefreshError('')
      setMenuAccessLoading(false)
      return undefined
    }

    let cancelled = false
    const refreshMenuAccess = async (initial = false) => {
      try {
        const access = await fetchMyAccess(token)
        if (cancelled) return
        setSession((current) => (
          current?.token === token
            ? {
                ...current,
                user: { ...current.user, role: access.role },
                grantedMenus: access.grantedMenus,
              }
            : current
        ))
        setAccessRefreshError('')
      } catch (error) {
        if (!cancelled) {
          setSession((current) => (
            current?.token === token ? { ...current, grantedMenus: [] } : current
          ))
          setAccessRefreshError(error?.message || 'Unable to refresh menu access.')
        }
      } finally {
        if (initial && !cancelled) setMenuAccessLoading(false)
      }
    }

    setMenuAccessLoading(true)
    void refreshMenuAccess(true)
    const refreshOnFocus = () => void refreshMenuAccess()
    const refreshInterval = window.setInterval(refreshOnFocus, 60_000)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [session?.token, session?.user?.role])

  const grantedMenus = Array.isArray(session?.grantedMenus) ? session.grantedMenus : []
  const isSuperuser = session?.user?.role === 'superadmin' || session?.user?.role === 'superuser'
  const canAccess = (key) => {
    if (accessRefreshError || menuAccessLoading) return false
    if (key === 'menu:settings') return isSuperuser
    return isSuperuser || grantedMenus.includes(key)
  }

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      grantedMenus,
      accessRefreshError,
      menuAccessLoading,
      isAuthenticated: Boolean(session?.token),
      canAccess,
      login: async (credentials) => {
        const data = await loginRequest(credentials)
        setMenuAccessLoading(true)
        setSession(data)
        return data
      },
      logout: () => {
        setMenuAccessLoading(false)
        setSession(null)
      },
    }),
    [session, grantedMenus, accessRefreshError, menuAccessLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
