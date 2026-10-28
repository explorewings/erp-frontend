import { useEffect, useMemo, useState } from 'react'
import { loginRequest } from './api.js'
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

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
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
