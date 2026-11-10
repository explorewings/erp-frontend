import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const refreshMenuAccess = useCallback(async () => {
    const token = session?.token
    if (!token) return
    setMenuAccessLoading(true)
    try {
      const access = await fetchMyAccess(token)
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
      setAccessRefreshError(error?.message || 'Unable to refresh menu access.')
    } finally {
      setMenuAccessLoading(false)
    }
  }, [session?.token])

  useEffect(() => {
    const token = session?.token
    if (!token) {
      setAccessRefreshError('')
      setMenuAccessLoading(false)
      return undefined
    }

    let cancelled = false
    const load = async () => {
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
          setAccessRefreshError(error?.message || 'Unable to refresh menu access.')
        }
      } finally {
        if (!cancelled) setMenuAccessLoading(false)
      }
    }

    // Only block the UI on the first load; later refreshes keep the current
    // grants so users are not bounced to the no-access screen.
    if (!Array.isArray(session?.grantedMenus)) setMenuAccessLoading(true)
    void load()
    const refreshOnFocus = () => void load()
    const refreshInterval = window.setInterval(refreshOnFocus, 60_000)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [session?.token])

  const grantedMenus = Array.isArray(session?.grantedMenus) ? session.grantedMenus : []
  const isSuperuser = session?.user?.role === 'superadmin' || session?.user?.role === 'superuser'
  const canAccess = (key) => {
    // Superadmins always have every menu, even before access resolves.
    if (isSuperuser) return true
    // Only block on the very first load, when grants have never resolved.
    if (menuAccessLoading && !Array.isArray(session?.grantedMenus)) return false
    return grantedMenus.includes(key)
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
      refreshMenuAccess,
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
    [session, grantedMenus, accessRefreshError, menuAccessLoading, refreshMenuAccess],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
