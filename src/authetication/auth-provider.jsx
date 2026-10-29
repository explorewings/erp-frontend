import { useEffect, useMemo, useState } from 'react'
import { loginRequest } from './api.js'
import { MENU_KEYS } from '../erplayout/nav.js'
import { AuthContext } from './auth-context.js'

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

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  }, [session])

  const deniedMenus = session?.deniedMenus ?? (
    Array.isArray(session?.accessibleMenus)
      ? MENU_KEYS.filter((key) => !session.accessibleMenus.includes(key))
      : null
  )
  const isSuperuser = session?.user?.role === 'superadmin' || session?.user?.role === 'superuser'
  const canAccess = (key) => {
    if (key === 'menu:settings') return isSuperuser
    return isSuperuser || deniedMenus === null || !deniedMenus.includes(key)
  }

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      deniedMenus,
      isAuthenticated: Boolean(session?.token),
      canAccess,
      login: async (credentials) => {
        const data = await loginRequest(credentials)
        setSession(data)
        return data
      },
      logout: () => setSession(null),
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
